// OlymMATH source adapter
// Source: GitHub (MIT license)
// ~350 problems, smallest dataset, bilingual EN+ZH, no solutions
// Good for initial pipeline testing
// Per 03-dataset-import-search.md §2.1

import { z } from "zod";
import type { CanonicalProblem, SourceAdapter } from "../../domain/ingestion/types";
import { normaliseLaTeX, stripLaTeX } from "../normalise/latex";
import { computeDedupHash } from "../../domain/ingestion/dedup";

const OlymMATHRecordSchema = z.object({
  problem:  z.string().min(1),
  answer:   z.string().nullable().optional(),
  subject:  z.string().optional(),
  language: z.string().optional().default("en"),
  level:    z.string().optional(), // difficulty tier
});

type OlymMATHRecord = z.infer<typeof OlymMATHRecordSchema>;

const DIFFICULTY_TIER_MAP: Record<string, "local" | "state" | "national" | "international"> = {
  easy:         "local",
  medium:       "state",
  hard:         "national",
  competition:  "national",
};

export class OlymMATHAdapter implements SourceAdapter {
  readonly datasetName = "olympmath" as const;

  parse(raw: unknown): CanonicalProblem[] {
    if (!Array.isArray(raw)) {
      throw new Error("OlymMATHAdapter.parse: expected array");
    }
    const problems: CanonicalProblem[] = [];

    for (const item of raw) {
      const parsed = OlymMATHRecordSchema.safeParse(item);
      if (!parsed.success) continue;

      const r = parsed.data;
      const normalised = normaliseLaTeX(r.problem);
      const plain = stripLaTeX(r.problem);
      const lang = (r.language ?? "en").toLowerCase().startsWith("zh") ? "zh" : "en";
      const level = r.level ? (DIFFICULTY_TIER_MAP[r.level.toLowerCase()] ?? null) : null;

      problems.push({
        externalId: `olympmath-${computeDedupHash(r.problem).slice(0, 8)}`,
        sourceDataset: "olympmath",
        dedupHash: computeDedupHash(r.problem),

        title: "Olympiad Problem",
        statement: normalised,
        statementPlain: plain,
        answer: r.answer ?? null,
        language: lang,

        sourceCompetition: null,   // not available in this dataset
        sourceYear: null,
        sourceRound: null,

        sourceSubject: r.subject ?? null,
        sourceDifficulty: null,
        sourceDomainPath: null,

        solutions: [],             // no solutions in OlymMATH

        topics: [],
        subtopics: [],
        techniques: [],
        competitionLevel: level,
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
