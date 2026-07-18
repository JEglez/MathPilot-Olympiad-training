// Core ingestion domain types — shared by ingestion script and future application layer
// These are the "seam" types between parsers, classifiers, embedders, and storage.

import type { DedupHash, TopicCode, SubtopicCode, TechniqueCode } from "../shared/branded";

// ── Dimension enums ───────────────────────────────────────────────────────────

export type CompetitionLevel = "local" | "state" | "national" | "international";
export type PositionInPaper = "early" | "middle" | "late";
export type TechniqueDepth = "single" | "compound" | "synthesis";
export type CreativityDemand = "routine" | "insightful" | "inventive" | "breakthrough";
export type ProofStyle = "computation" | "existence" | "construction" | "bound" | "characterisation" | "impossibility";
export type EntryBarrier = "transparent" | "camouflaged" | "deceptive";

export type SourceDataset = "omni-math" | "olympiad-bench" | "olympmath" | "numina-math";

// ── Solution ──────────────────────────────────────────────────────────────────

export interface CanonicalSolution {
  readonly approachName: string;
  readonly body: string;
  readonly isCanonical: boolean;
}

// ── Canonical problem ─────────────────────────────────────────────────────────

/**
 * Canonical representation of an olympiad problem.
 * Built by source-specific parsers; enriched by AI classification.
 * Unclassified problems have empty topics/subtopics/techniques arrays and null dimension fields.
 */
export interface CanonicalProblem {
  // Identity
  readonly externalId: string;
  readonly sourceDataset: SourceDataset;
  readonly dedupHash: DedupHash;

  // Content
  readonly title: string;
  readonly statement: string;
  readonly statementPlain: string;
  readonly answer: string | null;
  readonly solutions: CanonicalSolution[];
  readonly language: string;

  // Source metadata (populated by parsers, before AI classification)
  readonly sourceCompetition: string | null;
  readonly sourceDomainPath: string | null;   // e.g. "Algebra -> Polynomials" (omni-math domain array)
  readonly sourceSubject: string | null;
  readonly sourceDifficulty: number | null;   // numeric rating from source; stored as FLOAT in DB
  readonly sourceYear: number | null;
  readonly sourceRound: string | null;

  // Classification dimensions (null until applyClassification() is called; may be pre-set by parser)
  readonly topics: TopicCode[];
  readonly subtopics: SubtopicCode[];
  readonly techniques: TechniqueClassification[];
  readonly competitionLevel: CompetitionLevel | null;
  readonly positionInPaper: PositionInPaper | null;
  readonly techniqueDepth: TechniqueDepth | null;
  readonly creativityDemand: CreativityDemand | null;
  readonly proofStyle: ProofStyle | null;
  readonly entryBarrier: EntryBarrier | null;
  readonly estimatedSolveTimeMinutes: number | null;
}

export interface TechniqueClassification {
  readonly code: TechniqueCode;
  readonly isPrimary: boolean;
}

// ── Source adapter interface ───────────────────────────────────────────────────

export interface SourceAdapter {
  readonly dataset: SourceDataset;
  parse(row: unknown): CanonicalProblem | null;
}

// ── Import run ────────────────────────────────────────────────────────────────

export interface ImportRun {
  readonly id: string;
  readonly sourceDataset: SourceDataset;
  readonly status: "running" | "completed" | "failed";
  readonly imported: number;
  readonly duplicatesSkipped: number;
  readonly classificationFailures: number;
  readonly parseErrors: number;
  readonly flaggedForReview: number;
}

// ── Error types ───────────────────────────────────────────────────────────────

export type ClassifyError =
  | { kind: "ai_unavailable"; retryAfter: number }
  | { kind: "invalid_json"; rawResponse: string }
  | { kind: "invalid_output"; raw: string }
  | { kind: "unknown_taxonomy_code"; code: string; field: string }
  | { kind: "confidence_too_low"; score: number }
  | { kind: "circuit_open" }
  | { kind: "timeout"; elapsedMs?: number }
  | { kind: "api_error"; message: string };

export type ValidationError =
  | { kind: "missing_required_field"; field: string }
  | { kind: "invalid_format"; field: string; value: unknown };

export type StorageError =
  | { kind: "duplicate"; dedupHash: DedupHash }
  | { kind: "transaction_failed"; pgError: string }
  | { kind: "embedding_failed"; message: string };

// ── Import outcome ────────────────────────────────────────────────────────────

export type ImportOutcome =
  | { kind: "imported"; problemId: string; wasClassified: boolean }
  | { kind: "duplicate"; dedupHash: DedupHash }
  | { kind: "parse_error"; externalId: string; message: string }
  | { kind: "classify_error"; externalId: string; error: ClassifyError }
  | { kind: "storage_error"; externalId: string; error: StorageError }
  | { kind: "embedding_error"; externalId: string; message: string };
