import { useEffect, useRef, useState } from "react";
import type { BrowseResponse, ProblemCard, SearchFilters, SearchResponse } from "../services/api";
import { browseProblems, searchProblems } from "../services/api";

interface UseSearchResult {
  readonly results: ProblemCard[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly isLoading: boolean;
  readonly error: string | null;
}

/**
 * Debounced search hook.
 * Returns search results, loading state, and error.
 */
export function useSearch(filters: SearchFilters, debounceMs = 300): UseSearchResult {
  const [data, setData] = useState<SearchResponse | BrowseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setIsLoading(true);
      setError(null);

      // Use browse endpoint when no query text — /api/search requires q
      const request = filters.q?.trim()
        ? searchProblems(filters)
        : browseProblems(filters);

      request
        .then((res) => {
          if (!ctrl.signal.aborted) {
            setData(res);
          }
        })
        .catch((e: unknown) => {
          if (!ctrl.signal.aborted) {
            setError(e instanceof Error ? e.message : "Search failed");
          }
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setIsLoading(false);
        });
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [filters, debounceMs]);

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? (filters.page ?? 1),
    pageSize: data?.page_size ?? (filters.page_size ?? 20),
    isLoading,
    error,
  };
}
