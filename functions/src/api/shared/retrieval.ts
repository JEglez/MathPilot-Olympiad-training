// Shared retrieval module — hybrid search for RAG chat context
// Reuses buildFilterClauses, PROBLEM_CARD_SELECT, and related fragments from filters.ts
// Per 04-mvp-implementation-roadmap.md §4 task 4.2
//
// Degraded mode: falls back to text-only search when embedding is unavailable,
// same as search.ts, per constitution §2.2.

import type { Pool } from "pg";
import type { EmbeddingGenerator } from "../../domain/shared/embedding-generator.js";
import {
  buildFilterClauses,
  rowToProblemCard,
  PROBLEM_CARD_SELECT,
  PROBLEM_CARD_JOINS,
  PROBLEM_CARD_GROUP_BY_RRF,
  PROBLEM_CARD_GROUP_BY,
  type ProblemCard,
} from "./filters.js";
import { z } from "zod";

// ── Chat filter schema (subset of SearchParamsSchema — no pagination/query) ───

const COMPETITION_LEVELS = ["local", "state", "national", "international"] as const;

const csvArray = z.string().transform(s =>
  s.split(",").map(c => c.trim()).filter(c => c.length > 0),
);

export const ChatFiltersSchema = z.object({
  topics: csvArray.optional(),
  subtopics: csvArray.optional(),
  techniques: csvArray.optional(),
  competition: z.string().trim().optional(),
  level: z.enum(COMPETITION_LEVELS).optional(),
  year_min: z.coerce.number().int().positive().optional(),
  year_max: z.coerce.number().int().positive().optional(),
});

export type ChatFilters = z.infer<typeof ChatFiltersSchema>;

// ── Retrieval ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the top-K problems most relevant to the query, using hybrid search
 * (tsvector full-text + pgvector cosine similarity + RRF rank fusion).
 *
 * Fetches a wider candidate pool (topK × 4), excludes already-seen IDs,
 * then shuffles and trims to topK — so repeated identical queries return
 * different problems and follow-up prompts never repeat seen problems.
 *
 * Falls back to text-only search when the embedder returns null (circuit open).
 * Returns at most `topK` problems; may return fewer if insufficient results exist.
 */
export async function retrieveProblems(
  query: string,
  filters: ChatFilters,
  topK: number,
  pool: Pool,
  embedder: EmbeddingGenerator,
  excludeIds: string[] = [],
): Promise<ProblemCard[]> {
  // Fetch a wider candidate pool so we have room to exclude and shuffle
  const candidateK = Math.max(topK * 4, topK + excludeIds.length + 10);

  const filterParams = {
    ...filters,
    q: query,
    page: 1,
    page_size: candidateK,
  };

  let queryVector: number[] | null = null;
  try {
    queryVector = await embedder.embed(query);
  } catch {
    // Degrade to text-only search
  }

  const filterClause = buildFilterClauses(filterParams, 3);
  const limitIdx = filterClause.nextParamIdx;
  const queryValues: unknown[] = [
    queryVector != null ? `[${queryVector.join(",")}]` : null,
    query,
    ...filterClause.values,
    candidateK,
  ];

  const sql = queryVector != null
    ? buildHybridRetrievalSQL(filterClause.sql, limitIdx)
    : buildTextOnlyRetrievalSQL(filterClause.sql, limitIdx);

  const { rows } = await pool.query<Record<string, unknown>>(sql, queryValues);
  const candidates = rows.map(r =>
    rowToProblemCard(r as unknown as Parameters<typeof rowToProblemCard>[0]),
  );

  // Exclude already-seen problems, then shuffle, then take topK
  const excludeSet = new Set(excludeIds);
  const fresh = candidates.filter(p => !excludeSet.has(p.id));
  shuffle(fresh);
  return fresh.slice(0, topK);
}

// ── SQL builders ──────────────────────────────────────────────────────────────

function buildHybridRetrievalSQL(whereClause: string, limitIdx: number): string {
  return `
WITH text_results AS (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY ts_rank(p.search_tsv, q) DESC) AS text_rank
  FROM problems p, plainto_tsquery('english', $2) q
  WHERE p.search_tsv @@ q
  LIMIT 50
),
vector_results AS (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY p.statement_vector <=> $1::vector) AS vector_rank
  FROM problems p
  ORDER BY p.statement_vector <=> $1::vector
  LIMIT 50
),
rrf AS (
  SELECT COALESCE(t.id, v.id) AS id,
         COALESCE(1.0 / (60 + t.text_rank), 0) +
         COALESCE(1.0 / (60 + v.vector_rank), 0) AS rrf_score
  FROM text_results t
  FULL OUTER JOIN vector_results v ON t.id = v.id
)
SELECT ${PROBLEM_CARD_SELECT},
       rrf.rrf_score AS search_score
FROM rrf
JOIN problems p ON rrf.id = p.id
${PROBLEM_CARD_JOINS}
${whereClause}
${PROBLEM_CARD_GROUP_BY_RRF}
ORDER BY rrf.rrf_score DESC
LIMIT $${limitIdx}
  `.trim();
}

function buildTextOnlyRetrievalSQL(whereClause: string, limitIdx: number): string {
  return `
SELECT ${PROBLEM_CARD_SELECT},
       ts_rank(p.search_tsv, q) AS search_score
FROM problems p,
     plainto_tsquery('english', $2) q
${PROBLEM_CARD_JOINS}
${whereClause ? `${whereClause} AND p.search_tsv @@ q` : "WHERE p.search_tsv @@ q"}
${PROBLEM_CARD_GROUP_BY}
ORDER BY search_score DESC
LIMIT $${limitIdx}
  `.trim();
}

// Fisher-Yates in-place shuffle
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
}
