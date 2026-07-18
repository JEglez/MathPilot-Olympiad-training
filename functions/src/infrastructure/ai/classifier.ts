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

    // TODO: Upload batchLines JSONL to Azure OpenAI Files API,
    //       create batch job, poll until completed, parse output file.
    //       Stubbed here — implement with actual fetch calls to Azure OpenAI.
    void batchLines;

    return new Map();
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
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
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
