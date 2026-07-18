// GET /api/search — Hybrid search (tsvector + pgvector + RRF)
// Per 03-dataset-import-search.md §7.0, §8.2, §8.3
// RRF = Reciprocal Rank Fusion (k=60): combines full-text rank + vector rank
//
// Degraded mode: when the embedding service is unavailable (circuit open),
// falls back to tsvector full-text-only search. Per constitution §2.2.

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { Pool } from "pg";
import { OpenAIEmbedder } from "../infrastructure/ai/embedder.js";
import type { EmbeddingGenerator } from "../domain/shared/embedding-generator.js";
import {
  SearchParamsSchema,
  buildFilterClauses,
  rowToProblemCard,
  PROBLEM_CARD_SELECT,
  PROBLEM_CARD_JOINS,
  PROBLEM_CARD_GROUP_BY,
  validationError,
  internalError,
  type SearchResponse,
} from "./shared/filters.js";

// ── Singletons (reused across warm invocations) ───────────────────────────────

let _pool: Pool | undefined;
let _embedder: EmbeddingGenerator | undefined;

function getPool(): Pool {
  if (!_pool) {
    const url = process.env["MATHPILOT_DB_URL"];
    if (!url) throw new Error("MATHPILOT_DB_URL is not set");
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

function getEmbedder(): EmbeddingGenerator {
  if (!_embedder) {
    const endpoint = process.env["MATHPILOT_OPENAI_ENDPOINT"];
    const apiKey = process.env["MATHPILOT_OPENAI_KEY"];
    const modelId = process.env["MATHPILOT_EMBEDDING_MODEL"];
    if (!endpoint || !apiKey || !modelId) {
      throw new Error("MATHPILOT_OPENAI_ENDPOINT, MATHPILOT_OPENAI_KEY, and MATHPILOT_EMBEDDING_MODEL must all be set");
    }
    _embedder = new OpenAIEmbedder({ endpoint, apiKey, modelId });
  }
  return _embedder;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function searchHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const rawParams = Object.fromEntries(request.query.entries());
  const parsed = SearchParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    const detail = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    return problemResponse(validationError(detail));
  }

  const params = parsed.data;

  if (!params.q) {
    return problemResponse(validationError("q is required for /api/search; use /api/problems for browse"));
  }

  try {
    // Attempt embedding — returns null if circuit is open (degraded mode)
    let queryVector: number[] | null = null;
    try {
      queryVector = await getEmbedder().embed(params.q);
    } catch (embedErr) {
      context.warn("Embedding failed, degrading to text-only search", embedErr);
    }

    const pool = getPool();
    const offset = (params.page - 1) * params.page_size;
    // $1 = vectorLiteral or unused, $2 = tsquery text; filters start at $3
    const filterClause = buildFilterClauses(params, 3);
    const baseValues: unknown[] = [
      queryVector != null ? `[${queryVector.join(",")}]` : null,
      params.q,
      ...filterClause.values,
    ];
    // $N+1, $N+2 = LIMIT, OFFSET (safe integers validated by Zod)
    const limitIdx = filterClause.nextParamIdx;
    const offsetIdx = limitIdx + 1;
    const queryValues = [...baseValues, params.page_size, offset];

    const sql = queryVector != null
      ? buildHybridSearchSQL(filterClause.sql, limitIdx, offsetIdx)
      : buildTextOnlySearchSQL(filterClause.sql, limitIdx, offsetIdx);

    const countSql = queryVector != null
      ? buildCountSQL(filterClause.sql)
      : buildTextOnlyCountSQL(filterClause.sql);

    const { rows } = await pool.query<Record<string, unknown>>(sql, queryValues);
    const countResult = await pool.query<{ total: string }>(countSql, baseValues);
    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

    const response: SearchResponse = {
      // `as` cast is justified: rows come from a typed SQL SELECT; structure is
      // controlled by PROBLEM_CARD_SELECT fragment and validated by rowToProblemCard.
      results: rows.map(r => rowToProblemCard(r as unknown as Parameters<typeof rowToProblemCard>[0])),
      total,
      page: params.page,
      page_size: params.page_size,
    };

    return { status: 200, jsonBody: response };
  } catch (e) {
    context.error("searchHandler error", e);
    return problemResponse(internalError("An unexpected error occurred"));
  }
}

// ── SQL builders ──────────────────────────────────────────────────────────────

/** Hybrid RRF search — used when embedding succeeds */
function buildHybridSearchSQL(whereClause: string, limitIdx: number, offsetIdx: number): string {
  // NOTE: Filters are applied AFTER the global top-50 candidate selection, per §8.3.
  // This means a problem matching the filter but outside the unfiltered top 50 may
  // be missed. Acceptable at MVP scale; revisit if recall complaints arise.
  return `
WITH text_results AS (
  SELECT p.id,
         ts_rank(p.search_tsv, q) AS text_score,
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
${PROBLEM_CARD_GROUP_BY}
ORDER BY rrf.rrf_score DESC
LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `.trim();
}

/** Text-only fallback — used when embedding is unavailable (degraded mode) */
function buildTextOnlySearchSQL(whereClause: string, limitIdx: number, offsetIdx: number): string {
  return `
SELECT ${PROBLEM_CARD_SELECT},
       ts_rank(p.search_tsv, q) AS search_score
FROM problems p,
     plainto_tsquery('english', $2) q
${PROBLEM_CARD_JOINS}
${whereClause ? `${whereClause} AND p.search_tsv @@ q` : "WHERE p.search_tsv @@ q"}
${PROBLEM_CARD_GROUP_BY}
ORDER BY search_score DESC
LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `.trim();
}

function buildCountSQL(whereClause: string): string {
  return `
WITH text_results AS (
  SELECT p.id
  FROM problems p, plainto_tsquery('english', $2) q
  WHERE p.search_tsv @@ q
  LIMIT 50
),
vector_results AS (
  SELECT p.id
  FROM problems p
  ORDER BY p.statement_vector <=> $1::vector
  LIMIT 50
),
rrf_ids AS (
  SELECT COALESCE(t.id, v.id) AS id
  FROM text_results t
  FULL OUTER JOIN vector_results v ON t.id = v.id
)
SELECT COUNT(DISTINCT p.id)::text AS total
FROM rrf_ids
JOIN problems p ON rrf_ids.id = p.id
${whereClause}
  `.trim();
}

function buildTextOnlyCountSQL(whereClause: string): string {
  return `
SELECT COUNT(DISTINCT p.id)::text AS total
FROM problems p,
     plainto_tsquery('english', $2) q
${whereClause ? `${whereClause} AND p.search_tsv @@ q` : "WHERE p.search_tsv @@ q"}
  `.trim();
}

// ── Helper ────────────────────────────────────────────────────────────────────

function problemResponse(body: ReturnType<typeof validationError>): HttpResponseInit {
  return { status: body.status, headers: { "Content-Type": "application/problem+json" }, jsonBody: body };
}

// ── Azure Functions registration ──────────────────────────────────────────────

app.http("search", {
  methods: ["GET"],
  authLevel: "anonymous", // TODO: restrict before production; anonymous exposes billable AI work
  route: "search",
  handler: searchHandler,
});


