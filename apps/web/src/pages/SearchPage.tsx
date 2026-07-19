import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { SearchFilters } from "../services/api";
import { FilterPanel } from "../components/FilterPanel";
import { Pagination } from "../components/Pagination";
import { ProblemCard } from "../components/ProblemCard";
import { SearchBar } from "../components/SearchBar";
import { useSearch } from "../hooks/useSearch";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: SearchFilters = useMemo(() => ({
    q: searchParams.get("q") ?? undefined,
    topics: searchParams.get("topics")?.split(",").filter(Boolean) ?? undefined,
    subtopics: searchParams.get("subtopics")?.split(",").filter(Boolean) ?? undefined,
    techniques: searchParams.get("techniques")?.split(",").filter(Boolean) ?? undefined,
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
    if (next.subtopics?.length) params["subtopics"] = next.subtopics.join(",");
    if (next.techniques?.length) params["techniques"] = next.techniques.join(",");
    if (next.level) params["level"] = next.level;
    if (next.competition) params["competition"] = next.competition;
    if (next.year_min !== undefined) params["year_min"] = String(next.year_min);
    if (next.year_max !== undefined) params["year_max"] = String(next.year_max);
    if (next.page && next.page > 1) params["page"] = String(next.page);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  return (
    <div className="flex gap-5 items-start">
      {/* Filter sidebar */}
      <aside className="w-64 shrink-0 sticky top-6">
        <FilterPanel filters={filters} onChange={setFilters} />
      </aside>

      {/* Results */}
      <section className="flex-1 min-w-0 space-y-4">
        <SearchBar
          value={filters.q ?? ""}
          onChange={(q) => setFilters({ ...filters, q: q || undefined, page: 1 })}
          placeholder="Search olympiad problems…"
        />

        {/* Summary row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {isLoading ? (
            <span className="text-teal animate-pulse">Searching…</span>
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span>
              {total === 0
                ? "No results found"
                : <><strong className="text-foreground">{total.toLocaleString()}</strong> problem{total === 1 ? "" : "s"} found</>}
            </span>
          )}
        </div>

        {/* Results list */}
        {!isLoading && results.length > 0 && (
          <ul className="space-y-3 list-none p-0 m-0">
            {results.map((p) => (
              <li key={p.id}>
                <ProblemCard problem={p} />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && results.length === 0 && !error && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">∅</p>
            <p className="font-medium">No problems match your search.</p>
            <p className="text-sm">Try different keywords or adjust the filters.</p>
          </div>
        )}

        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
        />
      </section>
    </div>
  );
}

