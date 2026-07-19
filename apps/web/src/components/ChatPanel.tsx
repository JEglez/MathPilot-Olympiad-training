import { useEffect, useRef } from "react";
import type { SearchFilters } from "../services/api";
import { useChat } from "../hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatResultBlock } from "./ChatResultBlock";
import styles from "./ChatPanel.module.css";

interface Props {
  readonly filters?: Omit<SearchFilters, "q" | "page" | "page_size">;
}

export function ChatPanel({ filters }: Props) {
  const { turns, isLoading, error, send } = useChat(filters);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputRef.current?.value.trim() ?? "";
    if (!text || isLoading) return;
    send(text);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.messages}>
        {turns.length === 0 && (
          <div className={styles.empty}>
            <p>Describe what you need in natural language.</p>
            <div className={styles.examples}>
              <span>📝 "Give me an exam simulation, state level, 3 problems"</span>
              <span>🏋️ "5 hard number theory problems for a beginner"</span>
              <span>🔍 "Geometry problems involving circles from IMO"</span>
            </div>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <ChatMessage key={i} content={turn.content} />
          ) : (
            <ChatResultBlock
              key={i}
              mode={turn.mode}
              summary={turn.summary}
              problems={turn.problems}
            />
          ),
        )}

        {isLoading && (
          <div className={styles.loading} aria-label="Finding problems">
            <span /><span /><span />
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.textarea}
          placeholder="Describe what you need… (Enter to send, Shift+Enter for newline)"
          rows={2}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="Query input"
        />
        <button
          className={styles.sendBtn}
          type="submit"
          disabled={isLoading}
          aria-label="Send query"
        >
          {isLoading ? "…" : "Find ↑"}
        </button>
      </form>
    </div>
  );
}
