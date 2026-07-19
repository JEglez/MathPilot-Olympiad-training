import { useEffect, useRef } from "react";
import type { SearchFilters } from "../services/api";
import { useChat } from "../hooks/useChat";
import type { Citation } from "./ChatMessage";
import { ChatMessage } from "./ChatMessage";

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  }

  const citationList: Citation[] = citations.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)", minHeight: 400 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">✦</div>
            <p className="font-semibold text-base mb-1" style={{ color: "#0F172A" }}>
              Ask me about olympiad problems
            </p>
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Try: <em style={{ color: "#64748B" }}>"Find 3 number theory problems about pigeonhole"</em>
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
        {error && (
          <p className="text-xs text-center py-2" style={{ color: "#DC2626" }}>{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <div className="px-4 sm:px-6 pb-6 pt-2" style={{ borderTop: "1px solid #E5E7EB" }}>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            rows={2}
            placeholder="Ask about olympiad problems… (Enter to send, Shift+Enter for newline)"
            className="flex-1 rounded-xl text-sm px-4 py-3 resize-none outline-none transition-all"
            style={{
              background: "#F8F9FC",
              border: "1.5px solid #E2E8F0",
              color: "#0F172A",
              fontFamily: "inherit",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.1)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="h-12 px-5 rounded-xl text-sm font-semibold transition-all shrink-0"
            style={{
              background: isStreaming ? "#E2E8F0" : "#0F172A",
              color: isStreaming ? "#94A3B8" : "#F59E0B",
              border: "none",
              cursor: isStreaming ? "not-allowed" : "pointer",
            }}
          >
            {isStreaming ? "…" : "Send ↑"}
          </button>
        </form>
      </div>
    </div>
  );
}
