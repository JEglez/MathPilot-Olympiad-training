// GET /api/problems/:id — Single problem detail with solutions, techniques, related problems
// Per 04-mvp-implementation-roadmap.md §3.3 and 03-dataset-import-search.md §7.3 (Example 2)

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { Pool } from "pg";
import { notFoundError, internalError } from "./shared/filters.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Solution {
  readonly id: string;
  readonly approach_name: string;
  readonly body: string;
  readonly is_canonical: boolean;
}

interface RelatedProblem {
  readonly id: string;
  readonly title: string;
  readonly relationship_type: string;
  readonly similarity: number | null;
}

interface ProblemDetail {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly answer: string | null;
  readonly competition: string | null;
  readonly source_year: number | null;
  readonly source_round: string | null;
  readonly language: string;
  readonly competition_level: string | null;
  readonly proof_style: string | null;
  readonly creativity_demand: string | null;
  readonly technique_depth: string | null;
  readonly entry_barrier: string | null;
  readonly topics: Array<{ code: string; name: string }>;
  readonly subtopics: Array<{ code: string; name: string }>;
  readonly techniques: Array<{ code: string; name: string; cognitive_load: string; is_primary: boolean }>;
  readonly solutions: Solution[];
  readonly related_problems: RelatedProblem[];
}

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

export async function problemDetailHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // Azure Functions v4 route params are in request.params
  const id = request.params["id"];

  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return problemResponse(notFoundError("Problem id is required"));
  }

  try {
    const pool = getPool();

    const [problemRow, solutionRows, relatedRows] = await Promise.all([
      pool.query<Record<string, unknown>>(PROBLEM_DETAIL_SQL, [id]),
      pool.query<Solution>(SOLUTIONS_SQL, [id]),
      pool.query<{
        related_id: string;
        title: string;
        relationship_type: string;
        similarity: number | null;
      }>(RELATED_SQL, [id]),
    ]);

    if (problemRow.rows.length === 0) {
      return problemResponse(notFoundError(`Problem '${id}' not found`));
    }

    const raw = problemRow.rows[0];
    if (!raw) {
      return problemResponse(notFoundError(`Problem '${id}' not found`));
    }

    const detail: ProblemDetail = {
      // `as` casts justified: columns are typed by the SQL SELECT below
      id: raw["id"] as string,
      title: raw["title"] as string,
      statement: raw["statement"] as string,
      answer: raw["answer"] as string | null,
      competition: raw["competition"] as string | null,
      source_year: raw["source_year"] as number | null,
      source_round: raw["source_round"] as string | null,
      language: raw["language"] as string,
      competition_level: raw["competition_level"] as string | null,
      proof_style: raw["proof_style"] as string | null,
      creativity_demand: raw["creativity_demand"] as string | null,
      technique_depth: raw["technique_depth"] as string | null,
      entry_barrier: raw["entry_barrier"] as string | null,
      topics: (raw["topics"] as Array<{ code: string; name: string }> | null) ?? [],
      subtopics: (raw["subtopics"] as Array<{ code: string; name: string }> | null) ?? [],
      techniques: (raw["techniques"] as Array<{ code: string; name: string; cognitive_load: string; is_primary: boolean }> | null) ?? [],
      solutions: solutionRows.rows,
      related_problems: relatedRows.rows.map(r => ({
        id: r.related_id,
        title: r.title,
        relationship_type: r.relationship_type,
        similarity: r.similarity,
      })),
    };

    return { status: 200, jsonBody: detail };
  } catch (e) {
    context.error("problemDetailHandler error", e);
    return problemResponse(internalError("An unexpected error occurred"));
  }
}

// ── SQL ───────────────────────────────────────────────────────────────────────

const PROBLEM_DETAIL_SQL = `
SELECT
  p.id, p.title, p.statement, p.answer,
  p.source_year, p.source_round, p.language,
  p.competition_level, p.proof_style,
  p.creativity_demand, p.technique_depth, p.entry_barrier,
  c.abbreviation AS competition,
  json_agg(DISTINCT jsonb_build_object('code', top.code, 'name', top.name))
    FILTER (WHERE top.code IS NOT NULL) AS topics,
  json_agg(DISTINCT jsonb_build_object('code', sub.code, 'name', sub.name))
    FILTER (WHERE sub.code IS NOT NULL) AS subtopics,
  json_agg(DISTINCT jsonb_build_object(
    'code', tech.code, 'name', tech.name,
    'cognitive_load', tech.cognitive_load,
    'is_primary', pt.is_primary
  )) FILTER (WHERE tech.code IS NOT NULL) AS techniques
FROM problems p
LEFT JOIN competitions c ON p.source_competition_id = c.id
LEFT JOIN problem_topics ptop ON p.id = ptop.problem_id
LEFT JOIN topics top ON ptop.topic_id = top.id
LEFT JOIN problem_subtopics psub ON p.id = psub.problem_id
LEFT JOIN subtopics sub ON psub.subtopic_id = sub.id
LEFT JOIN problem_techniques pt ON p.id = pt.problem_id
LEFT JOIN techniques tech ON pt.technique_id = tech.id
WHERE p.id = $1
GROUP BY p.id, c.abbreviation
`.trim();

const SOLUTIONS_SQL = `
SELECT id, approach_name, body, is_canonical
FROM solutions
WHERE problem_id = $1
ORDER BY is_canonical DESC, id
`.trim();

/** Curated relationships + vector-based similar problems (top 5 each, merged) */
const RELATED_SQL = `
WITH curated AS (
  SELECT
    CASE WHEN pr.problem_a_id = $1 THEN pr.problem_b_id ELSE pr.problem_a_id END AS related_id,
    pr.relationship_type,
    NULL::float AS similarity
  FROM problem_relationships pr
  WHERE pr.problem_a_id = $1 OR pr.problem_b_id = $1
  LIMIT 5
),
similar AS (
  SELECT
    p.id AS related_id,
    'similar' AS relationship_type,
    1 - (p.statement_vector <=> src.statement_vector) AS similarity
  FROM problems p,
       (SELECT statement_vector FROM problems WHERE id = $1) src
  WHERE p.id != $1
  ORDER BY p.statement_vector <=> src.statement_vector
  LIMIT 5
),
merged AS (
  SELECT * FROM curated
  UNION
  SELECT * FROM similar
  WHERE related_id NOT IN (SELECT related_id FROM curated)
)
SELECT m.related_id, p.title, m.relationship_type, m.similarity
FROM merged m
JOIN problems p ON m.related_id = p.id
ORDER BY m.similarity DESC NULLS LAST
LIMIT 10
`.trim();

// ── Helper ────────────────────────────────────────────────────────────────────

function problemResponse(body: ReturnType<typeof notFoundError>): HttpResponseInit {
  return { status: body.status, headers: { "Content-Type": "application/problem+json" }, jsonBody: body };
}

// ── Azure Functions registration ──────────────────────────────────────────────

app.http("problem-detail", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "problems/{id}",
  handler: problemDetailHandler,
});
