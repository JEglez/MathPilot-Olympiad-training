// OpenAI Batch API classifier — implements ProblemClassifier domain interface
// AI adapter: config-based model IDs, retry, circuit breaker, cost logging
// Per ai-guidelines.md §3, §4.1 and 03-dataset-import-search.md §5.3

import { z } from "zod";
import type { CanonicalProblem, ClassifyError, TechniqueClassification } from "../../domain/ingestion/types";
import type { Result } from "../../domain/shared/result";
import { ok, err } from "../../domain/shared/result";
import { asTechniqueCode, asTopicCode, asSubtopicCode } from "../../domain/shared/branded";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  CLASSIFICATION_PROMPT_VERSION,
} from "./prompts/classify-problem";

// ── Zod schema for classification output ────────────────────────────────────

const ClassificationOutputSchema = z.object({
  topics: z.array(z.string()).min(1).max(4),
  subtopics: z.array(z.string()).min(1).max(6),
  techniques: z.array(z.object({
    code: z.string(),
    is_primary: z.boolean(),
  })).min(1).max(5),
  competition_level: z.enum(["local", "state", "national", "international"]),
  position_in_paper: z.enum(["early", "middle", "late"]).nullable().optional(),
  technique_depth: z.enum(["single", "compound", "synthesis"]),
  creativity_demand: z.enum(["routine", "insightful", "inventive", "breakthrough"]),
  proof_style: z.enum(["computation", "existence", "construction", "bound", "characterisation", "impossibility"]),
  entry_barrier: z.enum(["transparent", "camouflaged", "deceptive"]),
  estimated_solve_time_minutes: z.number().int().min(5).max(240).nullable().optional(),
});

type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

// ── Config ────────────────────────────────────────────────────────────────────

export interface ClassifierConfig {
  /** From env: MATHPILOT_CLASSIFICATION_MODEL */
  readonly modelId: string;
  /** Azure OpenAI endpoint */
  readonly endpoint: string;
  /** Azure OpenAI API key */
  readonly apiKey: string;
}

// ── Classifier ────────────────────────────────────────────────────────────────

export class OpenAIClassifier {
  private readonly config: ClassifierConfig;

  // Circuit breaker (ai-guidelines.md §6)
  private consecutiveFailures = 0;
  private circuitOpenUntil: Date | null = null;
  private static readonly MAX_FAILURES = 3;
  private static readonly CIRCUIT_OPEN_MS = 60_000;

  constructor(config: ClassifierConfig) {
    this.config = config;
  }

