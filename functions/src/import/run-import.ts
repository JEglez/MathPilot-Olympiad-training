// Import CLI runner — entry point for manual dataset imports
// Usage: npx tsx run-import.ts --source omni-math
//        npx tsx run-import.ts --source all
// Per 05-ingestion-implementation-plan.md Task 5.2

import { Pool } from "pg";
import { OmniMathAdapter } from "../infrastructure/adapters/omni-math";
import { OlympiadBenchAdapter } from "../infrastructure/adapters/olympiad-bench";
import { OlymMATHAdapter } from "../infrastructure/adapters/olympmath";
import { NuminaMathAdapter } from "../infrastructure/adapters/numina-math";
import { OpenAIClassifier } from "../infrastructure/ai/classifier";
import { OpenAIEmbedder } from "../infrastructure/ai/embedder";
import { PostgresProblemRepository } from "../infrastructure/database/problem-repository";
import { runImportPipeline } from "../application/ingestion/import-pipeline";
import type { TaxonomyReference } from "../domain/taxonomy/types";
import type { SourceAdapter } from "../domain/ingestion/types";

// ── Config from environment ───────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// ── Load taxonomy reference from DB ──────────────────────────────────────────

async function loadTaxonomyReference(pool: Pool): Promise<TaxonomyReference> {
  const [topics, subtopics, techniques] = await Promise.all([
    pool.query<{ code: string }>("SELECT code FROM topics"),
    pool.query<{ code: string; topic_code: string }>(
      "SELECT s.code, t.code AS topic_code FROM subtopics s JOIN topics t ON s.topic_id = t.id",
    ),
    pool.query<{ code: string }>("SELECT code FROM techniques"),
  ]);

  return {
    topicCodes: new Set(topics.rows.map(r => r.code)),
    subtopicCodes: new Set(subtopics.rows.map(r => r.code)),
    techniqueCodes: new Set(techniques.rows.map(r => r.code)),
    subtopicToTopic: new Map(subtopics.rows.map(r => [r.code, r.topic_code])),
  };
}

// ── Source priority order (per dedup strategy) ────────────────────────────────
// Omni-MATH > OlympiadBench > NuminaMath > OlymMATH

const SOURCE_ORDER: SourceAdapter["datasetName"][] = [
  "omni-math",
  "olympiad-bench",
  "numina-math",
  "olympmath",
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => a.startsWith("--source="))?.split("=")[1]
    ?? args[args.indexOf("--source") + 1];

  if (!sourceArg) {
    console.error("Usage: npx tsx run-import.ts --source <omni-math|olympiad-bench|olympmath|numina-math|all>");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: requireEnv("MATHPILOT_DB_URL") });

  const classifier = new OpenAIClassifier({
    modelId: requireEnv("MATHPILOT_CLASSIFICATION_MODEL"),
    endpoint: requireEnv("MATHPILOT_OPENAI_ENDPOINT"),
    apiKey: requireEnv("MATHPILOT_OPENAI_API_KEY"),
  });

  const embedder = new OpenAIEmbedder({
    modelId: requireEnv("MATHPILOT_EMBEDDING_MODEL"),
    endpoint: requireEnv("MATHPILOT_OPENAI_ENDPOINT"),
    apiKey: requireEnv("MATHPILOT_OPENAI_API_KEY"),
  });

  const repository = new PostgresProblemRepository(pool);
  const taxonomy = await loadTaxonomyReference(pool);

  const adapters: Record<string, SourceAdapter> = {
    "omni-math":      new OmniMathAdapter(),
    "olympiad-bench": new OlympiadBenchAdapter(),
    "olympmath":      new OlymMATHAdapter(),
    "numina-math":    new NuminaMathAdapter(),
  };

  const sources = sourceArg === "all"
    ? SOURCE_ORDER
    : [sourceArg as SourceAdapter["datasetName"]];

  let totalFailed = 0;
  let totalImported = 0;

  for (const source of sources) {
    const adapter = adapters[source];
    if (!adapter) {
      console.error(`Unknown source: ${source}`);
      process.exit(1);
    }

    console.log(`\n=== Importing ${source} ===`);

    // Fetch raw data (placeholder — actual download per dataset)
    const rawRecords = await fetchDataset(source);

    const stats = await runImportPipeline(adapter, rawRecords, {
      classifier,
      embedder,
      repository,
      taxonomy,
    });

    totalImported += stats.imported;
    totalFailed += stats.classificationFailures + stats.parseErrors;

    console.log(`\nResults for ${source}:`);
    console.log(`  Imported:  ${stats.imported}`);
    console.log(`  Skipped:   ${stats.duplicatesSkipped} (duplicates)`);
    console.log(`  Failed:    ${stats.classificationFailures} (classification)`);
    console.log(`  Errors:    ${stats.parseErrors} (parse)`);
    console.log(`  Flagged:   ${stats.flaggedForReview} (review)`);
  }

  await pool.end();

  console.log(`\n=== Import complete: ${totalImported} problems imported ===`);

  // Exit 1 if >10% failure rate
  const totalAttempted = totalImported + totalFailed;
  if (totalAttempted > 0 && totalFailed / totalAttempted > 0.1) {
    console.error(`ERROR: Failure rate ${(totalFailed / totalAttempted * 100).toFixed(1)}% exceeds 10% threshold`);
    process.exit(1);
  }
}

