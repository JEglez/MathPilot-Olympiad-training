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

export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface ChatRequestBody {
  readonly message: string;
  readonly history?: ChatMessage[];
  readonly filters?: Omit<SearchFilters, "q" | "page" | "page_size">;
}

export interface CitedProblem {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly competition: string | null;
  readonly source_year: number | null;
  readonly topics: TopicRef[];
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
  return jsonFetch<BrowseResponse>(`${BASE_URL}/browse${qs}`);
}

export function getProblem(id: string): Promise<ProblemDetailResponse> {
  return jsonFetch<ProblemDetailResponse>(`${BASE_URL}/problems/${encodeURIComponent(id)}`);
}

export function getTaxonomy(): Promise<TaxonomyTree> {
  return jsonFetch<TaxonomyTree>(`${BASE_URL}/taxonomy`);
}

/**
 * Streams a chat response via SSE.
 * Calls onChunk for each content delta, onCitations when citation data arrives.
 */
export async function streamChat(
  body: ChatRequestBody,
  onChunk: (delta: string) => void,
  onCitations: (citations: CitedProblem[]) => void,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat API ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep incomplete last line in buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        "type" in parsed
      ) {
        const event = parsed as { type: string; delta?: string; citations?: CitedProblem[] };
        if (event.type === "delta" && typeof event.delta === "string") {
          onChunk(event.delta);
        } else if (event.type === "citations" && Array.isArray(event.citations)) {
          onCitations(event.citations);
        }
      }
    }
  }
}
