// Omni-MATH source adapter
// Source: HuggingFace KbsdJames/Omni-MATH (Apache-2.0)
// ~4,428 records, JSONL/Parquet, best field coverage
// Per 03-dataset-import-search.md §5.2

import { z } from "zod";
import type { CanonicalProblem, SourceAdapter } from "../../domain/ingestion/types";
import { normaliseLaTeX, stripLaTeX } from "../normalise/latex";
import { resolveCompetition, COMPETITION_MAP } from "../normalise/competition";
import { computeDedupHash } from "../../domain/ingestion/dedup";
import { asTechniqueCode, asTopicCode, asSubtopicCode } from "../../domain/shared/branded";

// ── Raw schema (validated at boundary) ───────────────────────────────────────

const OmniMathRecordSchema = z.object({
  problem:    z.string().min(1),
  solution:   z.string().nullable().optional(),
  answer:     z.string().nullable().optional(),
  domain:     z.array(z.string()).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  source:     z.string().optional(),
});

type OmniMathRecord = z.infer<typeof OmniMathRecordSchema>;

// Map Omni-MATH hierarchical domain paths to Topic code hints
// AI classifier will refine — these are starting hints only
const DOMAIN_PATH_TO_TOPIC: Record<string, string[]> = {
  "mathematics -> algebra":               ["ALG"],
  "mathematics -> number theory":         ["NT"],
  "mathematics -> combinatorics":         ["COMB-E", "COMB-S"],
  "mathematics -> geometry":              ["GEO-S", "GEO-A"],
  "mathematics -> discrete mathematics":  ["COMB-E", "COMB-S", "GAME"],
  "mathematics -> logic":                 ["GAME"],
};

function topicHintFromDomain(domain: string[] | undefined): string | null {
  if (!domain || domain.length === 0) return null;
  const path = domain.join(" -> ").toLowerCase();
  for (const [key, codes] of Object.entries(DOMAIN_PATH_TO_TOPIC)) {
    if (path.includes(key.split(" -> ")[1] ?? "")) {
      return codes[0] ?? null;
    }
  }
  return null;
}

function generateTitle(statement: string, source: string | undefined): string {
  const firstSentence = statement.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length < 80 && firstSentence.length > 10) {
    return firstSentence;
  }
  return source ? `Problem from ${source.toUpperCase()}` : "Olympiad Problem";
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class OmniMathAdapter implements SourceAdapter {
  readonly datasetName = "omni-math" as const;

  parse(raw: unknown): CanonicalProblem[] {
    if (!Array.isArray(raw)) {
      throw new Error("OmniMathAdapter.parse: expected array");
    }
    const problems: CanonicalProblem[] = [];

    for (const item of raw) {
      const parsed = OmniMathRecordSchema.safeParse(item);
      if (!parsed.success) continue; // skip malformed records

      const r = parsed.data;
      const normalised = normaliseLaTeX(r.problem);
      const plain = stripLaTeX(r.problem);

      problems.push({
        externalId: `omni-math-${computeDedupHash(r.problem).slice(0, 8)}`,
        sourceDataset: "omni-math",
        dedupHash: computeDedupHash(r.problem),

        title: generateTitle(plain, r.source),
        statement: normalised,
        statementPlain: plain,
        answer: r.answer ?? null,
        language: "en",

        sourceCompetition: resolveCompetition(r.source)?.abbreviation ?? null,
        sourceYear: null,      // not in Omni-MATH records
        sourceRound: null,

        sourceSubject: r.domain?.[0] ?? null,
        sourceDifficulty: r.difficulty ?? null,
        sourceDomainPath: r.domain?.join(" -> ") ?? null,

        solutions: r.solution
          ? [{ body: normaliseLaTeX(r.solution), approachName: "Solution 1", isCanonical: true }]
          : [],

        // AI-classified fields — filled by classifier step
        topics: [],
        subtopics: [],
        techniques: [],
        competitionLevel: null,
        positionInPaper: null,
        techniqueDepth: null,
        creativityDemand: null,
        proofStyle: null,
        entryBarrier: null,
        estimatedSolveTimeMinutes: null,
      });
    }

    return problems;
  }
}
