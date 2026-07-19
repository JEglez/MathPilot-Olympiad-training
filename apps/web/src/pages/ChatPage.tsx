import { useState } from "react";
import type { SearchFilters } from "../services/api";
import { ChatPanel } from "../components/ChatPanel";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";

const LEVELS = [
  { value: "local",         label: "Local" },
  { value: "state",         label: "State" },
  { value: "national",      label: "National" },
  { value: "international", label: "International" },
];

export function ChatPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [chatFilters, setChatFilters] = useState<Omit<SearchFilters, "q" | "page" | "page_size">>({});

  const selectedLevels = chatFilters.level ? chatFilters.level.split(",").filter(Boolean) : [];

  function toggleLevel(value: string) {
    const next = selectedLevels.includes(value)
      ? selectedLevels.filter((v) => v !== value)
      : [...selectedLevels, value];
    setChatFilters((prev) => ({ ...prev, level: next.length > 0 ? next.join(",") : undefined }));
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#F8F9FC" }}>
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}>
        <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>Chat with your Corpus</span>
        <button
          type="button"
          onClick={() => setShowFilters((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: showFilters ? "#FFFBEB" : "#F1F5F9",
            color: showFilters ? "#92400E" : "#64748B",
            border: showFilters ? "1.5px solid #FCD34D" : "1.5px solid #E2E8F0",
          }}
        >
          ⚙ Context Filters {showFilters ? "▲" : "▼"}
        </button>
      </div>

      {/* ── Optional context filters ── */}
      {showFilters && (
        <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center"
          style={{ background: "#F8F9FC", borderBottom: "1px solid #E5E7EB" }}>
          <span className="text-xs text-slate-500 mr-1">Filter retrieved context:</span>
          <MultiSelectDropdown
            label="Level"
            options={LEVELS}
            selected={selectedLevels}
            onToggle={toggleLevel}
            onClear={() => setChatFilters((prev) => ({ ...prev, level: undefined }))}
          />
          {Object.keys(chatFilters).some((k) => chatFilters[k as keyof typeof chatFilters]) && (
            <button type="button" onClick={() => setChatFilters({})}
              className="text-xs font-semibold px-2 py-1 rounded-md"
              style={{ color: "#DC2626" }}>
              Clear ×
            </button>
          )}
        </div>
      )}

      {/* ── Chat panel ── */}
      <div className="flex-1">
        <ChatPanel filters={chatFilters} />
      </div>
    </div>
  );
}
