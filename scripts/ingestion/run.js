#!/usr/bin/env node
// scripts/ingestion/run.js
// Purpose: Import ~12k olympiad problems from 4 HuggingFace datasets
//          into PostgreSQL with pgvector embeddings and AI classification
// Run:     node run.js
//          IMPORT_SOURCE=omni-math node run.js
//          DRY_RUN=true node run.js
//
// Rules (architecture-principles.md §11):
//   - No DDD layers. Throw on unrecoverable errors. process.exit(1) on failure.
//   - Zod for all external data (HuggingFace rows, AI responses).
//   - Idempotent: ON CONFLICT DO NOTHING + dedup hash check.
//   - Secrets from environment variables only.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import pkg from "pg";
import { z } from "zod";

const { Pool } = pkg;

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === "true";
const SOURCE  = process.env.IMPORT_SOURCE ?? "all";
const CACHE   = process.env.MATHPILOT_DATASET_CACHE ?? ".cache";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// ── Source order (dedup priority: first wins) ─────────────────────────────────
const SOURCE_ORDER = ["omni-math", "olympiad-bench", "numina-math", "olympmath"];

// ── HuggingFace dataset URLs (paginated via datasets-server API) ──────────────
const HF_URLS = {
  "omni-math":      "https://datasets-server.huggingface.co/rows?dataset=KbsdJames%2FOmni-MATH&config=default&split=test",
  "olympiad-bench": "https://datasets-server.huggingface.co/rows?dataset=lmms-lab%2FOlympiadBench&config=default&split=test",
  "olympmath":      "https://datasets-server.huggingface.co/rows?dataset=Hothan%2FOlymMATH&config=default&split=test",
  "numina-math":    "https://datasets-server.huggingface.co/rows?dataset=AI-MO%2FNuminaMath-CoT&config=default&split=train",
};

// ── Zod schemas for each source (validate at HF boundary) ────────────────────

const OmniMathSchema = z.object({
  problem:    z.string().min(1),
  solution:   z.string().nullable().optional(),
  answer:     z.string().nullable().optional(),
  domain:     z.array(z.string()).optional(),
  difficulty: z.number().optional(),
  source:     z.string().optional(),
});

const OlympiadBenchSchema = z.object({
  problem:    z.string().min(1),
  solution:   z.string().nullable().optional(),
  answer:     z.union([z.string(), z.array(z.string())]).nullable().optional(),
  subject:    z.string().optional(),
  difficulty: z.string().optional(),
  source:     z.string().optional(),
});

const OlymMATHSchema = z.object({
  problem:    z.string().min(1),
  solution:   z.string().nullable().optional(),
  answer:     z.string().nullable().optional(),
  level:      z.string().optional(),
  source:     z.string().optional(),
});

const NuminaMathSchema = z.object({
  problem:    z.string().min(1),
  solution:   z.string().nullable().optional(),
  answer:     z.string().nullable().optional(),
  source:     z.string().optional(),
});

// ── Competition name → abbreviation map ───────────────────────────────────────
const COMPETITION_MAP = {
  "international mathematical olympiad": "IMO",
  "imo":      "IMO",
  "usamo":    "USAMO",
  "aime":     "AIME",
  "amc":      "AMC",
  "putnam":   "PUTNAM",
  "apmo":     "APMO",
  "olympiad": "SHORTLIST",
};

function resolveCompetition(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const [key, abbr] of Object.entries(COMPETITION_MAP)) {
    if (lower.includes(key)) return abbr;
  }
  return null;
}

// ── LaTeX normalisation (keep display math, normalise whitespace) ─────────────
function normaliseLaTeX(s) {
  if (!s) return "";
  return s
    .replace(/\$\$(.+?)\$\$/gs, (_, m) => `$$${m.trim()}$$`)
    .replace(/\\\[(.+?)\\\]/gs, (_, m) => `\\[${m.trim()}\\]`)
    .replace(/[ \t]+/g, " ")
    .trim();
}

function stripLaTeX(s) {
  if (!s) return "";
  return s
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]*?\$/g, " ")
    .replace(/\\\[[\s\S]*?\\\]/g, " ")
    .replace(/\\\([\s\S]*?\\\)/g, " ")
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Dedup hash (SHA-256 of normalised plain text) ─────────────────────────────
function dedupHash(statement) {
  const plain = stripLaTeX(statement)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^problem\s*\d+[:\.]?\s*/i, "");
  return createHash("sha256").update(plain).digest("hex");
}

// ── Source parsers → canonical row ────────────────────────────────────────────

