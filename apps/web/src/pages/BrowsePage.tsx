import { useCallback, useEffect, useState } from "react";
import { cn } from "../lib/utils";
import type { BrowseResponse, FacetCount, SearchFilters, TopicNode } from "../services/api";
import { browseProblems, getTaxonomy } from "../services/api";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { Pagination } from "../components/Pagination";
import { ProblemCard } from "../components/ProblemCard";

const DEFAULT_PAGE_SIZE = 20;

const LEVELS = [
  { value: "local",         label: "Local" },
  { value: "state",         label: "State" },
  { value: "national",      label: "National" },
  { value: "international", label: "International" },
];

export function BrowsePage() {
  const [filters, setFilters] = useState<SearchFilters>({ page: 1, page_size: DEFAULT_PAGE_SIZE });
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [topicNodes, setTopicNodes] = useState<TopicNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTaxonomy().then((t) => setTopicNodes(t.topics)).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    browseProblems(filters)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load problems"))
      .finally(() => setIsLoading(false));
  }, [filters]);

  const activeTopics = filters.topics ?? [];
  const selectedLevels = filters.level ? filters.level.split(",").filter(Boolean) : [];
  const selectedCompetitions = filters.competition ? filters.competition.split(",").filter(Boolean) : [];

  function toggleTopic(code: string) {
    const next = activeTopics.includes(code) ? activeTopics.filter((c) => c !== code) : [...activeTopics, code];
    setFilters((prev) => ({ ...prev, topics: next.length > 0 ? next : undefined, page: 1 }));
  }
  function toggleLevel(value: string) {
    const next = selectedLevels.includes(value) ? selectedLevels.filter((v) => v !== value) : [...selectedLevels, value];
    setFilters((prev) => ({ ...prev, level: next.length > 0 ? next.join(",") : undefined, page: 1 }));
  }

  // Build competition options from facets + any already selected
  const competitionFacets: FacetCount[] = data?.facets.competitions ?? [];
  const competitionOptions = competitionFacets.map((f) => ({ value: f.code, label: `${f.name} (${f.count})` }));

  function toggleCompetition(value: string) {
    const next = selectedCompetitions.includes(value) ? selectedCompetitions.filter((v) => v !== value) : [...selectedCompetitions, value];
    setFilters((prev) => ({ ...prev, competition: next.length > 0 ? next.join(",") : undefined, page: 1 }));
  }

  const hasAnyFilter = activeTopics.length > 0 || selectedLevels.length > 0 || selectedCompetitions.length > 0 || filters.year_min || filters.year_max;

  const updateFilters = useCallback((next: SearchFilters) => {
    setFilters({ ...next, page_size: DEFAULT_PAGE_SIZE });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between"
        style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}>
        <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>Browse Problems</span>
        {data && (
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            <strong style={{ color: "#0F172A" }}>{data.total.toLocaleString()}</strong> problems
          </span>
        )}
      </div>

      {/* ── Topic pills — ALL topics ── */}
      <div className="px-6 pt-4 pb-0" style={{ background: "#F8F9FC" }}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => updateFilters({ page: 1, page_size: DEFAULT_PAGE_SIZE })}
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

        {/* ── Filter dropdowns ── */}
        <div className="flex flex-wrap items-center gap-2 pb-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <MultiSelectDropdown
            label="Level"
            options={LEVELS}
            selected={selectedLevels}
            onToggle={toggleLevel}
            onClear={() => setFilters((prev) => ({ ...prev, level: undefined, page: 1 }))}
          />
          {competitionOptions.length > 0 && (
            <MultiSelectDropdown
              label="Competition"
              options={competitionOptions}
              selected={selectedCompetitions}
              onToggle={toggleCompetition}
              onClear={() => setFilters((prev) => ({ ...prev, competition: undefined, page: 1 }))}
            />
          )}
          {/* Year range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>Year</span>
            <input type="number" placeholder="From" min={1900} max={2100} value={filters.year_min ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, year_min: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
              className="w-20 h-8 rounded-lg text-xs px-2 outline-none"
              style={{ background: "#fff", border: "1.5px solid #E2E8F0", color: "#0F172A" }} />
            <span style={{ color: "#CBD5E1", fontSize: 12 }}>–</span>
            <input type="number" placeholder="To" min={1900} max={2100} value={filters.year_max ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, year_max: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
              className="w-20 h-8 rounded-lg text-xs px-2 outline-none"
              style={{ background: "#fff", border: "1.5px solid #E2E8F0", color: "#0F172A" }} />
          </div>
          {hasAnyFilter && (
            <button type="button" onClick={() => updateFilters({ page: 1, page_size: DEFAULT_PAGE_SIZE })}
              className="text-xs font-semibold px-2 py-1 rounded-md transition-colors hover:bg-red-50"
              style={{ color: "#DC2626" }}>
              Clear all ×
            </button>
          )}
          <span className="ml-auto text-xs" style={{ color: "#94A3B8" }}>
            {isLoading
              ? <span className="animate-pulse" style={{ color: "#F59E0B" }}>Loading…</span>
              : error
                ? <span style={{ color: "#DC2626" }}>{error}</span>
                : data
                  ? <><strong style={{ color: "#0F172A" }}>{data.total.toLocaleString()}</strong> problems</>
                  : null}
          </span>
        </div>

        {/* Active filter chips */}
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
      <div className="flex-1 px-6 pb-8 pt-4 space-y-2">
        {!isLoading && (data?.results ?? []).length > 0 && (
          <ul className="space-y-2 list-none p-0 m-0">
            {(data?.results ?? []).map((p, i) => (
              <li key={p.id}>
                <ProblemCard problem={p} index={((filters.page ?? 1) - 1) * DEFAULT_PAGE_SIZE + i} />
              </li>
            ))}
          </ul>
        )}
        {!isLoading && (data?.results ?? []).length === 0 && !error && (
          <div className="text-center py-20" style={{ color: "#94A3B8" }}>
            <p className="text-4xl mb-3">∅</p>
            <p className="font-medium" style={{ color: "#475569" }}>No problems match the current filters.</p>
          </div>
        )}
        <Pagination
          page={filters.page ?? 1}
          total={data?.total ?? 0}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
        />
      </div>
    </div>
  );
}
