// Branded types for domain identifiers — prevents ID mix-ups at compile time
// Domain layer — pure, no external dependencies

type Brand<T, B extends string> = T & { readonly __brand: B };

export type ProblemId = Brand<string, "ProblemId">;
export type SolutionId = Brand<string, "SolutionId">;
export type CompetitionId = Brand<string, "CompetitionId">;
export type TopicId = Brand<string, "TopicId">;
export type SubtopicId = Brand<string, "SubtopicId">;
export type TechniqueId = Brand<string, "TechniqueId">;
export type LearningObjectiveId = Brand<string, "LearningObjectiveId">;
export type ImportRunId = Brand<string, "ImportRunId">;
export type ImportRecordId = Brand<string, "ImportRecordId">;
export type DedupHash = Brand<string, "DedupHash">;

export type TopicCode = Brand<string, "TopicCode">;
export type SubtopicCode = Brand<string, "SubtopicCode">;
export type TechniqueCode = Brand<string, "TechniqueCode">;

export function asProblemId(s: string): ProblemId { return s as ProblemId; }
export function asSolutionId(s: string): SolutionId { return s as SolutionId; }
export function asCompetitionId(s: string): CompetitionId { return s as CompetitionId; }
export function asTopicCode(s: string): TopicCode { return s as TopicCode; }
export function asSubtopicCode(s: string): SubtopicCode { return s as SubtopicCode; }
export function asTechniqueCode(s: string): TechniqueCode { return s as TechniqueCode; }
export function asDedupHash(s: string): DedupHash { return s as DedupHash; }
export function asImportRunId(s: string): ImportRunId { return s as ImportRunId; }
