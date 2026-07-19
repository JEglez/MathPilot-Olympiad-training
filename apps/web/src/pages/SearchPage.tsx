import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import type { SearchFilters, TopicNode } from "../services/api";
import { getTaxonomy } from "../services/api";
import { Pagination } from "../components/Pagination";
import { ProblemCard } from "../components/ProblemCard";
import { useSearch } from "../hooks/useSearch";

const LEVELS = ["local", "state", "national", "international"] as const;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");

  // Load taxonomy for domain tabs
  useEffect(() => {
    getTaxonomy()
      .then((t) => setTopics(t.topics))
      .catch(() => {});
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, q: inputValue.trim() || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  function setTopic(code: string | undefined) {
    setFilters({ ...filters, topics: code ? [code] : undefined, page: 1 });
  }

  function setLevel(level: string | undefined) {
    setFilters({ ...filters, level, page: 1 });
  }

  const activeTopicCode = filters.topics?.[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top search bar ── */}
      <div
        className="sticky top-0 z-10 px-6 py-3"
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
            style={{
              background: "#F8F9FC",
              border: "1.5px solid #E2E8F0",
              color: "#0F172A",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.1)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* ── Domain tabs ── */}
      <div
        className="px-6 pt-4 pb-2"
        style={{ background: "#F8F9FC" }}
      >
        <div
          className="flex gap-1 p-1 w-fit rounded-xl"
          style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}
        >
          <button
            type="button"
            onClick={() => setTopic(undefined)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              !activeTopicCode
                ? "text-amber-700"
                : "text-slate-500 hover:text-slate-800"
            )}
            style={!activeTopicCode ? { background: "#0F172A", color: "#F59E0B", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" } : {}}
          >
            All
          </button>
          {topics.slice(0, 6).map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setTopic(t.code)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                activeTopicCode === t.code
                  ? "text-amber-700"
                  : "text-slate-500 hover:text-slate-800"
              )}
              style={activeTopicCode === t.code ? { background: "#0F172A", color: "#F59E0B", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" } : {}}
            >
              {t.name.replace("Number Theory", "NT").replace("Combinatorics", "Comb.")}
            </button>
          ))}
        </div>

        {/* ── Filter chips ── */}
        <div className="flex flex-wrap gap-2 mt-3">
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

          {/* Result count */}
          {!isLoading && !error && (
            <span className="ml-auto text-xs" style={{ color: "#94A3B8", alignSelf: "center" }}>
              {total === 0
                ? "No results"
                : <><strong style={{ color: "#0F172A" }}>{total.toLocaleString()}</strong> problems</>}
            </span>
          )}
          {isLoading && (
            <span className="ml-auto text-xs animate-pulse" style={{ color: "#F59E0B" }}>Searching…</span>
          )}
          {error && (
            <span className="ml-auto text-xs" style={{ color: "#DC2626" }}>{error}</span>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className="flex-1 px-6 pb-8 pt-4 space-y-2">
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
            <p className="font-medium text-slate-600">No problems match your search.</p>
            <p className="text-sm mt-1">Try different keywords or select another domain.</p>
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
