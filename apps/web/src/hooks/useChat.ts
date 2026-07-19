import { useCallback, useState } from "react";
import type { ChatHistoryTurn, ChatMode, ChatQueryResponse, ProblemCard, SearchFilters } from "../services/api";
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
  readonly showAnswers: boolean;
  readonly problems: ProblemCard[];
}

export type ChatTurn = UserTurn | AssistantTurn;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert ChatTurn[] to the flat history format the API expects. */
function buildHistory(turns: ChatTurn[]): ChatHistoryTurn[] {
  return turns.map((t) =>
    t.role === "user"
      ? { role: "user" as const, content: t.content }
      : { role: "assistant" as const, content: t.summary },
  );
}

/** Collect all problem IDs already shown across all assistant turns. */
function buildExcludeIds(turns: ChatTurn[]): string[] {
  const ids: string[] = [];
  for (const turn of turns) {
    if (turn.role === "assistant") {
      ids.push(...turn.problems.map((p) => p.id));
    }
  }
  return ids;
}

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

      setTurns((prev) => {
        const history = buildHistory(prev);
        const exclude_ids = buildExcludeIds(prev);

        const userTurn: UserTurn = { role: "user", content: text };
        const updated = [...prev, userTurn];

        setIsLoading(true);
        setError(null);

        queryProblems({ message: text, history, filters, exclude_ids })
          .then((result: ChatQueryResponse) => {
            setTurns((current) => [
              ...current,
              {
                role: "assistant",
                mode: result.mode,
                summary: result.summary,
                showAnswers: result.showAnswers,
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

        return updated;
      });
    },
    [isLoading, filters],
  );

  return { turns, isLoading, error, send };
}
