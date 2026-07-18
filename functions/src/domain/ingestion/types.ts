// Core ingestion domain types — shared by ingestion script and future application layer
// These are the "seam" types between parsers, classifiers, embedders, and storage.

import type { DedupHash, TopicCode, SubtopicCode, TechniqueCode } from "../shared/branded";

export interface TechniqueClassification {
  readonly code: TechniqueCode;
  readonly isPrimary: boolean;
}

export interface SolutionDraft {
  readonly approachName: string;
  readonly body: string;
  readonly isCanonical: boolean;
}

/**
 * Canonical representation of an olympiad problem.
 * Built by source-specific parsers; enriched by AI classification.
 * Unclassified problems have empty topics/subtopics/techniques arrays and null dimension fields.
 */
export interface CanonicalProblem {
  // Identity
  readonly externalId: string;
  readonly sourceDataset: string;
  readonly dedupHash: DedupHash;

  // Content
  readonly title: string;
  readonly statement: string;
  readonly statementPlain: string;
  readonly answer: string | null;
  readonly solutions: SolutionDraft[];
  readonly language: string;

  // Source metadata (populated by parsers, before AI classification)
  readonly sourceCompetition: string | null;
  readonly sourceLevel: string | null;
  readonly sourceSubject: string | null;
  readonly sourceDifficulty: string | null;
  readonly sourceYear: number | null;
  readonly sourceRound: string | null;

  // Classification dimensions (null until applyClassification() is called)
  readonly topics: TopicCode[];
  readonly subtopics: SubtopicCode[];
  readonly techniques: TechniqueClassification[];
  readonly competitionLevel: "local" | "state" | "national" | "international" | null;
  readonly positionInPaper: "early" | "middle" | "late" | null;
  readonly techniqueDepth: "single" | "compound" | "synthesis" | null;
  readonly creativityDemand: "routine" | "insightful" | "inventive" | "breakthrough" | null;
  readonly proofStyle: "computation" | "existence" | "construction" | "bound" | "characterisation" | "impossibility" | null;
  readonly entryBarrier: "transparent" | "camouflaged" | "deceptive" | null;
  readonly estimatedSolveTimeMinutes: number | null;
}

export type ClassifyError =
  | { kind: "ai_unavailable"; retryAfter: number }
  | { kind: "invalid_json"; rawResponse: string }
  | { kind: "invalid_output"; raw: string }
  | { kind: "circuit_open" }
  | { kind: "timeout"; elapsedMs?: number }
  | { kind: "api_error"; message: string };

export type StorageError =
  | { kind: "transaction_failed"; pgError: string }
  | { kind: "duplicate" };

export interface ImportOutcome {
  readonly problemId: string;
  readonly wasClassified: boolean;
}
