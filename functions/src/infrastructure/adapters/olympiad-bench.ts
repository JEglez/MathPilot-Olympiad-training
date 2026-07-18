// OlympiadBench source adapter
// Source: HuggingFace lmms-lab/OlympiadBench (Apache-2.0)
// ~4,200 math problems (filter out physics), bilingual EN+ZH
// Competition + year + problem number encoded in filename/id field
// Per 03-dataset-import-search.md §2.1

import { z } from "zod";
import type { CanonicalProblem, SourceAdapter } from "../../domain/ingestion/types";
import { normaliseLaTeX, stripLaTeX } from "../normalise/latex";
import { resolveCompetition, parseOlympiadBenchFilename } from "../normalise/competition";
import { computeDedupHash } from "../../domain/ingestion/dedup";

const OlympiadBenchRecordSchema = z.object({
  id:       z.string().optional(),
  problem:  z.string().min(1),
  solution: z.string().nullable().optional(),
  answer:   z.string().nullable().optional(),
  subject:  z.string().optional(),
  language: z.string().optional().default("English"),
  source:   z.string().optional(),    // may contain competition info
});

type OlympiadBenchRecord = z.infer<typeof OlympiadBenchRecordSchema>;

const MATH_SUBJECTS = new Set([
  "algebra", "number theory", "combinatorics", "geometry", "mathematics", "math",
]);

function isMathRecord(record: OlympiadBenchRecord): boolean {
  const subject = (record.subject ?? "").toLowerCase();
  for (const s of MATH_SUBJECTS) {
    if (subject.includes(s)) return true;
  }
  // If no subject info, include by default
  return !record.subject;
}

function toLanguageCode(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("chinese") || lower.includes("zh")) return "zh";
  return "en";
}

export class OlympiadBenchAdapter implements SourceAdapter {
  readonly datasetName = "olympiad-bench" as const;

  parse(raw: unknown): CanonicalProblem[] {
    if (!Array.isArray(raw)) {
      throw new Error("OlympiadBenchAdapter.parse: expected array");
    }
    const problems: CanonicalProblem[] = [];

    for (const item of raw) {
      const parsed = OlympiadBenchRecordSchema.safeParse(item);
      if (!parsed.success) continue;

      const r = parsed.data;
      if (!isMathRecord(r)) continue; // skip physics

      const normalised = normaliseLaTeX(r.problem);
      const plain = stripLaTeX(r.problem);
      const lang = toLanguageCode(r.language ?? "English");

      // Extract metadata from id/source field if available
      const meta = r.id ? parseOlympiadBenchFilename(r.id) : { competition: null, year: null, round: null };
      const resolved = resolveCompetition(meta.competition ?? r.source ?? null);

      problems.push({
        externalId: `olympiad-bench-${computeDedupHash(r.problem).slice(0, 8)}`,
        sourceDataset: "olympiad-bench",
        dedupHash: computeDedupHash(r.problem),

        title: `${meta.competition ?? "Olympiad"} ${meta.year ?? ""} ${meta.round ?? ""}`.trim() || "Olympiad Problem",
        statement: normalised,
        statementPlain: plain,
        answer: r.answer ?? null,
        language: lang,

        sourceCompetition: resolved?.abbreviation ?? meta.competition ?? null,
        sourceYear: meta.year,
        sourceRound: meta.round,

        sourceSubject: r.subject ?? null,
        sourceDifficulty: null,
        sourceDomainPath: null,

        solutions: r.solution
          ? [{ body: normaliseLaTeX(r.solution), approachName: "Solution 1", isCanonical: true }]
          : [],

        topics: [],
        subtopics: [],
        techniques: [],
        competitionLevel: resolved?.level ?? null,
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
