// Taxonomy domain types — pure, no external dependencies
// Reference data: Topics, Subtopics, Techniques, LearningObjectives

import type { TopicId, SubtopicId, TechniqueId, TopicCode, SubtopicCode, TechniqueCode } from "../shared/branded";

export type CognitiveLoad = "foundational" | "intermediate" | "advanced" | "elite";

export interface Topic {
  readonly id: TopicId;
  readonly code: TopicCode;
  readonly name: string;
  readonly description: string;
}

export interface Subtopic {
  readonly id: SubtopicId;
  readonly topicId: TopicId;
  readonly code: SubtopicCode;
  readonly name: string;
  readonly description: string;
  readonly prerequisiteSubtopics: SubtopicId[];
}

export interface Technique {
  readonly id: TechniqueId;
  readonly subtopicId: SubtopicId;
  readonly code: TechniqueCode;
  readonly name: string;
  readonly description: string;
  readonly cognitiveLoad: CognitiveLoad;
  readonly prerequisiteTechniques: TechniqueId[];
}

/** Flat lookup sets for validation — passed into validators, never fetched inside domain */
export interface TaxonomyReference {
  readonly topicCodes: ReadonlySet<string>;
  readonly subtopicCodes: ReadonlySet<string>;
  readonly techniqueCodes: ReadonlySet<string>;
  /** subtopicCode → topicCode it belongs to */
  readonly subtopicToTopic: ReadonlyMap<string, string>;
}
