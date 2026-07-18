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

/** Fetch raw dataset records — implement per source */
async function fetchDataset(source: string): Promise<unknown[]> {
  // TODO(#dataset-fetch): Implement actual HuggingFace/GitHub download per source
  // Each source should:
  //   - Download to a local cache (or read if already cached)
  //   - Return parsed records as an array
  // For now, return empty array so CLI can be invoked without network
  console.log(`  [fetch] ${source} — implement dataset download here`);
  return [];
}

main().catch(e => {
  console.error("Import failed:", e);
  process.exit(1);
});
