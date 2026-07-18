#!/usr/bin/env tsx
// scripts/ingestion/run.ts
// SOURCE-SPECIFIC:  Zod schemas, field parsers, HF_URLS, SOURCE_ORDER
// ORCHESTRATION:    main() loop — delegates to shared infrastructure
//
// All shared logic lives in functions/src/:
//   shared/         latex normalisation, dedup hash, competition resolver
//   domain/         CanonicalProblem, SolutionDraft types
//   infrastructure/ HuggingFace fetch, AI classifier, embedder, DB repository
//
// Rules (architecture-principles.md §11):
//   Throw on unrecoverable errors. Zod validates all external input.
//   Idempotent: existsByDedupHash check before every insert.

import { z } from "zod";
import { normaliseLaTeX, stripLaTeX } from "../../functions/src/shared/latex";
import { resolveCompetition } from "../../functions/src/shared/competition";
import { computeDedupHash } from "../../functions/src/shared/dedup";
import type { CanonicalProblem, CanonicalSolution, CompetitionLevel } from "../../functions/src/domain/ingestion/types";
import { OpenAIClassifier, applyClassification } from "../../functions/src/infrastructure/ai/classifier";
import { OpenAIEmbedder } from "../../functions/src/infrastructure/ai/embedder";
import { PostgresProblemRepository } from "../../functions/src/infrastructure/database/problem-repository";
import { fetchHuggingFaceDataset } from "../../functions/src/infrastructure/datasets/huggingface";

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.env["DRY_RUN"] === "true";
const SOURCE  = process.env["IMPORT_SOURCE"] ?? "all";
const CACHE   = process.env["MATHPILOT_DATASET_CACHE"] ?? ".cache";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// ── Source registry ───────────────────────────────────────────────────────────

const SOURCE_ORDER = ["omni-math", "olympiad-bench", "numina-math", "olympmath"] as const;

const HF_URLS: Record<string, string> = {
  "omni-math":      "https://datasets-server.huggingface.co/rows?dataset=KbsdJames%2FOmni-MATH&config=default&split=test",
  "olympiad-bench": "https://datasets-server.huggingface.co/rows?dataset=lmms-lab%2FOlympiadBench&config=default&split=test",
  "olympmath":      "https://datasets-server.huggingface.co/rows?dataset=Hothan%2FOlymMATH&config=default&split=test",
  "numina-math":    "https://datasets-server.huggingface.co/rows?dataset=AI-MO%2FNuminaMath-CoT&config=default&split=train",
};

// ── Source-specific Zod schemas (validate at dataset boundary) ────────────────

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

// ── Parser helpers ────────────────────────────────────────────────────────────

// Maps OlymMATH numeric level → competition level
const OLYM_LEVEL_MAP: Record<string, CompetitionLevel> = {
  "1": "state",
  "2": "national",
  "3": "international",
};

function makeTitle(s: string): string {
  return s.slice(0, 80).replace(/\n/g, " ");
}

function solution(raw: string | null | undefined): CanonicalSolution[] {
  return raw ? [{ approachName: "Solution 1", body: raw, isCanonical: true }] : [];
}

// ── Source-specific parsers → CanonicalProblem ────────────────────────────────

function parseOmniMath(raw: unknown): CanonicalProblem {
  const r  = OmniMathSchema.parse(raw);
  const st = normaliseLaTeX(r.problem);
  const h  = computeDedupHash(r.problem);
  const c  = resolveCompetition(r.source);
  return {
    externalId: `omni-math::${h}`, sourceDataset: "omni-math", dedupHash: h,
    title: makeTitle(st), statement: st, statementPlain: stripLaTeX(r.problem),
    answer: r.answer ?? null, solutions: solution(r.solution), language: "en",
    sourceCompetition: c?.abbreviation ?? null,
    sourceDomainPath: r.domain ? r.domain.join(" -> ") : null,
    sourceSubject: r.domain ? r.domain.join(" -> ") : null,  // full path as classifier hint (§4.4)
    sourceDifficulty: r.difficulty ?? null,
    sourceYear: null, sourceRound: null,
    topics: [], subtopics: [], techniques: [],
    competitionLevel: c?.level ?? null, positionInPaper: null, techniqueDepth: null,
    creativityDemand: null, proofStyle: null, entryBarrier: null,
    estimatedSolveTimeMinutes: null,
  };
}

