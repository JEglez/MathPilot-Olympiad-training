// Import pipeline orchestrator — application layer use case
// Orchestrates: fetch → normalise → dedup → classify → embed → store → track
// No business logic here — delegates to domain and infrastructure
// Per 03-dataset-import-search.md §5 and 05-ingestion-implementation-plan.md Task 5.1

import type { CanonicalProblem, SourceAdapter, ImportOutcome } from "../../domain/ingestion/types";
import { validateClassification } from "../../domain/ingestion/validate-problem";
import type { TaxonomyReference } from "../../domain/taxonomy/types";
import { isOk } from "../../domain/shared/result";
import { OpenAIClassifier, applyClassification } from "../../infrastructure/ai/classifier";
import { OpenAIEmbedder } from "../../infrastructure/ai/embedder";
import { PostgresProblemRepository } from "../../infrastructure/database/problem-repository";

export interface PipelineStats {
  totalRecords: number;
  imported: number;
  duplicatesSkipped: number;
  classificationFailures: number;
  parseErrors: number;
  flaggedForReview: number;
}

export interface ImportPipelineDeps {
  classifier: OpenAIClassifier;
  embedder: OpenAIEmbedder;
  repository: PostgresProblemRepository;
  taxonomy: TaxonomyReference;
  /** Optional logger — defaults to structured console output */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Run the full ingestion pipeline for one source dataset.
 *
 * Error strategy: per-problem errors never block the batch.
 * Each problem's outcome is logged and counted in stats.
 */
export async function runImportPipeline(
  adapter: SourceAdapter,
  rawRecords: unknown[],
  deps: ImportPipelineDeps,
): Promise<PipelineStats> {
  const { classifier, embedder, repository, taxonomy, log = defaultLog } = deps;
  const stats: PipelineStats = {
    totalRecords: 0,
    imported: 0,
    duplicatesSkipped: 0,
    classificationFailures: 0,
    parseErrors: 0,
    flaggedForReview: 0,
  };

  // Create import run tracking record
  const runId = await repository.createImportRun(adapter.datasetName);

  // Step 1: Parse (normalise + dedup hash)
  let problems: CanonicalProblem[];
  try {
    problems = adapter.parse(rawRecords);
  } catch (e) {
    stats.parseErrors = rawRecords.length;
    await repository.completeImportRun(runId, "failed");
    throw e;
  }

  stats.totalRecords = problems.length;
  log(`[${adapter.datasetName}] Parsed ${problems.length} records`);

  // Step 2: Dedup check — skip problems already in DB
  const uniqueProblems: CanonicalProblem[] = [];
  for (const problem of problems) {
    const exists = await repository.existsByDedupHash(problem.dedupHash);
    if (exists) {
      stats.duplicatesSkipped++;
    } else {
      uniqueProblems.push(problem);
    }
  }
  log(`[${adapter.datasetName}] ${stats.duplicatesSkipped} duplicates skipped, ${uniqueProblems.length} to classify`);

  if (uniqueProblems.length === 0) {
    await repository.completeImportRun(runId, "completed");
    return stats;
  }

  // Step 3: Classify (Batch API, then apply + validate)
  // Process in chunks of 1,000 to stay within batch size limits
  const CLASSIFY_CHUNK = 1_000;
  const classifiedProblems: CanonicalProblem[] = [];

  for (let i = 0; i < uniqueProblems.length; i += CLASSIFY_CHUNK) {
    const chunk = uniqueProblems.slice(i, i + CLASSIFY_CHUNK);
    log(`[${adapter.datasetName}] Classifying chunk ${i}–${i + chunk.length}`);

    const classificationMap = await classifier.classifyBatch(chunk);

    for (const problem of chunk) {
      const classResult = classificationMap.get(problem.externalId);

      if (!classResult || !classResult.ok) {
        // Fallback: attempt synchronous classification
        const syncResult = await classifier.classifySingle(problem);
        if (!syncResult.ok) {
          stats.classificationFailures++;
          log(`[${adapter.datasetName}] Classification failed for ${problem.externalId}`, {
            error: syncResult.error,
          });
          // Store as draft with needs_review = true
          classifiedProblems.push(problem);
          continue;
        }
        const withClassification = applyClassification(problem, syncResult.value);
        classifiedProblems.push(withClassification);
        continue;
      }

      const withClassification = applyClassification(problem, classResult.value);

      // Validate classification against taxonomy reference
      const validationResult = validateClassification(withClassification, taxonomy);
      if (!isOk(validationResult)) {
        stats.flaggedForReview++;
        log(`[${adapter.datasetName}] Validation warnings for ${problem.externalId}`, {
          errors: validationResult.error,
        });
        // Still store it, but flagged
      }

      classifiedProblems.push(withClassification);
    }
  }

  // Step 4: Embed + Store
  log(`[${adapter.datasetName}] Generating embeddings for ${classifiedProblems.length} problems`);

  const STORE_CHUNK = 100;
  for (let i = 0; i < classifiedProblems.length; i += STORE_CHUNK) {
    const chunk = classifiedProblems.slice(i, i + STORE_CHUNK);

    // Generate embeddings for this chunk
    let embeddings: number[][];
    try {
      embeddings = await embedder.embedBatch(chunk.map(p => p.statementPlain));
    } catch (e) {
      log(`[${adapter.datasetName}] Embedding failed for chunk ${i}`, { error: String(e) });
      stats.classificationFailures += chunk.length;
      continue;
    }

    // Store each problem
    for (let j = 0; j < chunk.length; j++) {
      const problem = chunk[j]!;
      const embedding = embeddings[j]!;

      const storeResult = await repository.insertProblem(problem, embedding, runId);
      if (!storeResult.ok) {
        log(`[${adapter.datasetName}] Storage failed for ${problem.externalId}`, {
          error: storeResult.error,
        });
        stats.parseErrors++; // storage errors counted separately but grouped here
        continue;
      }

      stats.imported++;
    }

    // Update progress in DB periodically
    await repository.updateImportRun(runId, {
      imported: STORE_CHUNK,
    });
  }

  await repository.completeImportRun(runId, "completed");

  log(`[${adapter.datasetName}] Done. Imported: ${stats.imported}, Skipped: ${stats.duplicatesSkipped}, Failed: ${stats.classificationFailures}`);
  return stats;
}

function defaultLog(msg: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  if (meta) {
    process.stdout.write(JSON.stringify({ timestamp, msg, ...meta }) + "\n");
  } else {
    process.stdout.write(JSON.stringify({ timestamp, msg }) + "\n");
  }
}