function parseOmniMath(raw) {
  const r = OmniMathSchema.parse(raw);
  const statement = normaliseLaTeX(r.problem);
  const domainHint = r.domain?.join(" ").toLowerCase() ?? "";
  return {
    externalId:       `omni-math::${dedupHash(r.problem)}`,
    sourceDataset:    "omni-math",
    title:            statement.slice(0, 80).replace(/\n/g, " "),
    statement,
    statementPlain:   stripLaTeX(r.problem),
    answer:           r.answer ?? null,
    solutions:        r.solution ? [r.solution] : [],
    sourceCompetition:resolveCompetition(r.source),
    sourceSubject:    domainHint || null,
    sourceDifficulty: r.difficulty ? String(r.difficulty) : null,
    language:         "en",
    dedupHash:        dedupHash(r.problem),
  };
}

function parseOlympiadBench(raw) {
  const r = OlympiadBenchSchema.parse(raw);
  // Filter physics problems
  const subj = (r.subject ?? "").toLowerCase();
  if (subj && !subj.includes("math") && (subj.includes("phys") || subj.includes("chem"))) return null;
  const statement = normaliseLaTeX(r.problem);
  const answer = Array.isArray(r.answer) ? r.answer.join("; ") : (r.answer ?? null);
  return {
    externalId:       `olympiad-bench::${dedupHash(r.problem)}`,
    sourceDataset:    "olympiad-bench",
    title:            statement.slice(0, 80).replace(/\n/g, " "),
    statement,
    statementPlain:   stripLaTeX(r.problem),
    answer,
    solutions:        r.solution ? [r.solution] : [],
    sourceCompetition:resolveCompetition(r.source),
    sourceSubject:    r.subject ?? null,
    sourceDifficulty: r.difficulty ?? null,
    language:         "en",
    dedupHash:        dedupHash(r.problem),
  };
}

function parseOlymMATH(raw) {
  const r = OlymMATHSchema.parse(raw);
  const LEVEL_MAP = { "1": "state", "2": "national", "3": "international" };
  const statement = normaliseLaTeX(r.problem);
  return {
    externalId:       `olympmath::${dedupHash(r.problem)}`,
    sourceDataset:    "olympmath",
    title:            statement.slice(0, 80).replace(/\n/g, " "),
    statement,
    statementPlain:   stripLaTeX(r.problem),
    answer:           r.answer ?? null,
    solutions:        r.solution ? [r.solution] : [],
    sourceCompetition:null,
    sourceSubject:    null,
    sourceDifficulty: r.level ?? null,
    language:         "zh",
    dedupHash:        dedupHash(r.problem),
  };
}

function parseNuminaMath(raw) {
  const r = NuminaMathSchema.parse(raw);
  // Only olympiad problems
  if (r.source && !r.source.toLowerCase().includes("olympiad")) return null;
  const statement = normaliseLaTeX(r.problem);
  // Trim long solutions
  const sol = r.solution ? r.solution.slice(0, 10_000) : null;
  return {
    externalId:       `numina-math::${dedupHash(r.problem)}`,
    sourceDataset:    "numina-math",
    title:            statement.slice(0, 80).replace(/\n/g, " "),
    statement,
    statementPlain:   stripLaTeX(r.problem),
    answer:           r.answer ?? null,
    solutions:        sol ? [sol] : [],
    sourceCompetition:resolveCompetition(r.source),
    sourceSubject:    null,
    sourceDifficulty: null,
    language:         "en",
    dedupHash:        dedupHash(r.problem),
  };
}

const PARSERS = {
  "omni-math":      parseOmniMath,
  "olympiad-bench": parseOlympiadBench,
  "olympmath":      parseOlymMATH,
  "numina-math":    parseNuminaMath,
};

// ── HuggingFace fetch with local cache ────────────────────────────────────────

async function fetchDataset(source) {
  const cacheFile = `${CACHE}/${source}.json`;
  mkdirSync(CACHE, { recursive: true });

  if (existsSync(cacheFile)) {
    log(`fetch:cache-hit`, { source, file: cacheFile });
    return JSON.parse(readFileSync(cacheFile, "utf-8"));
  }

  const baseUrl = HF_URLS[source];
  if (!baseUrl) throw new Error(`No URL configured for source: ${source}`);

  log(`fetch:start`, { source });
  const all = [];
  const PAGE = 1_000;
  let offset = 0;

  while (true) {
    const url = `${baseUrl}&offset=${offset}&length=${PAGE}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${url}`);
    const data = await res.json();
    const rows = (data.rows ?? []).map(r => r.row);
    all.push(...rows);
    log(`fetch:page`, { source, offset, got: rows.length, total: all.length });
    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  writeFileSync(cacheFile, JSON.stringify(all), "utf-8");
  log(`fetch:done`, { source, total: all.length });
  return all;
}

// ── AI classification (single — Batch API overkill for a script) ──────────────