function parseOlympiadBench(raw: unknown): CanonicalProblem | null {
  const r    = OlympiadBenchSchema.parse(raw);
  const subj = (r.subject ?? "").toLowerCase();
  if (subj && !subj.includes("math") && (subj.includes("phys") || subj.includes("chem"))) return null;
  const st = normaliseLaTeX(r.problem);
  const h  = computeDedupHash(r.problem);
  const c  = resolveCompetition(r.source);
  const ans = Array.isArray(r.answer) ? r.answer.join("; ") : (r.answer ?? null);
  return {
    externalId: `olympiad-bench::${h}`, sourceDataset: "olympiad-bench", dedupHash: h,
    title: makeTitle(st), statement: st, statementPlain: stripLaTeX(r.problem),
    answer: ans, solutions: solution(r.solution), language: "en",
    sourceCompetition: c?.abbreviation ?? null,
    sourceDomainPath: null,
    sourceSubject: r.subject ?? null, sourceDifficulty: null,  // difficulty is text rating, not numeric
    sourceYear: null, sourceRound: null,
    topics: [], subtopics: [], techniques: [],
    competitionLevel: c?.level ?? null, positionInPaper: null, techniqueDepth: null,
    creativityDemand: null, proofStyle: null, entryBarrier: null,
    estimatedSolveTimeMinutes: null,
  };
}

function parseOlymMATH(raw: unknown): CanonicalProblem {
  const r  = OlymMATHSchema.parse(raw);
  const st = normaliseLaTeX(r.problem);
  const h  = computeDedupHash(r.problem);
  const level: CompetitionLevel | null = r.level != null ? (OLYM_LEVEL_MAP[r.level] ?? null) : null;
  return {
    externalId: `olympmath::${h}`, sourceDataset: "olympmath", dedupHash: h,
    title: makeTitle(st), statement: st, statementPlain: stripLaTeX(r.problem),
    answer: r.answer ?? null, solutions: solution(r.solution), language: "zh",
    sourceCompetition: null, sourceDomainPath: null,
    sourceSubject: null, sourceDifficulty: null,
    sourceYear: null, sourceRound: null,
    topics: [], subtopics: [], techniques: [],
    competitionLevel: level, positionInPaper: null, techniqueDepth: null,
    creativityDemand: null, proofStyle: null, entryBarrier: null,
    estimatedSolveTimeMinutes: null,
  };
}

function parseNuminaMath(raw: unknown): CanonicalProblem | null {
  const r = NuminaMathSchema.parse(raw);
  if (r.source && !r.source.toLowerCase().includes("olympiad")) return null;
  const st = normaliseLaTeX(r.problem);
  const h  = computeDedupHash(r.problem);
  const c  = resolveCompetition(r.source);
  return {
    externalId: `numina-math::${h}`, sourceDataset: "numina-math", dedupHash: h,
    title: makeTitle(st), statement: st, statementPlain: stripLaTeX(r.problem),
    answer: r.answer ?? null,
    solutions: solution(r.solution ? r.solution.slice(0, 10_000) : null),
    language: "en",
    sourceCompetition: c?.abbreviation ?? null, sourceDomainPath: null,
    sourceSubject: null, sourceDifficulty: null,
    sourceYear: null, sourceRound: null,
    topics: [], subtopics: [], techniques: [],
    competitionLevel: c?.level ?? null, positionInPaper: null, techniqueDepth: null,
    creativityDemand: null, proofStyle: null, entryBarrier: null,
    estimatedSolveTimeMinutes: null,
  };
}

const PARSERS: Record<string, (raw: unknown) => CanonicalProblem | null> = {
  "omni-math":      parseOmniMath,
  "olympiad-bench": parseOlympiadBench,
  "olympmath":      parseOlymMATH,
  "numina-math":    parseNuminaMath,
};

