// Shared SQL filter builder and Zod schemas for search + browse endpoints
// Per 04-mvp-implementation-roadmap.md §3 and 03-dataset-import-search.md §8.2

import { z } from "zod";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const COMPETITION_LEVELS = ["local", "state", "national", "international"] as const;

/** Comma-separated string → string array transform */
const csvArray = z.string().transform(s =>
  s.split(",").map(c => c.trim()).filter(c => c.length > 0),
);

export const SearchParamsSchema = z.object({
  q: z.string().trim().min(1).optional(),
  topics: csvArray.optional(),
  subtopics: csvArray.optional(),
  techniques: csvArray.optional(),
  competition: z.string().trim().optional(),
  level: z.enum(COMPETITION_LEVELS).optional(),
  year_min: z.coerce.number().int().positive().optional(),
  year_max: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20),
});

export const BrowseParamsSchema = SearchParamsSchema;

export type ParsedSearchParams = z.infer<typeof SearchParamsSchema>;

// ── Response types (§8.5 shape) ───────────────────────────────────────────────

export interface TechniqueRef {
  readonly code: string;
  readonly name: string;
  readonly cognitive_load: string;
}

export interface TopicRef {
  readonly code: string;
  readonly name: string;
}

export interface ProblemCard {
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
  readonly topics: TopicRef[];
  readonly techniques: TechniqueRef[];
  readonly search_score?: number;
}

