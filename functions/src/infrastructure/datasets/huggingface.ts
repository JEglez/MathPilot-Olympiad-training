// HuggingFace Datasets Server API adapter
// Handles pagination and optional local disk caching to avoid re-fetching during development
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

/**
 * Fetch all rows from a HuggingFace Datasets Server URL (paginated, 100 rows/page).
 * The HuggingFace Datasets Server API enforces a max of 100 rows per request.
 * Writes a local JSON cache on first fetch; subsequent calls return the cached file.
 * Returns raw `unknown[]` — callers must validate with their own Zod schema.
 */
export async function fetchHuggingFaceDataset(
  source: string,
  baseUrl: string,
  cacheDir: string,
  onPage?: (event: FetchPageEvent) => void,
): Promise<unknown[]> {
  const cacheFile = `${cacheDir}/${source}.json`;
  mkdirSync(cacheDir, { recursive: true });

  if (existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, "utf-8")) as unknown[];
  }

  const all: unknown[] = [];
  const PAGE = 100; // HuggingFace Datasets Server max is 100 rows/request
  let offset = 0;

  while (true) {
    const url = `${baseUrl}&offset=${offset}&length=${PAGE}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${url}`);
    const page = HFPageSchema.parse(await res.json());
    const rows = page.rows.map(r => r.row);
    all.push(...rows);
    onPage?.({ offset, got: rows.length, total: all.length });
    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  writeFileSync(cacheFile, JSON.stringify(all), "utf-8");
  return all;
}
