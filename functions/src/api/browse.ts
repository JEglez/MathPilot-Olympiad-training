// GET /api/problems — Paginated browse with taxonomy filters and facet counts
// Per 04-mvp-implementation-roadmap.md §3.2 and 03-dataset-import-search.md §8.2

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { Pool } from "pg";
import {
  BrowseParamsSchema,
  buildFilterClauses,
  rowToProblemCard,
  PROBLEM_CARD_SELECT,
  PROBLEM_CARD_JOINS,
  PROBLEM_CARD_GROUP_BY,
  validationError,
  internalError,
  type BrowseResponse,
  type FacetCount,
} from "./shared/filters.js";

// ── Singleton pool ────────────────────────────────────────────────────────────

let _pool: Pool | undefined;

function getPool(): Pool {
  if (!_pool) {
    const url = process.env["MATHPILOT_DB_URL"];
    if (!url) throw new Error("MATHPILOT_DB_URL is not set");
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function browseHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const rawParams = Object.fromEntries(request.query.entries());
  const parsed = BrowseParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    const detail = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    return problemResponse(validationError(detail));
  }

  const params = parsed.data;

  try {
    const pool = getPool();
    const offset = (params.page - 1) * params.page_size;
    // No vector params — filter placeholders start at $1
    const filterClause = buildFilterClauses(params, 1);
    const limitIdx = filterClause.nextParamIdx;
    const offsetIdx = limitIdx + 1;
    const queryValues = [...filterClause.values, params.page_size, offset];
    const countValues = [...filterClause.values];

    const [resultRows, countRow, topicFacets, competitionFacets] = await Promise.all([
      pool.query<Record<string, unknown>>(
        buildBrowseSQL(filterClause.sql, limitIdx, offsetIdx),
        queryValues,
      ),
      pool.query<{ total: string }>(
        buildCountSQL(filterClause.sql),
        countValues,
      ),
      pool.query<{ code: string; name: string; count: string }>(
        buildTopicFacetSQL(filterClause.sql),
        countValues,
      ),
      pool.query<{ code: string; name: string; count: string }>(
        buildCompetitionFacetSQL(filterClause.sql),
        countValues,
      ),
    ]);

    const total = parseInt(countRow.rows[0]?.total ?? "0", 10);

    const response: BrowseResponse = {
      // `as` cast justified: rows from a typed SQL SELECT controlled by PROBLEM_CARD_SELECT
      results: resultRows.rows.map(r => rowToProblemCard(r as unknown as Parameters<typeof rowToProblemCard>[0])),
      total,
      page: params.page,
      page_size: params.page_size,
      facets: {
        topics: topicFacets.rows.map<FacetCount>(r => ({
          code: r.code,
          name: r.name,
          count: parseInt(r.count, 10),
        })),
        competitions: competitionFacets.rows.map<FacetCount>(r => ({
          code: r.code,
          name: r.name,
          count: parseInt(r.count, 10),
        })),
      },
    };

    return { status: 200, jsonBody: response };
  } catch (e) {
    context.error("browseHandler error", e);
    return problemResponse(internalError("An unexpected error occurred"));
  }
}

// ── SQL builders ──────────────────────────────────────────────────────────────

function buildBrowseSQL(whereClause: string, limitIdx: number, offsetIdx: number): string {
  return `
SELECT ${PROBLEM_CARD_SELECT}
FROM problems p
${PROBLEM_CARD_JOINS}
${whereClause}
${PROBLEM_CARD_GROUP_BY}
ORDER BY p.created_at DESC
LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `.trim();
}

function buildCountSQL(whereClause: string): string {
  return `
SELECT COUNT(DISTINCT p.id)::text AS total
FROM problems p
${whereClause}
  `.trim();
}

function buildTopicFacetSQL(whereClause: string): string {
  return `
SELECT t.code, t.name, COUNT(DISTINCT p.id)::text AS count
FROM problems p
JOIN problem_topics ptop ON ptop.problem_id = p.id
JOIN topics t ON ptop.topic_id = t.id
${whereClause}
GROUP BY t.code, t.name
ORDER BY count DESC
  `.trim();
}

function buildCompetitionFacetSQL(whereClause: string): string {
  return `
SELECT c.abbreviation AS code, c.name, COUNT(DISTINCT p.id)::text AS count
FROM problems p
JOIN competitions c ON p.source_competition_id = c.id
${whereClause}
GROUP BY c.abbreviation, c.name
ORDER BY count DESC
  `.trim();
}

// ── Helper ────────────────────────────────────────────────────────────────────

function problemResponse(body: ReturnType<typeof validationError>): HttpResponseInit {
  return { status: body.status, headers: { "Content-Type": "application/problem+json" }, jsonBody: body };
}

// ── Azure Functions registration ──────────────────────────────────────────────

app.http("browse", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "problems",
  handler: browseHandler,
});
