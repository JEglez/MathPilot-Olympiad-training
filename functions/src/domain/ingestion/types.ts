// Ingestion domain types — pure, no external dependencies
// CanonicalProblem is the intermediate representation between source data and domain model

import type { DedupHash, ImportRunId, TopicCode, SubtopicCode, TechniqueCode } from "../shared/branded";

// ── Enums (match domain-model.md Problem entity) ─────────────────────────────

export type CompetitionLevel = "local" | "state" | "national" | "international";
export type PositionInPaper = "early" | "middle" | "late";
export type TechniqueDepth = "single" | "compound" | "synthesis";
export type CreativityDemand = "routine" | "insightful" | "inventive" | "breakthrough";
export type ProofStyle = "computation" | "existence" | "construction" | "bound" | "characterisation" | "impossibility";
export type EntryBarrier = "transparent" | "camouflaged" | "deceptive";

// ── Source dataset names ──────────────────────────────────────────────────────

export type SourceDataset = "omni-math" | "olympiad-bench" | "olympmath" | "numina-math";

// ── Canonical intermediate format ────────────────────────────────────────────

export interface TechniqueClassification {
  readonly code: TechniqueCode;
  readonly isPrimary: boolean;
}

export interface CanonicalSolution {
  readonly body: string;
  readonly approachName: string;
  readonly isCanonical: boolean;
}

/** Intermediate representation — maps 1:1 to Problem entity + join tables */
export interface CanonicalProblem {
  // ── Identity ─────────────────────────────────────────────────────────────
  readonly externalId: string;
  readonly sourceDataset: SourceDataset;
  readonly dedupHash: DedupHash;

  // ── Content ──────────────────────────────────────────────────────────────
  readonly title: string;
  readonly statement: string;          // LaTeX normalised
  readonly statementPlain: string;     // LaTeX-stripped, for tsvector
  readonly answer: string | null;
  readonly language: string;           // ISO 639-1

  // ── Provenance (best-effort from source) ─────────────────────────────────
  readonly sourceCompetition: string | null;
  readonly sourceYear: number | null;
  readonly sourceRound: string | null;

  // ── Source classification (raw hints for AI) ──────────────────────────────
  readonly sourceSubject: string | null;
  readonly sourceDifficulty: number | null;
  readonly sourceDomainPath: string | null;

  // ── Solutions ─────────────────────────────────────────────────────────────
  readonly solutions: CanonicalSolution[];

  // ── AI-classified fields (empty until Step 3) ─────────────────────────────
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

// ── Source adapter interface ──────────────────────────────────────────────────

export interface SourceAdapter {
  readonly datasetName: SourceDataset;
  parse(raw: unknown): CanonicalProblem[];
}

// ── Import tracking ───────────────────────────────────────────────────────────

export type ImportRunStatus = "running" | "completed" | "failed";

export interface ImportRun {
  readonly id: ImportRunId;
  readonly sourceDataset: SourceDataset;
  readonly startedAt: Date;
  completedAt: Date | null;
  totalRecords: number;
  imported: number;
  duplicatesSkipped: number;
  classificationFailures: number;
  parseErrors: number;
  flaggedForReview: number;
  status: ImportRunStatus;
}

// ── Error types ───────────────────────────────────────────────────────────────

export type ParseError = {
  kind: "parse_error";
  source: SourceDataset;
  message: string;
  rawData?: unknown;
};

export type ClassifyError =
  | { kind: "ai_unavailable"; retryAfter: number }
  | { kind: "invalid_json"; rawResponse: string }
  | { kind: "unknown_taxonomy_code"; code: string; field: string }
  | { kind: "confidence_too_low"; score: number }
  | { kind: "circuit_open" }
  | { kind: "timeout"; elapsedMs: number };

export type ValidationError =
  | { kind: "invalid_topic_code"; code: string }
  | { kind: "subtopic_parent_mismatch"; subtopicCode: string; claimedTopicCode: string }
  | { kind: "invalid_enum_value"; field: string; value: string }
  | { kind: "over_classified"; techniqueCount: number }
  | { kind: "missing_required_field"; field: string };

export type StorageError =
  | { kind: "duplicate"; dedupHash: DedupHash }
  | { kind: "transaction_failed"; pgError: string }
  | { kind: "embedding_failed"; message: string };

export type ImportOutcome =
  | { kind: "imported"; externalId: string }
  | { kind: "duplicate_skipped"; dedupHash: DedupHash }
  | { kind: "parse_error"; error: ParseError }
  | { kind: "classification_failed"; error: ClassifyError }
  | { kind: "validation_failed"; errors: ValidationError[] }
  | { kind: "storage_failed"; error: StorageError };
