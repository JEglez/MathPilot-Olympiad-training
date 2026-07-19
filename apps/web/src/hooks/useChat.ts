import { useCallback, useState } from "react";
import type { ChatMode, ChatQueryResponse, ProblemCard, SearchFilters } from "../services/api";
import { queryProblems } from "../services/api";

// ── Turn types (discriminated union) ─────────────────────────────────────────

export interface UserTurn {
  readonly role: "user";
  readonly content: string;
}

export interface AssistantTurn {
  readonly role: "assistant";
  readonly mode: ChatMode;
  readonly summary: string;
  readonly problems: ProblemCard[];
}

export type ChatTurn = UserTurn | AssistantTurn;

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseChatResult {
  readonly turns: ChatTurn[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly send: (text: string) => void;
}

export function useChat(
  filters?: Omit<SearchFilters, "q" | "page" | "page_size">,
): UseChatResult {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    (text: string) => {
      if (isLoading) return;

      setTurns((prev) => [...prev, { role: "user", content: text }]);
      setIsLoading(true);
      setError(null);

      queryProblems({ message: text, filters })
        .then((result: ChatQueryResponse) => {
          setTurns((prev) => [
            ...prev,
            {
              role: "assistant",
              mode: result.mode,
              summary: result.summary,
              problems: result.problems,
            },
          ]);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Query failed");
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [isLoading, filters],
  );

  return { turns, isLoading, error, send };
}