const ClassifySchema = z.object({
  topics:              z.array(z.string()).min(1),
  subtopics:           z.array(z.string()).min(1),
  techniques:          z.array(z.object({ code: z.string(), is_primary: z.boolean() })).min(1),
  competition_level:   z.enum(["local", "state", "national", "international"]),
  technique_depth:     z.enum(["single", "compound", "synthesis"]),
  creativity_demand:   z.enum(["routine", "insightful", "inventive", "breakthrough"]),
  proof_style:         z.enum(["computation", "existence", "construction", "bound", "characterisation", "impossibility"]),
  entry_barrier:       z.enum(["transparent", "camouflaged", "deceptive"]),
  position_in_paper:   z.enum(["early", "middle", "late"]).nullable().optional(),
  estimated_solve_time_minutes: z.number().nullable().optional(),
});

async function classifyProblem(problem, endpoint, apiKey, modelId) {
  const res = await fetch(
    `${endpoint}/openai/deployments/${modelId}/chat/completions?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({
            statement: problem.statementPlain.slice(0, 1_500),
            source_subject: problem.sourceSubject,
            source_difficulty: problem.sourceDifficulty,
            source_competition: problem.sourceCompetition,
          })},
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 400,
      }),
    },
  );
  if (!res.ok) throw new Error(`Classification API ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  return ClassifySchema.parse(JSON.parse(raw));
}

// ── Embeddings ────────────────────────────────────────────────────────────────

async function embedBatch(texts, endpoint, apiKey, modelId) {
  const res = await fetch(
    `${endpoint}/openai/deployments/${modelId}/embeddings?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ input: texts }),
    },
  );
  if (!res.ok) throw new Error(`Embeddings API ${res.status}`);
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

// ── DB insert ─────────────────────────────────────────────────────────────────

async function insertProblem(client, problem, classification, embedding, importRunId) {
  // Upsert competition
  let competitionId = null;
  if (problem.sourceCompetition) {
    const r = await client.query(
      `INSERT INTO competitions (abbreviation, name, level, is_active)
       VALUES ($1,$1,$2,false)
       ON CONFLICT (abbreviation) DO UPDATE SET abbreviation = EXCLUDED.abbreviation
       RETURNING id`,
      [problem.sourceCompetition, classification?.competition_level ?? "national"],
    );
    competitionId = r.rows[0]?.id ?? null;
  }

  const pr = await client.query(
    `INSERT INTO problems (
       title, statement, statement_plain, answer,
       source_competition_id, language,
       competition_level, technique_depth, creativity_demand,
       proof_style, entry_barrier, position_in_paper,
       estimated_solve_time_minutes,
       status, needs_review, statement_vector
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft',$14,$15::vector)
     RETURNING id`,
    [
      problem.title, problem.statement, problem.statementPlain, problem.answer,
      competitionId, problem.language,
      classification?.competition_level ?? null,
      classification?.technique_depth ?? null,
      classification?.creativity_demand ?? null,
      classification?.proof_style ?? null,
      classification?.entry_barrier ?? null,
      classification?.position_in_paper ?? null,
      classification?.estimated_solve_time_minutes ?? null,
      !classification,
      `[${embedding.join(",")}]`,
    ],
  );
  const problemId = pr.rows[0].id;

  // Join tables
  if (classification?.topics?.length) {
    await client.query(
      `INSERT INTO problem_topics (problem_id, topic_id)
       SELECT $1, id FROM topics WHERE code = ANY($2)
       ON CONFLICT DO NOTHING`,
      [problemId, classification.topics],
    );
  }
  if (classification?.subtopics?.length) {
    await client.query(
      `INSERT INTO problem_subtopics (problem_id, subtopic_id)
       SELECT $1, id FROM subtopics WHERE code = ANY($2)
       ON CONFLICT DO NOTHING`,
      [problemId, classification.subtopics],
    );
  }
  for (const t of classification?.techniques ?? []) {
    await client.query(
      `INSERT INTO problem_techniques (problem_id, technique_id, is_primary)
       SELECT $1, id, $2 FROM techniques WHERE code = $3
       ON CONFLICT DO NOTHING`,
      [problemId, t.is_primary, t.code],
    );
  }

  // Solutions
  for (const sol of problem.solutions) {
    await client.query(
      `INSERT INTO solutions (problem_id, approach_name, body, is_canonical)
       VALUES ($1, 'Source solution', $2, true)`,
      [problemId, sol],
    );
  }

  // Import record (dedup)
  await client.query(
    `INSERT INTO import_records
       (problem_id, source_dataset, external_id, dedup_hash, source_subject, source_difficulty)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [problemId, problem.sourceDataset, problem.externalId,
     problem.dedupHash, problem.sourceSubject, problem.sourceDifficulty],
  );

  return problemId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sources = SOURCE === "all" ? SOURCE_ORDER : [SOURCE];

  const dbUrl      = requireEnv("MATHPILOT_DB_URL");
  const endpoint   = requireEnv("MATHPILOT_OPENAI_ENDPOINT");
  const apiKey     = requireEnv("MATHPILOT_OPENAI_API_KEY");
  const classModel = requireEnv("MATHPILOT_CLASSIFICATION_MODEL");
  const embModel   = requireEnv("MATHPILOT_EMBEDDING_MODEL");

  const pool = new Pool({ connectionString: dbUrl });

  let totalImported = 0, totalFailed = 0, totalSkipped = 0;

  for (const source of sources) {
    log(`source:start`, { source, dry_run: DRY_RUN });
    const parser = PARSERS[source];
    if (!parser) throw new Error(`Unknown source: ${source}`);

    const raw = await fetchDataset(source);
    const stats = { parsed: 0, skipped: 0, imported: 0, failed: 0 };

    // Embed in batches of 100
    const EMBED_BATCH = 100;
    const problems = [];

    for (const row of raw) {
      let problem;
      try { problem = parser(row); } catch { stats.failed++; continue; }
      if (!problem) { stats.skipped++; continue; } // filtered (physics, non-olympiad)
      stats.parsed++;
      problems.push(problem);
    }

    log(`source:parsed`, { source, ...stats });

    for (let i = 0; i < problems.length; i += EMBED_BATCH) {
      const batch = problems.slice(i, i + EMBED_BATCH);

      // Dedup check
      const toProcess = [];
      for (const p of batch) {
        const exists = await pool.query(
          "SELECT 1 FROM import_records WHERE dedup_hash = $1", [p.dedupHash]
        );
        if (exists.rows.length > 0) { stats.skipped++; continue; }
        toProcess.push(p);
      }
      if (!toProcess.length) continue;

      if (DRY_RUN) {
        log(`dry-run:would-import`, { source, batch: i, count: toProcess.length });
        stats.imported += toProcess.length;
        continue;
      }

      // Embeddings
      let embeddings;
      try {
        embeddings = await embedBatch(toProcess.map(p => p.statementPlain), endpoint, apiKey, embModel);
      } catch (e) {
        log(`embed:error`, { source, batch: i, error: String(e) });
        stats.failed += toProcess.length;
        continue;
      }

      // Classify + store each problem
      for (let j = 0; j < toProcess.length; j++) {
        const problem = toProcess[j];
        const embedding = embeddings[j];
        let classification = null;

        try {
          classification = await classifyProblem(problem, endpoint, apiKey, classModel);
        } catch (e) {
          log(`classify:warn`, { id: problem.externalId, error: String(e) });
          // Proceed without classification — stored as draft + needs_review
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await insertProblem(client, problem, classification, embedding, null);
          await client.query("COMMIT");
          stats.imported++;
        } catch (e) {
          await client.query("ROLLBACK");
          log(`insert:error`, { id: problem.externalId, error: String(e) });
          stats.failed++;
        } finally {
          client.release();
        }
      }

      log(`source:progress`, { source, processed: Math.min(i + EMBED_BATCH, problems.length), total: problems.length });
    }

    log(`source:done`, { source, ...stats });
    totalImported += stats.imported;
    totalFailed   += stats.failed;
    totalSkipped  += stats.skipped;
  }

  await pool.end();

  log(`import:complete`, { totalImported, totalFailed, totalSkipped });

  const attempted = totalImported + totalFailed;
  if (attempted > 0 && totalFailed / attempted > 0.1) {
    process.stderr.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      error: `Failure rate ${(totalFailed / attempted * 100).toFixed(1)}% exceeds 10% threshold`,
    }) + "\n");
    process.exit(1);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), msg, ...meta }) + "\n");
}

// ── Classification system prompt (condensed) ──────────────────────────────────
const CLASSIFY_SYSTEM_PROMPT = `You are a math olympiad classification expert.
Given a problem statement, return a JSON object with:
- topics: array of domain codes from [ALG, NT, GEO-S, GEO-A, COMB-E, COMB-S, GAME, MISC]
- subtopics: array of subtopic codes (e.g. NT-MOD, ALG-INQ, GEO-S-CIR)
- techniques: array of {code, is_primary} (e.g. T-FLT, T-AMGM, T-PHP)
- competition_level: one of local|state|national|international
- technique_depth: one of single|compound|synthesis
- creativity_demand: one of routine|insightful|inventive|breakthrough
- proof_style: one of computation|existence|construction|bound|characterisation|impossibility
- entry_barrier: one of transparent|camouflaged|deceptive
- position_in_paper: early|middle|late or null
- estimated_solve_time_minutes: integer or null
Return only valid JSON. Use at least 1 topic, 1 subtopic, 1 technique.`;

main().catch((e) => {
  process.stderr.write(JSON.stringify({ timestamp: new Date().toISOString(), error: String(e) }) + "\n");
  process.exit(1);
});
