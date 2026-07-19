import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import type { SearchFilters, TopicNode } from "../services/api";
import { getTaxonomy } from "../services/api";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { Pagination } from "../components/Pagination";
import { ProblemCard } from "../components/ProblemCard";
import { useSearch } from "../hooks/useSearch";

const LEVELS = [
  { value: "local",         label: "Local" },
  { value: "state",         label: "State" },
  { value: "national",      label: "National" },
  { value: "international", label: "International" },
];

const COMPETITIONS = [
  { value: "IMO",       label: "IMO — International Mathematical Olympiad" },
  { value: "USAMO",     label: "USAMO — US Mathematical Olympiad" },
  { value: "AIME",      label: "AIME — American Invitational" },
  { value: "AMC 10",    label: "AMC 10" },
  { value: "AMC 12",    label: "AMC 12" },
  { value: "APMO",      label: "APMO — Asia Pacific" },
  { value: "Putnam",    label: "Putnam" },
  { value: "HMMT",      label: "HMMT" },
  { value: "PUMAC",     label: "PUMAC" },
  { value: "MathLeague",label: "MathLeague" },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [topicNodes, setTopicNodes] = useState<TopicNode[]>([]);
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    getTaxonomy().then((t) => setTopicNodes(t.topics)).catch(() => {});
  }, []);

  const filters: SearchFilters = useMemo(() => ({
    q: searchParams.get("q") ?? undefined,
    topics: searchParams.get("topics")?.split(",").filter(Boolean) ?? undefined,
    level: searchParams.get("level") ?? undefined,
    competition: searchParams.get("competition") ?? undefined,
    year_min: searchParams.get("year_min") ? Number(searchParams.get("year_min")) : undefined,
    year_max: searchParams.get("year_max") ? Number(searchParams.get("year_max")) : undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    page_size: 20,
  }), [searchParams]);

  const { results, total, page, pageSize, isLoading, error } = useSearch(filters);

  const setFilters = useCallback((next: SearchFilters) => {
    const params: Record<string, string> = {};
    if (next.q) params["q"] = next.q;
    if (next.topics?.length) params["topics"] = next.topics.join(",");
    if (next.level) params["level"] = next.level;
    if (next.competition) params["competition"] = next.competition;
    if (next.year_min !== undefined) params["year_min"] = String(next.year_min);
    if (next.year_max !== undefined) params["year_max"] = String(next.year_max);
    if (next.page && next.page > 1) params["page"] = String(next.page);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Debounced search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, q: inputValue.trim() || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  // Topic multiselect toggle
  function toggleTopic(code: string) {
    const current = filters.topics ?? [];
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    setFilters({ ...filters, topics: next.length > 0 ? next : undefined, page: 1 });
  }

  // Level multiselect — API supports single string; send comma-joined for display, first value to API
  // We store as comma-joined in the level param
  const selectedLevels = filters.level ? filters.level.split(",").filter(Boolean) : [];
  function toggleLevel(value: string) {
    const next = selectedLevels.includes(value)
      ? selectedLevels.filter((v) => v !== value)
      : [...selectedLevels, value];
    setFilters({ ...filters, level: next.length > 0 ? next.join(",") : undefined, page: 1 });
  }

  // Competition multiselect — API is single string; store comma-joined
  const selectedCompetitions = filters.competition ? filters.competition.split(",").filter(Boolean) : [];
  function toggleCompetition(value: string) {
    const next = selectedCompetitions.includes(value)
      ? selectedCompetitions.filter((v) => v !== value)
      : [...selectedCompetitions, value];
    setFilters({ ...filters, competition: next.length > 0 ? next.join(",") : undefined, page: 1 });
  }

  const activeTopics = filters.topics ?? [];
  const hasAnyFilter = activeTopics.length > 0 || selectedLevels.length > 0 || selectedCompetitions.length > 0 || filters.year_min || filters.year_max;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Sticky topbar with search ── */}
      <div
        className="sticky top-0 z-10 px-4 sm:px-6 py-3"
        style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}
      >
        <div className="relative max-w-2xl">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
            style={{ color: "#94A3B8" }}
            aria-hidden
          >⌕</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search olympiad problems…"
            className="w-full h-10 rounded-xl text-sm font-medium pl-9 pr-4 outline-none transition-all"
            style={{ background: "#F8F9FC", border: "1.5px solid #E2E8F0", color: "#0F172A" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.1)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* ── Domain multiselect pills ── */}
      <div className="px-4 sm:px-6 pt-4 pb-0" style={{ background: "#F8F9FC" }}>
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, topics: undefined, page: 1 })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={activeTopics.length === 0
              ? { background: "#0F172A", color: "#F59E0B", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
              : { background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            All
          </button>
          {topicNodes.map((t) => {
            const active = activeTopics.includes(t.code);
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => toggleTopic(t.code)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all")}
                style={active
                  ? { background: "#0F172A", color: "#F59E0B", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }
                  : { background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {/* ── Filter dropdowns row ── */}
        <div className="flex flex-wrap items-center gap-2 pb-3 overflow-x-auto" style={{ borderBottom: "1px solid #F1F5F9", scrollbarWidth: "none" }}>
          <MultiSelectDropdown
            label="Level"
            options={LEVELS}
            selected={selectedLevels}
            onToggle={toggleLevel}
            onClear={() => setFilters({ ...filters, level: undefined, page: 1 })}
          />
          <MultiSelectDropdown
            label="Competition"
            options={COMPETITIONS}
            selected={selectedCompetitions}
            onToggle={toggleCompetition}
            onClear={() => setFilters({ ...filters, competition: undefined, page: 1 })}
          />

          {/* Year range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>Year</span>
            <input
              type="number"
              placeholder="From"
              min={1900} max={2100}
              value={filters.year_min ?? ""}
              onChange={(e) => setFilters({ ...filters, year_min: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
              className="w-20 h-8 rounded-lg text-xs px-2 outline-none"
              style={{ background: "#fff", border: "1.5px solid #E2E8F0", color: "#0F172A" }}
            />
            <span style={{ color: "#CBD5E1", fontSize: 12 }}>–</span>
            <input
              type="number"
              placeholder="To"
              min={1900} max={2100}
              value={filters.year_max ?? ""}
              onChange={(e) => setFilters({ ...filters, year_max: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
              className="w-20 h-8 rounded-lg text-xs px-2 outline-none"
              style={{ background: "#fff", border: "1.5px solid #E2E8F0", color: "#0F172A" }}
            />
          </div>

          {/* Clear all + result count */}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => setFilters({ page: 1, page_size: 20 })}
              className="text-xs font-semibold px-2 py-1 rounded-md transition-colors hover:bg-red-50"
              style={{ color: "#DC2626" }}
            >
              Clear all ×
            </button>
          )}
          <span className="ml-auto text-xs" style={{ color: "#94A3B8" }}>
            {isLoading
              ? <span className="animate-pulse" style={{ color: "#F59E0B" }}>Searching…</span>
              : error
                ? <span style={{ color: "#DC2626" }}>{error}</span>
                : total > 0
                  ? <><strong style={{ color: "#0F172A" }}>{total.toLocaleString()}</strong> problems</>
                  : "No results"}
          </span>
        </div>

        {/* ── Active filter chips ── */}
        {hasAnyFilter && (
          <div className="flex flex-wrap gap-1.5 py-2">
            {activeTopics.map((code) => {
              const name = topicNodes.find((t) => t.code === code)?.name ?? code;
              return (
                <span key={code} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
                  {name}
                  <button type="button" onClick={() => toggleTopic(code)} style={{ lineHeight: 1, color: "#D97706" }}>×</button>
                </span>
              );
            })}
            {selectedLevels.map((l) => (
              <span key={l} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: "#DBEAFE", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
                <button type="button" onClick={() => toggleLevel(l)} style={{ lineHeight: 1, color: "#1D4ED8" }}>×</button>
              </span>
            ))}
            {selectedCompetitions.map((c) => (
              <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: "#EDE9FE", color: "#5B21B6", border: "1px solid #DDD6FE" }}>
                {c}
                <button type="button" onClick={() => toggleCompetition(c)} style={{ lineHeight: 1, color: "#5B21B6" }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div className="flex-1 px-4 sm:px-6 pb-8 pt-4 space-y-2">
        {!isLoading && results.length > 0 && (
          <ul className="space-y-2 list-none p-0 m-0">
            {results.map((p, i) => (
              <li key={p.id}>
                <ProblemCard problem={p} index={(page - 1) * pageSize + i} />
              </li>
            ))}
          </ul>
        )}
        {!isLoading && results.length === 0 && !error && (
          <div className="text-center py-20" style={{ color: "#94A3B8" }}>
            <p className="text-4xl mb-3">∅</p>
            <p className="font-medium" style={{ color: "#475569" }}>No problems match your search.</p>
            <p className="text-sm mt-1">Try different keywords or adjust the filters.</p>
          </div>
        )}
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
        />
      </div>
    </div>
  );
}
