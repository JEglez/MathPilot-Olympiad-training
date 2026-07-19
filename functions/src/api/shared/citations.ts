// Citation extraction and validation utilities
// Per 04-mvp-implementation-roadmap.md §4 task 4.5
// Per 03-dataset-import-search.md §9.4
//
// Validates that every [prob-{uuid}] citation in the LLM response references
// a real problem in the database — prevents hallucinated citations.

import type { Pool } from "pg";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CitedProblem {
  readonly id: string;
  /** Problem title (for display in the UI) */
  readonly title: string;
  /** First 300 chars of statement_plain, for snippet preview */
  readonly snippet: string;
}

// ── Extraction ────────────────────────────────────────────────────────────────

/**
 * Extract all unique problem IDs cited in `text` using the [prob-{uuid}] format.
 *
 * @example
 *   extractCitations("See [prob-abc-123] and [prob-def-456].")
 *   // → ["abc-123", "def-456"]
 *
 * The returned IDs are the raw UUIDs (without "prob-" prefix) for direct
 * database lookup.
 */
export function extractCitations(text: string): string[] {
  // Match [prob-{uuid}] where uuid consists of hex chars and hyphens
  const pattern = /\[prob-([a-f0-9](?:[a-f0-9-]*[a-f0-9])?)\]/gi;
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(text)) !== null) {
    const id = match[1];
    if (id) seen.add(id.toLowerCase());
  }

  return Array.from(seen);
}

// ── Validation & lookup ───────────────────────────────────────────────────────

/**
 * Fetch cited problem metadata from the database.
 *
 * Only returns entries for IDs that actually exist in `problems`. Any ID the
 * LLM hallucinated will be silently omitted from the result, preventing
 * invalid citations from reaching the client.
 *
 * @param ids   UUIDs extracted by extractCitations (without "prob-" prefix)
 * @param pool  PostgreSQL connection pool
 */
export async function lookupCitations(
  ids: string[],
  pool: Pool,
): Promise<CitedProblem[]> {
  if (ids.length === 0) return [];

  const { rows } = await pool.query<{
    id: string;
    title: string;
    statement_plain: string | null;
  }>(
    `SELECT id, title, statement_plain
     FROM problems
     WHERE id = ANY($1::uuid[])`,
    [ids],
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    snippet: row.statement_plain ? row.statement_plain.slice(0, 300) : "",
  }));
}
