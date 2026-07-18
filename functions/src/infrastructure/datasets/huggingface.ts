// HuggingFace Datasets Server API adapter
// Handles pagination, rate-limit retries, and optional local disk caching
// Per 03-dataset-import-search.md §4.0

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { z } from "zod";

const HFPageSchema = z.object({
  rows: z.array(z.object({ row: z.unknown() })).default([]),
});

export interface FetchPageEvent {
  readonly offset: number;
  readonly got: number;
  readonly total: number;
}

export interface FetchOptions {
  /** Hard cap on total rows fetched (useful for very large datasets like NuminaMath). */
  readonly maxRows?: number;
  /** Base delay in ms between pages to avoid rate limits. Default: 200ms. */
  readonly pageDelayMs?: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, maxRetries = 5): Promise<Response> {
  let delayMs = 10_000; // start at 10s — HuggingFace rate limits require longer waits
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url);
    // Retry on 429 (rate limit) and 5xx (transient server errors)
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (attempt === maxRetries) throw new Error(`HuggingFace ${res.status} after ${maxRetries} retries: ${url}`);
      // Respect Retry-After header if present, otherwise exponential backoff
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
      await sleep(waitMs);
      delayMs = Math.min(delayMs * 2, 60_000);
      continue;
    }
    return res;
  }
  throw new Error(`fetchWithRetry: unreachable`);
}

/**
 * Fetch rows from a HuggingFace Datasets Server URL (paginated, 100 rows/page).
 * The HuggingFace Datasets Server API enforces a max of 100 rows per request.
 * Automatically retries on 429 with exponential backoff.
 * Writes a local JSON cache on first fetch; subsequent calls return the cached file.
 * Returns raw `unknown[]` — callers must validate with their own Zod schema.
 */
export async function fetchHuggingFaceDataset(
  source: string,
  baseUrl: string,
  cacheDir: string,
  onPage?: (event: FetchPageEvent) => void,
  options?: FetchOptions,
): Promise<unknown[]> {
  const cacheFile = `${cacheDir}/${source}.json`;
  mkdirSync(cacheDir, { recursive: true });

  if (existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, "utf-8")) as unknown[];
  }

  const all: unknown[] = [];
  const PAGE = 100; // HuggingFace Datasets Server max is 100 rows/request
  const maxRows = options?.maxRows ?? Infinity;
  const pageDelayMs = options?.pageDelayMs ?? 200;
  let offset = 0;

  while (all.length < maxRows) {
    const length = Math.min(PAGE, maxRows - all.length);
    const url = `${baseUrl}&offset=${offset}&length=${length}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${url}`);
    const page = HFPageSchema.parse(await res.json());
    const rows = page.rows.map(r => r.row);
    all.push(...rows);
    onPage?.({ offset, got: rows.length, total: all.length });
    if (rows.length < PAGE) break;
    offset += PAGE;
    if (pageDelayMs > 0) await sleep(pageDelayMs);
  }

  writeFileSync(cacheFile, JSON.stringify(all), "utf-8");
  return all;
}