export interface SearchResponse {
  readonly results: ProblemCard[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
}

export interface FacetCount {
  readonly code: string;
  readonly name: string;
  readonly count: number;
}

export interface BrowseResponse {
  readonly results: ProblemCard[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
  readonly facets: {
    readonly topics: FacetCount[];
    readonly competitions: FacetCount[];
  };
}

// ── SQL filter builder ────────────────────────────────────────────────────────

export interface FilterClause {
  /** SQL fragment starting with WHERE (or empty string if no filters) */
  readonly sql: string;
  /** Parameter values, in order matching the placeholders */
  readonly values: unknown[];
  /** The next available $N placeholder index */
  readonly nextParamIdx: number;
}

/**
 * Builds a SQL WHERE clause from parsed search/browse params.
 * All clauses use `p` as the problems table alias.
 *
 * @param params  Validated search/browse parameters
 * @param startIdx  First $N placeholder index (e.g. 3 if $1 and $2 are already used)
 */
export function buildFilterClauses(
  params: ParsedSearchParams,
  startIdx: number,
): FilterClause {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = startIdx;

  if (params.topics !== undefined && params.topics.length > 0) {
    conditions.push(
      `EXISTS (` +
        `SELECT 1 FROM problem_topics _pt ` +
        `JOIN topics _t ON _pt.topic_id = _t.id ` +
        `WHERE _pt.problem_id = p.id AND _t.code = ANY($${idx})` +
      `)`,
    );
    values.push(params.topics);
    idx++;
  }

  if (params.subtopics !== undefined && params.subtopics.length > 0) {
    conditions.push(
      `EXISTS (` +
        `SELECT 1 FROM problem_subtopics _ps ` +
        `JOIN subtopics _s ON _ps.subtopic_id = _s.id ` +
        `WHERE _ps.problem_id = p.id AND _s.code = ANY($${idx})` +
      `)`,
    );
    values.push(params.subtopics);
    idx++;
  }

  if (params.techniques !== undefined && params.techniques.length > 0) {
    conditions.push(
      `EXISTS (` +
        `SELECT 1 FROM problem_techniques _ptech ` +
        `JOIN techniques _tech ON _ptech.technique_id = _tech.id ` +
        `WHERE _ptech.problem_id = p.id AND _tech.code = ANY($${idx})` +
      `)`,
    );
    values.push(params.techniques);
    idx++;
  }

  if (params.level !== undefined) {
    conditions.push(`p.competition_level = $${idx}`);
    values.push(params.level);
    idx++;
  }

  if (params.competition !== undefined) {
    conditions.push(
      `EXISTS (` +
        `SELECT 1 FROM competitions _c2 ` +
        `WHERE _c2.id = p.source_competition_id AND _c2.abbreviation = $${idx}` +
      `)`,
    );
    values.push(params.competition);
    idx++;
  }

  if (params.year_min !== undefined) {
    conditions.push(`p.source_year >= $${idx}`);
    values.push(params.year_min);
    idx++;
  }

  if (params.year_max !== undefined) {
    conditions.push(`p.source_year <= $${idx}`);
    values.push(params.year_max);
    idx++;
  }

  const sql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { sql, values, nextParamIdx: idx };
}

// ── RFC 9457 error helpers ────────────────────────────────────────────────────

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
}

export function validationError(detail: string): ProblemDetail {
  return {
    type: "https://mathpilot.dev/errors/validation",
    title: "Validation Error",
    status: 400,
    detail,
  };
}

export function notFoundError(detail: string): ProblemDetail {
  return {
    type: "https://mathpilot.dev/errors/not-found",
    title: "Not Found",
    status: 404,
    detail,
  };
}

export function internalError(detail: string): ProblemDetail {
  return {
    type: "https://mathpilot.dev/errors/internal",
    title: "Internal Server Error",
    status: 500,
    detail,
  };
}

// ── SELECT fragment shared by search + browse ─────────────────────────────────

/** Full SELECT list for problem cards — requires p, c, tech, top aliases */
export const PROBLEM_CARD_SELECT = `
  p.id, p.title, p.statement, p.answer,
  p.source_year, p.source_round, p.language,
  p.competition_level, p.proof_style,
  p.creativity_demand, p.technique_depth, p.entry_barrier,
  c.abbreviation AS competition,
  json_agg(DISTINCT jsonb_build_object(
    'code', tech.code, 'name', tech.name, 'cognitive_load', tech.cognitive_load
  )) FILTER (WHERE tech.code IS NOT NULL) AS techniques,
  json_agg(DISTINCT jsonb_build_object(
    'code', top.code, 'name', top.name
  )) FILTER (WHERE top.code IS NOT NULL) AS topics
`.trim();

/** LEFT JOINs needed by PROBLEM_CARD_SELECT (requires p alias) */
export const PROBLEM_CARD_JOINS = `
  LEFT JOIN competitions c ON p.source_competition_id = c.id
  LEFT JOIN problem_techniques pt ON p.id = pt.problem_id
  LEFT JOIN techniques tech ON pt.technique_id = tech.id
  LEFT JOIN problem_topics ptop ON p.id = ptop.problem_id
  LEFT JOIN topics top ON ptop.topic_id = top.id
`.trim();

/** GROUP BY needed when using json_agg in PROBLEM_CARD_SELECT */
export const PROBLEM_CARD_GROUP_BY = `GROUP BY p.id, c.abbreviation`;

// ── DB row → ProblemCard mapper ───────────────────────────────────────────────

interface RawProblemRow {
  id: string;
  title: string;
  statement: string;
  answer: string | null;
  competition: string | null;
  source_year: number | null;
  source_round: string | null;
  language: string;
  competition_level: string | null;
  proof_style: string | null;
  creativity_demand: string | null;
  technique_depth: string | null;
  entry_barrier: string | null;
  techniques: unknown;
  topics: unknown;
  search_score?: number | null;
}

export function rowToProblemCard(row: RawProblemRow): ProblemCard {
  return {
    id: row.id,
    title: row.title,
    statement: row.statement,
    answer: row.answer,
    competition: row.competition,
    source_year: row.source_year,
    source_round: row.source_round,
    language: row.language,
    competition_level: row.competition_level,
    proof_style: row.proof_style,
    creativity_demand: row.creativity_demand,
    technique_depth: row.technique_depth,
    entry_barrier: row.entry_barrier,
    topics: Array.isArray(row.topics) ? (row.topics as TopicRef[]) : [],
    techniques: Array.isArray(row.techniques) ? (row.techniques as TechniqueRef[]) : [],
    ...(row.search_score != null ? { search_score: row.search_score } : {}),
  };
}
