// Intent extractor — parses natural-language queries into structured retrieval params.
// ai-guidelines.md §1.2: AI classifies and organises; it does not generate content.
// ai-guidelines.md §1.3: degrades gracefully if LLM is unavailable.
//
// gpt-5-mini quirks handled here:
//   1. Requires max_completion_tokens >= ~1500 to generate any output
//   2. Requires stream:true — non-streaming returns empty content with this deployment
//   3. Does not support custom temperature (only default=1 is allowed)
// We use streaming to accumulate the full text, then parse as JSON.

import { z } from "zod";
import {
  EXTRACT_INTENT_SYSTEM_PROMPT,
  EXTRACT_INTENT_PROMPT_VERSION,
} from "./prompts/extract-intent.js";

// ── Config ────────────────────────────────────────────────────────────────────

export interface IntentExtractorConfig {
  readonly endpoint: string;
  readonly apiKey: string;
  readonly modelId: string;
}

const API_VERSION = "2024-02-01";
// Must match or exceed the model's minimum effective token budget
const MAX_TOKENS = 1500;

// ── Output schema ─────────────────────────────────────────────────────────────

const COMPETITION_LEVELS = ["local", "state", "national", "international"] as const;

export const IntentSchema = z.object({
  mode: z.enum(["exam", "training", "general"]),
  summary: z.string().max(300),
  count: z.coerce.number().int().min(1).max(20).default(5),
  query: z.string().min(1).max(500),
  level: z.enum(COMPETITION_LEVELS).nullable().optional(),
  competition: z.string().nullable().optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

// Fallback intent used when LLM is unavailable (constitution §2.2: graceful degradation)
function fallbackIntent(rawQuery: string): Intent {
  return {
    mode: "general",
    summary: rawQuery,
    count: 5,
    query: rawQuery,
    level: undefined,
    competition: undefined,
  };
}

// ── Streaming SSE accumulator ─────────────────────────────────────────────────

/** Collects all delta strings from an Azure OpenAI streaming response into one string. */
async function accumulateStream(body: import("node:stream/web").ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return result;
        let chunk: unknown;
        try { chunk = JSON.parse(data); } catch { continue; }
        const delta = (chunk as { choices?: { delta?: { content?: string } }[] })
          ?.choices?.[0]?.delta?.content;
        if (delta) result += delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return result;
}

// ── Extractor ─────────────────────────────────────────────────────────────────

export class IntentExtractor {
  private readonly config: IntentExtractorConfig;

  constructor(config: IntentExtractorConfig) {
    this.config = config;
  }

  /**
   * Extract structured intent from a natural-language query.
   * Returns a fallback intent on LLM failure — never throws.
   */
  async extract(userQuery: string): Promise<Intent> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.modelId}/chat/completions?api-version=${API_VERSION}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: EXTRACT_INTENT_SYSTEM_PROMPT },
            { role: "user", content: userQuery },
          ],
          max_completion_tokens: MAX_TOKENS,
          stream: true,
        }),
      });
    } catch {
      return fallbackIntent(userQuery);
    }

    if (!response.ok || !response.body) {
      return fallbackIntent(userQuery);
    }

    let accumulated: string;
    try {
      accumulated = await accumulateStream(response.body);
    } catch {
      return fallbackIntent(userQuery);
    }

    // Extract JSON from the accumulated text (model may wrap in markdown code fences)
    const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackIntent(userQuery);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return fallbackIntent(userQuery);
    }

    const result = IntentSchema.safeParse(parsed);
    if (!result.success) return fallbackIntent(userQuery);

    return result.data;
  }

  get promptVersion(): string {
    return EXTRACT_INTENT_PROMPT_VERSION;
  }
}
