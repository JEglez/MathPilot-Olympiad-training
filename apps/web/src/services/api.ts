// Typed API client for MathPilot endpoints
// Base URL: VITE_API_BASE_URL env var or '/api' (proxied locally via vite.config.ts)

const BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "/api";

// ── Shared types (mirrors functions/src/api/shared/filters.ts) ──────────────

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

// ── Taxonomy types (mirrors functions/src/api/taxonomy.ts) ──────────────────

export interface TechniqueNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly cognitive_load: string;
}

export interface SubtopicNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly techniques: TechniqueNode[];
}

export interface TopicNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly subtopics: SubtopicNode[];
}

export interface TaxonomyTree {
  readonly topics: TopicNode[];
}

// ── Problem detail types (mirrors functions/src/api/problem-detail.ts) ──────

export interface Solution {
  readonly id: string;
  readonly approach_name: string;
  readonly body: string;
  readonly is_canonical: boolean;
}

export interface RelatedProblem {
  readonly id: string;
  readonly title: string;
  readonly relationship_type: string;
  readonly similarity: number | null;
}

export interface ProblemDetailResponse {
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

// ── Search filter params ─────────────────────────────────────────────────────

export interface SearchFilters {
  q?: string;
  topics?: string[];
  subtopics?: string[];
  techniques?: string[];
  competition?: string;
  level?: string;
  year_min?: number;
  year_max?: number;
  page?: number;
  page_size?: number;
}

// ── Chat types ───────────────────────────────────────────────────────────────

export type ChatMode = "exam" | "training" | "general";

export interface ChatHistoryTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface ChatRequestBody {
  readonly message: string;
  readonly history?: ChatHistoryTurn[];
  readonly filters?: Omit<SearchFilters, "q" | "page" | "page_size">;
  readonly exclude_ids?: string[];
}

export interface ChatQueryResponse {
  readonly mode: ChatMode;
  readonly summary: string;
  readonly showAnswers: boolean;
  readonly problems: ProblemCard[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      if (val.length > 0) parts.push(`${key}=${encodeURIComponent(val.join(","))}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

async function jsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── API functions ────────────────────────────────────────────────────────────

export function searchProblems(params: SearchFilters): Promise<SearchResponse> {
  const qs = buildQuery(params as Record<string, unknown>);
  return jsonFetch<SearchResponse>(`${BASE_URL}/search${qs}`);
}

export function browseProblems(params: SearchFilters): Promise<BrowseResponse> {
  const qs = buildQuery(params as Record<string, unknown>);
  return jsonFetch<BrowseResponse>(`${BASE_URL}/problems${qs}`);
}

export function getProblem(id: string): Promise<ProblemDetailResponse> {
  return jsonFetch<ProblemDetailResponse>(`${BASE_URL}/problems/${encodeURIComponent(id)}`);
}

export function getTaxonomy(): Promise<TaxonomyTree> {
  return jsonFetch<TaxonomyTree>(`${BASE_URL}/taxonomy`);
}

/**
 * Query problems from a natural-language message.
 * Returns mode, summary, and a list of matching problem cards.
 */
export async function queryProblems(body: ChatRequestBody): Promise<ChatQueryResponse> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat API ${res.status}: ${text}`);
  }

  return res.json() as Promise<ChatQueryResponse>;
}
