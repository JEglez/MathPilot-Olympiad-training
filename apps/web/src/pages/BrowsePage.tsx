import { useCallback, useEffect, useState } from "react";
import type { BrowseResponse, FacetCount, SearchFilters } from "../services/api";
import { browseProblems } from "../services/api";
import { FilterPanel } from "../components/FilterPanel";
import { Pagination } from "../components/Pagination";
import { ProblemCard } from "../components/ProblemCard";
import styles from "./BrowsePage.module.css";

const DEFAULT_PAGE_SIZE = 20;

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

  const updateFilters = useCallback((next: SearchFilters) => {
    setFilters({ ...next, page_size: DEFAULT_PAGE_SIZE });
  }, []);

  function handleFacetClick(facet: FacetCount) {
    setFilters((prev) => ({
      ...prev,
      topics: [facet.code],
      page: 1,
    }));
  }

  const topicFacets = data?.facets.topics ?? [];
  const competitionFacets = data?.facets.competitions ?? [];

  return (
    <div className={styles.layout}>
      <aside className={styles.leftSidebar}>
        <FilterPanel filters={filters} onChange={updateFilters} />
      </aside>

      <section className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Browse Problems</h1>
          {data && (
            <span className={styles.total}>
              {data.total.toLocaleString()} problem{data.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {isLoading ? (
          <p className={styles.loading}>Loading…</p>
        ) : (
          <ul className={styles.list}>
            {(data?.results ?? []).map((p) => (
              <li key={p.id}>
                <ProblemCard problem={p} />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && data?.results.length === 0 && (
          <p className={styles.empty}>No problems match the current filters.</p>
        )}

        <Pagination
          page={filters.page ?? 1}
          total={data?.total ?? 0}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
        />
      </section>

      <aside className={styles.rightSidebar}>
        {topicFacets.length > 0 && (
          <div className={styles.facetGroup}>
            <h3 className={styles.facetTitle}>Topics</h3>
            <ul className={styles.facetList}>
              {topicFacets.map((f) => (
                <li key={f.code}>
                  <button
                    className={`${styles.facetBtn} ${
                      filters.topics?.includes(f.code) ? styles.facetActive : ""
                    }`}
                    onClick={() => handleFacetClick(f)}
                    type="button"
                  >
                    <span>{f.name}</span>
                    <span className={styles.facetCount}>{f.count.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {competitionFacets.length > 0 && (
          <div className={styles.facetGroup}>
            <h3 className={styles.facetTitle}>Competitions</h3>
            <ul className={styles.facetList}>
              {competitionFacets.map((f) => (
                <li key={f.code}>
                  <button
                    className={`${styles.facetBtn} ${
                      filters.competition === f.code ? styles.facetActive : ""
                    }`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        competition: f.code,
                        page: 1,
                      }))
                    }
                    type="button"
                  >
                    <span>{f.name}</span>
                    <span className={styles.facetCount}>{f.count.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