  /** Classify a batch of problems using the Azure OpenAI Batch API */
  async classifyBatch(
    problems: CanonicalProblem[],
  ): Promise<Map<string, Result<ClassificationOutput, ClassifyError>>> {
    if (this.isCircuitOpen()) {
      const results = new Map<string, Result<ClassificationOutput, ClassifyError>>();
      for (const p of problems) {
        results.set(p.externalId, err({ kind: "circuit_open" }));
      }
      return results;
    }

    // Prepare JSONL batch file
    const batchLines = problems.map(p => JSON.stringify({
      custom_id: p.externalId,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: this.config.modelId,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage({
            statement: p.statementPlain,
            sourceSubject: p.sourceSubject,
            sourceDifficulty: p.sourceDifficulty,
            sourceCompetition: p.sourceCompetition,
          })},
        ],
        response_format: { type: "json_object" },
        temperature: 0,   // deterministic classification (ai-guidelines.md §2.2)
        max_tokens: 400,
      },
      metadata: { prompt_version: CLASSIFICATION_PROMPT_VERSION },
    }));

    const results = new Map<string, Result<ClassificationOutput, ClassifyError>>();

    // Step 1: Upload JSONL file to Azure OpenAI Files API
    const jsonlBody = batchLines.join("\n");
    const formData = new FormData();
    formData.append("purpose", "batch");
    formData.append("file", new Blob([jsonlBody], { type: "application/jsonl" }), "batch.jsonl");

    const uploadRes = await fetchWithTimeout(
      `${this.config.endpoint}/openai/files?api-version=2024-07-01-preview`,
      { method: "POST", headers: { "api-key": this.config.apiKey }, body: formData },
    );
    if (!uploadRes.ok) {
      this.recordFailure();
      for (const p of problems) {
        results.set(p.externalId, err({ kind: "api_error", message: `File upload failed: ${uploadRes.status}` }));
      }
      return results;
    }
    const { id: fileId } = await uploadRes.json() as { id: string };

    // Step 2: Create batch job
    const batchRes = await fetchWithTimeout(
      `${this.config.endpoint}/openai/batches?api-version=2024-07-01-preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": this.config.apiKey },
        body: JSON.stringify({
          input_file_id: fileId,
          endpoint: "/v1/chat/completions",
          completion_window: "24h",
        }),
      },
    );
    if (!batchRes.ok) {
      this.recordFailure();
      for (const p of problems) {
        results.set(p.externalId, err({ kind: "api_error", message: `Batch create failed: ${batchRes.status}` }));
      }
      return results;
    }
    const { id: batchId } = await batchRes.json() as { id: string };

    // Step 3: Poll until completed (max 24h, 30s intervals with exponential backoff cap)
    let outputFileId: string | null = null;
    const POLL_START_MS = 30_000;
    const POLL_MAX_MS = 300_000;  // 5 minutes
    const POLL_DEADLINE = Date.now() + 24 * 60 * 60 * 1_000;
    let pollInterval = POLL_START_MS;

    while (Date.now() < POLL_DEADLINE) {
      await sleep(pollInterval);
      pollInterval = Math.min(pollInterval * 1.5, POLL_MAX_MS);

      const statusRes = await fetchWithTimeout(
        `${this.config.endpoint}/openai/batches/${batchId}?api-version=2024-07-01-preview`,
        { headers: { "api-key": this.config.apiKey } },
      );
      if (!statusRes.ok) continue;

      const status = await statusRes.json() as { status: string; output_file_id?: string; error_file_id?: string };

      if (status.status === "completed" && status.output_file_id) {
        outputFileId = status.output_file_id;
        break;
      }
      if (status.status === "failed" || status.status === "cancelled" || status.status === "expired") {
        this.recordFailure();
        for (const p of problems) {
          results.set(p.externalId, err({ kind: "api_error", message: `Batch ${status.status}` }));
        }
        return results;
      }
      // statuses "validating" | "in_progress" | "finalizing" → keep polling
    }

    if (!outputFileId) {
      this.recordFailure();
      for (const p of problems) {
        results.set(p.externalId, err({ kind: "timeout" }));
      }
      return results;
    }

    // Step 4: Download output file and parse per-request results
    const downloadRes = await fetchWithTimeout(
      `${this.config.endpoint}/openai/files/${outputFileId}/content?api-version=2024-07-01-preview`,
      { headers: { "api-key": this.config.apiKey } },
    );
    if (!downloadRes.ok) {
      this.recordFailure();
      for (const p of problems) {
        results.set(p.externalId, err({ kind: "api_error", message: `Output download failed: ${downloadRes.status}` }));
      }
      return results;
    }

    const outputText = await downloadRes.text();
    for (const line of outputText.split("\n")) {
      if (!line.trim()) continue;
      type BatchOutputLine = {
        custom_id: string;
        response?: { status_code: number; body: { choices: Array<{ message: { content: string } }> } };
        error?: { message: string };
      };
      const parsed = JSON.parse(line) as BatchOutputLine;
      const { custom_id, response, error } = parsed;

      if (error ?? !response) {
        results.set(custom_id, err({ kind: "api_error", message: error?.message ?? "missing response" }));
        continue;
      }

      const content = response.body.choices[0]?.message.content ?? "";
      const parseResult = ClassificationOutputSchema.safeParse(JSON.parse(content));
      if (!parseResult.success) {
        results.set(custom_id, err({ kind: "invalid_output", raw: content }));
      } else {
        this.recordSuccess();
        results.set(custom_id, ok(parseResult.data));
      }
    }

    return results;
  }

  /** Classify a single problem synchronously (fallback when Batch API unavailable) */
  async classifySingle(
    problem: CanonicalProblem,
  ): Promise<Result<ClassificationOutput, ClassifyError>> {
    if (this.isCircuitOpen()) {
      return err({ kind: "circuit_open" });
    }

    const userMessage = buildUserMessage({
      statement: problem.statementPlain,
      sourceSubject: problem.sourceSubject,
      sourceDifficulty: problem.sourceDifficulty,
      sourceCompetition: problem.sourceCompetition,
    });

    const startMs = Date.now();
    const TIMEOUT_MS = 30_000;

    try {
      const response = await fetchWithTimeout(
        `${this.config.endpoint}/openai/deployments/${this.config.modelId}/chat/completions?api-version=2024-02-01`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": this.config.apiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMessage },
            ],
            response_format: { type: "json_object" },
            temperature: 0,
            max_tokens: 400,
          }),
        },
        TIMEOUT_MS,
      );

      if (!response.ok) {
        this.recordFailure();
        return err({ kind: "ai_unavailable", retryAfter: 60 });
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        this.recordFailure();
        return err({ kind: "invalid_json", rawResponse: JSON.stringify(data) });
      }

      const parsed = parseClassificationOutput(rawContent);
      if (!parsed.ok) {
        this.recordFailure();
        return parsed;
      }

      this.recordSuccess();
      return parsed;

    } catch (e) {
      this.recordFailure();
      const elapsedMs = Date.now() - startMs;
      if (elapsedMs >= TIMEOUT_MS) {
        return err({ kind: "timeout", elapsedMs });
      }
      return err({ kind: "ai_unavailable", retryAfter: 60 });
    }
  }

  // ── Circuit breaker ──────────────────────────────────────────────────────

  private isCircuitOpen(): boolean {
    if (!this.circuitOpenUntil) return false;
    if (new Date() > this.circuitOpenUntil) {
      this.circuitOpenUntil = null;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= OpenAIClassifier.MAX_FAILURES) {
      this.circuitOpenUntil = new Date(Date.now() + OpenAIClassifier.CIRCUIT_OPEN_MS);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseClassificationOutput(
  raw: string,
): Result<ClassificationOutput, ClassifyError> {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return err({ kind: "invalid_json", rawResponse: raw });
  }

  const result = ClassificationOutputSchema.safeParse(json);
  if (!result.success) {
    return err({ kind: "invalid_json", rawResponse: raw });
  }

  return ok(result.data);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 120_000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Map parsed ClassificationOutput onto a CanonicalProblem (apply classification) */
export function applyClassification(
  problem: CanonicalProblem,
  classification: ClassificationOutput,
): CanonicalProblem {
  return {
    ...problem,
    topics: classification.topics.map(asTopicCode),
    subtopics: classification.subtopics.map(asSubtopicCode),
    techniques: classification.techniques.map(t => ({
      code: asTechniqueCode(t.code),
      isPrimary: t.is_primary,
    })),
    competitionLevel: classification.competition_level,
    positionInPaper: classification.position_in_paper ?? null,
    techniqueDepth: classification.technique_depth,
    creativityDemand: classification.creativity_demand,
    proofStyle: classification.proof_style,
    entryBarrier: classification.entry_barrier,
    estimatedSolveTimeMinutes: classification.estimated_solve_time_minutes ?? null,
  };
}
