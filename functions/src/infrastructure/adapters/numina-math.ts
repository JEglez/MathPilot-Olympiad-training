// NuminaMath source adapter
// Source: HuggingFace AI-MO/NuminaMath-CoT (Apache-2.0)
// ~50k total rows — filter to source = "olympiads" only (~5k)
// CoT solutions, English only
// Per 03-dataset-import-search.md §2.1

import { z } from "zod";
import type { CanonicalProblem, SourceAdapter } from "../../domain/ingestion/types";
import { normaliseLaTeX, stripLaTeX } from "../normalise/latex";
import { resolveCompetition } from "../normalise/competition";
import { computeDedupHash } from "../../domain/ingestion/dedup";

const NuminaMathRecordSchema = z.object({
  problem:      z.string().min(1),
  solution:     z.string().nullable().optional(),
  answer:       z.string().nullable().optional(),
  source:       z.string().optional(),         // "olympiads", "amc_aime", etc.
  problem_type: z.string().optional(),         // loose subject hint
});

type NuminaMathRecord = z.infer<typeof NuminaMathRecordSchema>;

const MAX_SOLUTION_LENGTH = 10_000; // trim verbose CoT solutions

export class NuminaMathAdapter implements SourceAdapter {
  readonly datasetName = "numina-math" as const;

  parse(raw: unknown): CanonicalProblem[] {
    if (!Array.isArray(raw)) {
      throw new Error("NuminaMathAdapter.parse: expected array");
    }
    const problems: CanonicalProblem[] = [];

    for (const item of raw) {
      const parsed = NuminaMathRecordSchema.safeParse(item);
      if (!parsed.success) continue;

      const r = parsed.data;

      // Filter to olympiad problems only
      if (r.source !== "olympiads") continue;

      const normalised = normaliseLaTeX(r.problem);
      const plain = stripLaTeX(r.problem);
      const resolved = resolveCompetition(r.source);

      // Trim overly verbose CoT solutions
      const solutionBody = r.solution
        ? normaliseLaTeX(r.solution.slice(0, MAX_SOLUTION_LENGTH))
        : null;

      problems.push({
        externalId: `numina-math-${computeDedupHash(r.problem).slice(0, 8)}`,
        sourceDataset: "numina-math",
        dedupHash: computeDedupHash(r.problem),

        title: "Olympiad Problem",
        statement: normalised,
        statementPlain: plain,
        answer: r.answer ?? null,
        language: "en",

        sourceCompetition: resolved?.abbreviation ?? null,
        sourceYear: null,
        sourceRound: null,

        sourceSubject: r.problem_type ?? null,
        sourceDifficulty: null,
        sourceDomainPath: null,

        solutions: solutionBody
          ? [{ body: solutionBody, approachName: "Solution 1", isCanonical: true }]
          : [],

        topics: [],
        subtopics: [],
        techniques: [],
        competitionLevel: resolved?.level ?? "national",
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
