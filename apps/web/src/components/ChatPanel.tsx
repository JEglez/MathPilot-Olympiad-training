import { useEffect, useRef } from "react";
import type { SearchFilters } from "../services/api";
import { useChat } from "../hooks/useChat";
import type { Citation } from "./ChatMessage";
import { ChatMessage } from "./ChatMessage";
import styles from "./ChatPanel.module.css";

interface Props {
  readonly filters?: Omit<SearchFilters, "q" | "page" | "page_size">;
}

export function ChatPanel({ filters }: Props) {
  const { messages, citations, isStreaming, error, send } = useChat(filters);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputRef.current?.value.trim() ?? "";
    if (!text || isStreaming) return;
    send(text);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const citationList: Citation[] = citations.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  return (
    <div className={styles.panel}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p>Ask me to find olympiad problems!</p>
            <p className={styles.hint}>
              Try: <em>"Find 3 number theory problems about pigeonhole"</em>
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            citations={citationList}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
          />
        ))}
        {error && <p className={styles.error}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.textarea}
          placeholder="Ask about olympiad problems… (Enter to send, Shift+Enter for newline)"
          rows={2}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          aria-label="Chat input"
        />
        <button
          className={styles.sendBtn}
          type="submit"
          disabled={isStreaming}
          aria-label="Send message"
        >
          {isStreaming ? "…" : "Send ↑"}
        </button>
      </form>
    </div>
  );
}
