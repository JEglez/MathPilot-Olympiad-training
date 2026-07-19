// POST /api/chat — problem-finding endpoint (intent extract → retrieve → return cards)
//
// Flow:
//   1. Validate request body (Zod)
//   2. Extract structured intent via LLM (mode, count, query, level) — fast JSON call
//   3. Merge LLM-extracted filters with any user-supplied filters (user wins)
//   4. Retrieve top-N problems via hybrid search
//   5. Return JSON: { mode, summary, problems: ProblemCard[] }
//
// Degraded mode: if intent extraction fails, raw message is used as query (general mode).
// If retrieval fails, returns RFC 9457 error.
//
// No streaming — single JSON response. LLM is used only for NL→struct, not generation.

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { Pool } from "pg";
import { z } from "zod";
import { OpenAIEmbedder } from "../infrastructure/ai/embedder.js";
import type { EmbeddingGenerator } from "../domain/shared/embedding-generator.js";
import { IntentExtractor, type ConversationTurn } from "../infrastructure/ai/intent-extractor.js";
import { retrieveProblems, ChatFiltersSchema } from "./shared/retrieval.js";
import { validationError, internalError } from "./shared/filters.js";

// ── Singletons (reused across warm invocations) ───────────────────────────────

let _pool: Pool | undefined;
let _embedder: EmbeddingGenerator | undefined;
let _intentExtractor: IntentExtractor | undefined;

function getPool(): Pool {
  if (!_pool) {
    const url = process.env["MATHPILOT_DB_URL"];
    if (!url) throw new Error("MATHPILOT_DB_URL is not set");
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

function getEmbedder(): EmbeddingGenerator {
  if (!_embedder) {
    const endpoint = process.env["MATHPILOT_OPENAI_ENDPOINT"];
    const apiKey = process.env["MATHPILOT_OPENAI_KEY"];
    const modelId = process.env["MATHPILOT_EMBEDDING_MODEL"];
    if (!endpoint || !apiKey || !modelId) {
      throw new Error(
        "MATHPILOT_OPENAI_ENDPOINT, MATHPILOT_OPENAI_KEY, and MATHPILOT_EMBEDDING_MODEL must all be set",
      );
    }
    _embedder = new OpenAIEmbedder({ endpoint, apiKey, modelId });
  }
  return _embedder;
}

function getIntentExtractor(): IntentExtractor {
  if (!_intentExtractor) {
    const endpoint = process.env["MATHPILOT_OPENAI_ENDPOINT"];
    const apiKey = process.env["MATHPILOT_OPENAI_KEY"];
    const modelId = process.env["MATHPILOT_CHAT_MODEL"] ?? "gpt-5-mini";
    if (!endpoint || !apiKey) {
      throw new Error("MATHPILOT_OPENAI_ENDPOINT and MATHPILOT_OPENAI_KEY must be set");
    }
    _intentExtractor = new IntentExtractor({ endpoint, apiKey, modelId });
  }
  return _intentExtractor;
}

// ── Request schema ────────────────────────────────────────────────────────────

const ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  history: z.array(ConversationTurnSchema).optional().default([]),
  filters: ChatFiltersSchema.optional().default({}),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function chatHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // 1. Parse and validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(validationError("Request body must be valid JSON"));
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map(i => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return problemResponse(validationError(detail));
  }

  const { message, history, filters } = parsed.data;

  // 2. Extract intent with conversation history for context-aware follow-ups
  const intent = await getIntentExtractor().extract(message, history as ConversationTurn[]);
  context.log(`chatHandler: intent mode=${intent.mode} count=${intent.count} showAnswers=${intent.showAnswers}`);

  // 3. Merge filters: user-supplied filters take precedence over LLM-extracted ones
  const mergedFilters = {
    ...filters,
    level: filters.level ?? intent.level ?? undefined,
    competition: filters.competition ?? intent.competition ?? undefined,
  };

  // 4. Retrieve problems
  let problems: Awaited<ReturnType<typeof retrieveProblems>>;
  try {
    problems = await retrieveProblems(
      intent.query,
      mergedFilters,
      intent.count,
      getPool(),
      getEmbedder(),
    );
  } catch (e) {
    context.error("chatHandler: retrieval failed", e);
    return problemResponse(internalError("Problem retrieval failed"));
  }

  // 5. Return structured JSON result
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    jsonBody: {
      mode: intent.mode,
      summary: intent.summary,
      showAnswers: intent.showAnswers,
      problems,
    },
  };
}

// ── Error helper ──────────────────────────────────────────────────────────────

function problemResponse(
  err: ReturnType<typeof validationError | typeof internalError>,
): HttpResponseInit {
  return {
    status: err.status,
    headers: { "Content-Type": "application/problem+json" },
    jsonBody: err,
  };
}

// ── Azure Functions registration ──────────────────────────────────────────────

app.http("chat", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "chat",
  handler: chatHandler,
});
