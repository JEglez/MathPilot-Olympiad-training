// GET /api/taxonomy — Full taxonomy tree (topics → subtopics → techniques)
// Per 04-mvp-implementation-roadmap.md §3.4
// Cache-friendly: taxonomy changes rarely; consumers may cache this response.

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { Pool } from "pg";
import { internalError } from "./shared/filters.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TechniqueNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly cognitive_load: string;
}

interface SubtopicNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly techniques: TechniqueNode[];
}

interface TopicNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly subtopics: SubtopicNode[];
}

interface TaxonomyResponse {
  readonly topics: TopicNode[];
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

export async function taxonomyHandler(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const pool = getPool();

    const [topicsResult, subtopicsResult, techniquesResult] = await Promise.all([
      pool.query<{ id: string; code: string; name: string; description: string }>(
        "SELECT id, code, name, description FROM topics ORDER BY code",
      ),
      pool.query<{ id: string; topic_id: string; code: string; name: string; description: string }>(
        "SELECT id, topic_id, code, name, description FROM subtopics ORDER BY code",
      ),
      pool.query<{ id: string; subtopic_id: string; code: string; name: string; description: string; cognitive_load: string }>(
        "SELECT id, subtopic_id, code, name, description, cognitive_load FROM techniques ORDER BY code",
      ),
    ]);

    // Build tree in memory — taxonomy fits comfortably in memory (~160 techniques)
    const techniquesBySubtopic = new Map<string, TechniqueNode[]>();
    for (const tech of techniquesResult.rows) {
      const list = techniquesBySubtopic.get(tech.subtopic_id) ?? [];
      list.push({ id: tech.id, code: tech.code, name: tech.name, description: tech.description, cognitive_load: tech.cognitive_load });
      techniquesBySubtopic.set(tech.subtopic_id, list);
    }

    const subtopicsByTopic = new Map<string, SubtopicNode[]>();
    for (const sub of subtopicsResult.rows) {
      const list = subtopicsByTopic.get(sub.topic_id) ?? [];
      list.push({
        id: sub.id,
        code: sub.code,
        name: sub.name,
        description: sub.description,
        techniques: techniquesBySubtopic.get(sub.id) ?? [],
      });
      subtopicsByTopic.set(sub.topic_id, list);
    }

    const topics: TopicNode[] = topicsResult.rows.map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      subtopics: subtopicsByTopic.get(t.id) ?? [],
    }));

    const response: TaxonomyResponse = { topics };

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Taxonomy changes rarely — allow clients to cache for 1 hour
        "Cache-Control": "public, max-age=3600",
      },
      jsonBody: response,
    };
  } catch (e) {
    context.error("taxonomyHandler error", e);
    const body = internalError("An unexpected error occurred");
    return { status: 500, headers: { "Content-Type": "application/problem+json" }, jsonBody: body };
  }
}

// ── Azure Functions registration ──────────────────────────────────────────────

app.http("taxonomy", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "taxonomy",
  handler: taxonomyHandler,
});