// ── Main orchestration ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const sources = SOURCE === "all" ? [...SOURCE_ORDER] : [SOURCE];

  const endpoint = requireEnv("MATHPILOT_OPENAI_ENDPOINT");
  const apiKey   = requireEnv("MATHPILOT_OPENAI_API_KEY");

  const pool       = PostgresProblemRepository.create(requireEnv("MATHPILOT_DB_URL"));
  const classifier = new OpenAIClassifier({ modelId: requireEnv("MATHPILOT_CLASSIFICATION_MODEL"), endpoint, apiKey });
  const embedder   = new OpenAIEmbedder({ modelId: requireEnv("MATHPILOT_EMBEDDING_MODEL"), endpoint, apiKey });
  const repository = pool;

  let totalImported = 0, totalFailed = 0, totalSkipped = 0;

  for (const source of sources) {
    log("source:start", { source, dry_run: DRY_RUN });
    const parser  = PARSERS[source];
    const baseUrl = HF_URLS[source];
    if (!parser || !baseUrl) throw new Error(`Unknown source: ${source}`);

    const raw = await fetchHuggingFaceDataset(source, baseUrl, CACHE,
      e => log("fetch:page", { source, ...e }),
    );
    log("fetch:done", { source, total: raw.length });

    const stats = { parsed: 0, skipped: 0, imported: 0, failed: 0 };
    const problems: CanonicalProblem[] = [];

    for (const row of raw) {
      let p: CanonicalProblem | null;
      try { p = parser(row); } catch { stats.failed++; continue; }
      if (!p) { stats.skipped++; continue; }
      stats.parsed++;
      problems.push(p);
    }
    log("source:parsed", { source, ...stats });

    const runId = DRY_RUN ? "dry-run" : await repository.createImportRun(source);

    // Filter duplicates up-front
    const toProcess: CanonicalProblem[] = [];
    for (const p of problems) {
      if (DRY_RUN || !await repository.existsByDedupHash(p.dedupHash)) {
        toProcess.push(p);
      } else {
        stats.skipped++;
      }
    }
    log("source:deduped", { source, toProcess: toProcess.length, skipped: stats.skipped });

    if (DRY_RUN) {
      log("dry-run:would-import", { source, count: toProcess.length });
      stats.imported += toProcess.length;
    } else if (toProcess.length > 0) {
      // Embed all at once — embedder handles its own internal batching (2048/req)
      log("source:embedding", { source, count: toProcess.length });
      let embeddings: number[][];
      try {
        embeddings = await embedder.embedBatch(toProcess.map(p => p.statementPlain));
      } catch (e) {
        log("embed:error", { source, error: String(e) });
        stats.failed += toProcess.length;
        await repository.completeImportRun(runId, "failed");
        continue;
      }

      // Classify all via Batch API (single job, polls until done — 03-dataset-import-search.md §5.3)
      // Using Batch API reduces classification cost by ~50% vs per-request calls.
      log("source:classifying", { source, count: toProcess.length });
      const classResults = await classifier.classifyBatch(toProcess);

      // Store each problem with its embedding and classification
      for (let i = 0; i < toProcess.length; i++) {
        const base = toProcess[i]!;
        const embedding = embeddings[i];
        if (!embedding) { stats.failed++; continue; }

        const classResult = classResults.get(base.externalId);
        if (classResult && !classResult.ok) {
          log("classify:warn", { id: base.externalId, error: classResult.error.kind });
        }
        const problem = classResult?.ok ? applyClassification(base, classResult.value) : base;

        const result = await repository.insertProblem(problem, embedding, runId);
        if (!result.ok) {
          log("insert:error", { id: problem.externalId, error: result.error.kind });
          stats.failed++;
        } else {
          stats.imported++;
        }

        if ((i + 1) % 100 === 0) {
          log("source:progress", { source, processed: i + 1, total: toProcess.length });
        }
      }
    }

    if (!DRY_RUN) await repository.completeImportRun(runId, stats.failed > 0 ? "failed" : "completed");

    log("source:done", { source, ...stats });
    totalImported += stats.imported;
    totalFailed   += stats.failed;
    totalSkipped  += stats.skipped;
  }

  await repository.end();
  log("import:complete", { totalImported, totalFailed, totalSkipped });

  const attempted = totalImported + totalFailed;
  if (attempted > 0 && totalFailed / attempted > 0.1) {
    process.stderr.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      error: `Failure rate ${(totalFailed / attempted * 100).toFixed(1)}% exceeds 10% threshold`,
    }) + "\n");
    process.exit(1);
  }
}

type LogMeta = Record<string, unknown>;
function log(msg: string, meta: LogMeta = {}): void {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), msg, ...meta }) + "\n");
}

main().catch((e: unknown) => {
  process.stderr.write(JSON.stringify({ timestamp: new Date().toISOString(), error: String(e) }) + "\n");
  process.exit(1);
});
