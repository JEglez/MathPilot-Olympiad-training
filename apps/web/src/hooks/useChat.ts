import { useCallback, useState } from "react";
import type { ChatMessage, CitedProblem, SearchFilters } from "../services/api";
import { streamChat } from "../services/api";

interface UseChatResult {
  readonly messages: ChatMessage[];
  readonly citations: CitedProblem[];
  readonly isStreaming: boolean;
  readonly error: string | null;
  readonly send: (text: string) => void;
}

export function useChat(
  filters?: Omit<SearchFilters, "q" | "page" | "page_size">,
): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [citations, setCitations] = useState<CitedProblem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    (text: string) => {
      if (isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: text };
      const history = messages;

      setMessages((prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: "" },
      ]);
      setIsStreaming(true);
      setError(null);

      streamChat(
        { message: text, history, filters },
        (delta) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                role: "assistant",
                content: last.content + delta,
              };
            }
            return updated;
          });
        },
        (newCitations) => {
          setCitations((prev) => {
            const ids = new Set(prev.map((c) => c.id));
            const added = newCitations.filter((c) => !ids.has(c.id));
            return [...prev, ...added];
          });
        },
      )
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Chat failed");
          // Remove the empty assistant placeholder on error
          setMessages((prev) =>
            prev[prev.length - 1]?.content === ""
              ? prev.slice(0, -1)
              : prev,
          );
        })
        .finally(() => {
          setIsStreaming(false);
        });
    },
    [isStreaming, messages, filters],
  );

  return { messages, citations, isStreaming, error, send };
}
