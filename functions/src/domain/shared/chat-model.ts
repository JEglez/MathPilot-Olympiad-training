// Domain interface for streaming chat completions (RAG)
// AI services must be wrapped behind domain interfaces — architecture-principles.md §5
// Concrete implementation lives in infrastructure/ai/chat-client.ts
//
// Rule: this file MUST have zero external imports (architecture-principles.md §1).

/** A single turn in a multi-turn conversation. */
export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}

/**
 * Domain interface for generating streaming chat responses.
 *
 * The chat model is ONLY allowed to cite retrieved problems — it must never
 * generate mathematical proofs or solutions (constitution §2.1, ai-guidelines §1.2).
 *
 * The system prompt is built by the caller (chat.ts) and must enforce
 * the "cite-only-retrieved" rule. The model interface is agnostic to that logic.
 */
export interface ChatModel {
  /**
   * Stream a chat completion, yielding content delta strings as they arrive.
   *
   * @param systemPrompt  Fully-built system prompt including retrieved context.
   * @param history       Truncated conversation turns (oldest-first).
   * @param userMessage   The current user message to respond to.
   * @returns             AsyncIterable of content delta strings.
   * @throws              If the AI service is unavailable or returns an error.
   */
  streamChat(
    systemPrompt: string,
    history: ConversationTurn[],
    userMessage: string,
  ): AsyncIterable<string>;
}
