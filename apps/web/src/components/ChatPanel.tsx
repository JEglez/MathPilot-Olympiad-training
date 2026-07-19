import { useEffect, useRef } from "react";
import type { SearchFilters } from "../services/api";
import { useChat } from "../hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatResultBlock } from "./ChatResultBlock";

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)", minHeight: 400 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {turns.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4" style={{ color: "#0F172A" }}>✦</div>
            <p className="font-semibold text-base mb-1" style={{ color: "#0F172A" }}>
              Find Olympiad Problems
            </p>
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Try:{" "}
              <em style={{ color: "#64748B" }}>
                "Give me an exam simulation, state level, 3 problems"
              </em>
            </p>
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
              showAnswers={turn.showAnswers}
              problems={turn.problems}
            />
          ),
        )}

        {isLoading && (
          <div className="flex items-center gap-1.5 px-1 py-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: "#F59E0B",
                  animation: `bounce 1.2s ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}

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
            placeholder="Describe what you need… (Enter to send, Shift+Enter for newline)"
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
            disabled={isLoading}
            aria-label="Query input"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="h-12 px-5 rounded-xl text-sm font-semibold transition-all shrink-0"
            style={{
              background: isLoading ? "#E2E8F0" : "#0F172A",
              color: isLoading ? "#94A3B8" : "#F59E0B",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "…" : "Find ↑"}
          </button>
        </form>
      </div>
    </div>
  );
}
