// POST /api/chat — RAG chat endpoint (retrieve + generate + stream)
// Per 04-mvp-implementation-roadmap.md §4 tasks 4.1–4.7
// Per 03-dataset-import-search.md §9
//
// Flow:
//   1. Validate request body (Zod)
//   2. Retrieve top-10 problems via hybrid search
//   3. Build olympiad coach system prompt with retrieved context
//   4. Stream GPT-4o-mini response as Server-Sent Events
//   5. After stream: extract citations, validate against DB, append as SSE event
//
// SSE event format:
//   data: {"delta":"<text chunk>"}\n\n  — content chunks during streaming
//   data: [DONE]\n\n                    — end of stream signal
//   data: {"citations":[...]}\n\n       — validated cited problems
//   data: {"error":"<message>"}\n\n     — if generation fails mid-stream
//
// Degraded mode: if retrieval fails, returns RFC 9457 error (no stream started).
// If generation fails mid-stream, emits an error SSE event before closing.

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { ReadableStream } from "node:stream/web";
import { Pool } from "pg";
import { z } from "zod";
import { OpenAIEmbedder } from "../infrastructure/ai/embedder.js";
import type { EmbeddingGenerator } from "../domain/shared/embedding-generator.js";
import { AzureOpenAIChatClient } from "../infrastructure/ai/chat-client.js";
import type { ChatModel } from "../domain/shared/chat-model.js";
import { buildCoachSystemPrompt } from "../infrastructure/ai/prompts/chat-coach.js";
import { retrieveProblems, ChatFiltersSchema } from "./shared/retrieval.js";
import { extractCitations, lookupCitations } from "./shared/citations.js";
import { validationError, internalError } from "./shared/filters.js";

// ── Singletons (reused across warm invocations) ───────────────────────────────

let _pool: Pool | undefined;
let _embedder: EmbeddingGenerator | undefined;
let _chatClient: ChatModel | undefined;

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

function getChatClient(): ChatModel {
  if (!_chatClient) {
    const endpoint = process.env["MATHPILOT_OPENAI_ENDPOINT"];
    const apiKey = process.env["MATHPILOT_OPENAI_KEY"];
    const modelId =
      process.env["MATHPILOT_CHAT_MODEL"] ?? "gpt-4o-mini";
    if (!endpoint || !apiKey) {
      throw new Error(
        "MATHPILOT_OPENAI_ENDPOINT and MATHPILOT_OPENAI_KEY must be set",
      );
    }
    _chatClient = new AzureOpenAIChatClient({ endpoint, apiKey, modelId });
  }
  return _chatClient;
}

// ── Request schema ────────────────────────────────────────────────────────────

const ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  history: z.array(ConversationTurnSchema).optional().default([]),
  filters: ChatFiltersSchema.optional().default({}),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ── History truncation ────────────────────────────────────────────────────────

/** 1 token ≈ 4 chars. Keep last N turns where total chars < 32_000 (~8k tokens). */
const MAX_HISTORY_CHARS = 32_000;

function truncateHistory(
  history: ChatRequest["history"],
): ChatRequest["history"] {
  let totalChars = 0;
  const result: ChatRequest["history"] = [];

  // Iterate from newest to oldest, prepend to preserve order
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (!turn) continue;
    totalChars += turn.content.length;
    if (totalChars > MAX_HISTORY_CHARS) break;
    result.unshift(turn);
  }

  return result;
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function sseEvent(data: string): Uint8Array {
  return encoder.encode(`data: ${data}\n\n`);
}

function sseJson(payload: unknown): Uint8Array {
  return sseEvent(JSON.stringify(payload));
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function chatHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // 1. Parse and validate request body
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

  // 2. Retrieve problems (non-streaming — must happen before stream starts)
  let problems: Awaited<ReturnType<typeof retrieveProblems>>;
  try {
    problems = await retrieveProblems(
      message,
      filters,
      10,
      getPool(),
      getEmbedder(),
    );
  } catch (e) {
    context.error("chatHandler: retrieval failed", e);
    return problemResponse(internalError("Problem retrieval failed"));
  }

  // 3. Build system prompt (per ai-guidelines §2.2: context goes in system, not user)
  const systemPrompt = buildCoachSystemPrompt(problems);
  const truncatedHistory = truncateHistory(history);
  const pool = getPool();

  // 4. Create SSE ReadableStream
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullResponse = "";

      try {
        const chatClient = getChatClient();

        // Stream content deltas
        for await (const delta of chatClient.streamChat(
          systemPrompt,
          truncatedHistory,
          message,
        )) {
          fullResponse += delta;
          controller.enqueue(sseJson({ delta }));
        }

        // Signal end of streamed text
        controller.enqueue(sseEvent("[DONE]"));

        // Extract and validate citations
        const citedIds = extractCitations(fullResponse);
        const citations = await lookupCitations(citedIds, pool);
        controller.enqueue(sseJson({ citations }));
      } catch (e) {
        context.error("chatHandler: generation failed mid-stream", e);
        controller.enqueue(sseJson({ error: "Generation failed" }));
      } finally {
        controller.close();
      }
    },
  });

  return {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      // Disable Nginx/Azure proxy buffering so chunks reach the client immediately
      "X-Accel-Buffering": "no",
    },
    body: stream,
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
