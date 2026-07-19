// Azure OpenAI streaming chat client — implements ChatModel domain interface
// Per ai-guidelines.md §5: retry + circuit breaker on all AI service calls.
// Per ai-guidelines.md §3: model identifiers are environment configuration.
// Per ai-guidelines.md §6: log every AI call with operation type, model, token counts.
//
// Uses native fetch (no openai SDK) — consistent with embedder.ts pattern.
// Streams Server-Sent Events from the Azure OpenAI chat completions endpoint.

import type { ChatModel, ConversationTurn } from "../../domain/shared/chat-model.js";

export interface AzureOpenAIChatConfig {
  /** Azure OpenAI endpoint, e.g. https://my-resource.openai.azure.com */
  readonly endpoint: string;
  /** Azure OpenAI API key */
  readonly apiKey: string;
  /** Deployment name / model ID, e.g. gpt-4o-mini */
  readonly modelId: string;
}

// Chat completion parameters fixed per Phase 4 spec
// Note: gpt-5-mini does not support custom temperature (only default=1 is allowed)
const MAX_TOKENS = 1500;
const API_VERSION = "2024-02-01";

// Circuit breaker config — matches embedder.ts constants
const MAX_FAILURES = 3;
const CIRCUIT_OPEN_MS = 60_000;

export class AzureOpenAIChatClient implements ChatModel {
  private readonly config: AzureOpenAIChatConfig;
  private consecutiveFailures = 0;
  private circuitOpenUntil: Date | null = null;

  constructor(config: AzureOpenAIChatConfig) {
    this.config = config;
  }

  /**
   * Stream a chat completion, yielding content delta strings as they arrive.
   * Implements SSE parsing of the Azure OpenAI streaming response.
   */
  async *streamChat(
    systemPrompt: string,
    history: ConversationTurn[],
    userMessage: string,
  ): AsyncGenerator<string> {
    if (this.isCircuitOpen()) {
      throw new Error("Chat circuit breaker is open — AI service unavailable");
    }

    const url = `${this.config.endpoint}/openai/deployments/${this.config.modelId}/chat/completions?api-version=${API_VERSION}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map(t => ({ role: t.role, content: t.content })),
      { role: "user" as const, content: userMessage },
    ];

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          messages,
          max_completion_tokens: MAX_TOKENS,
          stream: true,
        }),
      });
    } catch (networkErr) {
      this.recordFailure();
      throw new Error(`Chat API network error: ${String(networkErr)}`);
    }

    if (!response.ok) {
      this.recordFailure();
      throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
    }

    const body = response.body;
    if (!body) {
      this.recordFailure();
      throw new Error("Chat API returned empty response body");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n; we may receive partial lines
        const lines = buffer.split("\n");
        // Keep incomplete last segment in buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            this.recordSuccess();
            return;
          }

          let chunk: unknown;
          try {
            chunk = JSON.parse(data);
          } catch {
            continue; // Skip malformed chunks
          }

          const delta = (chunk as { choices?: { delta?: { content?: string } }[] })
            .choices?.[0]?.delta?.content;

          if (delta) {
            yield delta;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.recordSuccess();
  }

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
    if (this.consecutiveFailures >= MAX_FAILURES) {
      this.circuitOpenUntil = new Date(Date.now() + CIRCUIT_OPEN_MS);
    }
  }
}