/** Fetch raw dataset records from HuggingFace datasets API or local cache */
async function fetchDataset(source: string): Promise<unknown[]> {
  // Each dataset is available as a Parquet file on HuggingFace
  // We download to a local cache dir and parse to avoid re-fetching
  const cacheDir = process.env["MATHPILOT_DATASET_CACHE"] ?? ".dataset-cache";
  const cacheFile = `${cacheDir}/${source}.json`;

  // Check local cache first
  try {
    const { readFileSync, existsSync } = await import("fs");
    if (existsSync(cacheFile)) {
      console.log(`  [fetch] ${source} — loading from cache ${cacheFile}`);
      return JSON.parse(readFileSync(cacheFile, "utf-8")) as unknown[];
    }
  } catch {
    // Cache miss — fall through to download
  }

  // Dataset sources per 03-dataset-import-search.md §3
  const DATASET_URLS: Record<string, string> = {
    "omni-math":
      "https://datasets-server.huggingface.co/rows?dataset=KbsdJames%2FOmni-MATH&config=default&split=test&offset=0&length=100",
    "olympiad-bench":
      "https://datasets-server.huggingface.co/rows?dataset=lmms-lab%2FOlympiadBench&config=default&split=test&offset=0&length=100",
    "olympmath":
      "https://datasets-server.huggingface.co/rows?dataset=Hothan%2FOlymMATH&config=default&split=test&offset=0&length=100",
    "numina-math":
      "https://datasets-server.huggingface.co/rows?dataset=AI-MO%2FNuminaMath-CoT&config=default&split=train&offset=0&length=100",
  };

  const url = DATASET_URLS[source];
  if (!url) throw new Error(`No dataset URL configured for source: ${source}`);

  console.log(`  [fetch] ${source} — downloading from HuggingFace`);

  // HuggingFace datasets-server returns { rows: [{ row: {...} }] }
  // For full datasets, paginate with offset/length until rows is empty
  const allRows: unknown[] = [];
  const PAGE_SIZE = 1_000;
  let offset = 0;

  while (true) {
    const pageUrl = buildPageUrl(url, offset, PAGE_SIZE);
    const res = await fetch(pageUrl);
    if (!res.ok) {
      throw new Error(`HuggingFace fetch failed: ${res.status} ${res.statusText} — ${pageUrl}`);
    }

    const data = await res.json() as { rows?: Array<{ row: unknown }> };
    const rows = data.rows ?? [];
    allRows.push(...rows.map(r => r.row));

    if (rows.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;

    console.log(`  [fetch] ${source} — downloaded ${allRows.length} records`);
  }

  // Cache to disk for subsequent runs
  const { mkdirSync, writeFileSync } = await import("fs");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(allRows), "utf-8");
  console.log(`  [fetch] ${source} — cached ${allRows.length} records to ${cacheFile}`);

  return allRows;
}

function buildPageUrl(baseUrl: string, offset: number, length: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("length", String(length));
  return url.toString();
}

main().catch(e => {
  console.error("Import failed:", e);
  process.exit(1);
});
