import { useCallback, useEffect, useState } from "react";
import { cn } from "../lib/utils";
import type { BrowseResponse, FacetCount, SearchFilters } from "../services/api";
import { browseProblems } from "../services/api";
import { Pagination } from "../components/Pagination";
import { ProblemCard } from "../components/ProblemCard";

const DEFAULT_PAGE_SIZE = 20;

const LEVELS = ["local", "state", "national", "international"] as const;

export function BrowsePage() {
  const [filters, setFilters] = useState<SearchFilters>({ page: 1, page_size: DEFAULT_PAGE_SIZE });
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    browseProblems(filters)
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load problems");
      })
      .finally(() => setIsLoading(false));
  }, [filters]);

  const setTopic = useCallback((code: string | undefined) => {
    setFilters((prev) => ({ ...prev, topics: code ? [code] : undefined, page: 1 }));
  }, []);

  const setLevel = useCallback((level: string | undefined) => {
    setFilters((prev) => ({ ...prev, level, page: 1 }));
  }, []);

  const setCompetition = useCallback((competition: string | undefined) => {
    setFilters((prev) => ({ ...prev, competition, page: 1 }));
  }, []);

  const topicFacets: FacetCount[] = data?.facets.topics ?? [];
  const competitionFacets: FacetCount[] = data?.facets.competitions ?? [];
  const activeTopicCode = filters.topics?.[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Sticky topbar ── */}
      <div
        className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between"
        style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}
      >
        <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>Browse Problems</span>
        {data && (
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            <strong style={{ color: "#0F172A" }}>{data.total.toLocaleString()}</strong> problems
          </span>
        )}
      </div>

      {/* ── Domain tabs (from facets, or static fallback) ── */}
      <div className="px-6 pt-4 pb-2" style={{ background: "#F8F9FC" }}>
        <div
          className="flex flex-wrap gap-1 p-1 w-fit rounded-xl mb-3"
          style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}
        >
          <button
            type="button"
            onClick={() => setTopic(undefined)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={!activeTopicCode ? { background: "#0F172A", color: "#F59E0B", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" } : { color: "#64748B" }}
          >
            All
          </button>
          {(topicFacets.length > 0 ? topicFacets : []).slice(0, 6).map((f) => (
            <button
              key={f.code}
              type="button"
              onClick={() => setTopic(f.code === activeTopicCode ? undefined : f.code)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              style={activeTopicCode === f.code
                ? { background: "#0F172A", color: "#F59E0B", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                : { color: "#64748B" }}
            >
              {f.name.replace("Number Theory", "NT").replace("Combinatorics", "Comb.")}
              <span className="ml-1 opacity-50 text-[9px]">({f.count})</span>
            </button>
          ))}
        </div>

        {/* ── Filter chips row ── */}
        <div className="flex flex-wrap gap-2 mb-3">
          {LEVELS.map((lvl) => {
            const active = filters.level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(active ? undefined : lvl)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? "#FFFBEB" : "#fff",
                  color: active ? "#92400E" : "#64748B",
                  border: active ? "1.5px solid #FCD34D" : "1.5px solid #E2E8F0",
                }}
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                {active && <span className="ml-1 opacity-60">×</span>}
              </button>
            );
          })}
        </div>

        {/* ── Competition facets ── */}
        {competitionFacets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest self-center mr-1" style={{ color: "#94A3B8" }}>Competition</span>
            {competitionFacets.slice(0, 8).map((f) => {
              const active = filters.competition === f.code;
              return (
                <button
                  key={f.code}
                  type="button"
                  onClick={() => setCompetition(active ? undefined : f.code)}
                  className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all uppercase tracking-wide")}
                  style={{
                    background: active ? "#FFFBEB" : "#F1F5F9",
                    color: active ? "#92400E" : "#475569",
                    border: active ? "1px solid #FCD34D" : "1px solid #E2E8F0",
                  }}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading / error state */}
        {isLoading && <span className="text-xs animate-pulse" style={{ color: "#F59E0B" }}>Loading…</span>}
        {error && <span className="text-xs" style={{ color: "#DC2626" }}>{error}</span>}
      </div>

      {/* ── Results ── */}
      <div className="flex-1 px-6 pb-8 pt-4 space-y-2">
        {!isLoading && (data?.results ?? []).length > 0 && (
          <ul className="space-y-2 list-none p-0 m-0">
            {(data?.results ?? []).map((p, i) => (
              <li key={p.id}>
                <ProblemCard
                  problem={p}
                  index={((filters.page ?? 1) - 1) * DEFAULT_PAGE_SIZE + i}
                />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && (data?.results ?? []).length === 0 && !error && (
          <div className="text-center py-20" style={{ color: "#94A3B8" }}>
            <p className="text-4xl mb-3">∅</p>
            <p className="font-medium text-slate-600">No problems match the current filters.</p>
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
