// Domain validation — pure function, no external deps
// Validates AI-classified CanonicalProblem against taxonomy reference data

import type { CanonicalProblem, ValidationError } from "./types";
import type { TaxonomyReference } from "../taxonomy/types";
import type { Result } from "../shared/result";
import { ok, err } from "../shared/result";

const VALID_COMPETITION_LEVELS = new Set(["local", "state", "national", "international"]);
const VALID_POSITION_IN_PAPER = new Set(["early", "middle", "late"]);
const VALID_TECHNIQUE_DEPTH = new Set(["single", "compound", "synthesis"]);
const VALID_CREATIVITY_DEMAND = new Set(["routine", "insightful", "inventive", "breakthrough"]);
const VALID_PROOF_STYLE = new Set(["computation", "existence", "construction", "bound", "characterisation", "impossibility"]);
const VALID_ENTRY_BARRIER = new Set(["transparent", "camouflaged", "deceptive"]);

const MAX_TECHNIQUES = 5;

export function validateClassification(
  problem: CanonicalProblem,
  taxonomy: TaxonomyReference,
): Result<CanonicalProblem, ValidationError[]> {
  const errors: ValidationError[] = [];

  // Topic codes must exist
  for (const code of problem.topics) {
    if (!taxonomy.topicCodes.has(code)) {
      errors.push({ kind: "invalid_topic_code", code });
    }
  }

  // Subtopic codes must exist and belong to a claimed topic
  for (const code of problem.subtopics) {
    if (!taxonomy.subtopicCodes.has(code)) {
      errors.push({ kind: "invalid_topic_code", code });
      continue;
    }
    const parentTopic = taxonomy.subtopicToTopic.get(code);
    if (parentTopic && !problem.topics.includes(parentTopic as never)) {
      errors.push({ kind: "subtopic_parent_mismatch", subtopicCode: code, claimedTopicCode: parentTopic });
    }
  }

  // Technique codes must exist
  for (const t of problem.techniques) {
    if (!taxonomy.techniqueCodes.has(t.code)) {
      errors.push({ kind: "invalid_topic_code", code: t.code });
    }
  }

  // Too many techniques flagged for human review
  if (problem.techniques.length > MAX_TECHNIQUES) {
    errors.push({ kind: "over_classified", techniqueCount: problem.techniques.length });
  }

  // Enum validation
  if (problem.competitionLevel && !VALID_COMPETITION_LEVELS.has(problem.competitionLevel)) {
    errors.push({ kind: "invalid_enum_value", field: "competitionLevel", value: problem.competitionLevel });
  }
  if (problem.positionInPaper && !VALID_POSITION_IN_PAPER.has(problem.positionInPaper)) {
    errors.push({ kind: "invalid_enum_value", field: "positionInPaper", value: problem.positionInPaper });
  }
  if (problem.techniqueDepth && !VALID_TECHNIQUE_DEPTH.has(problem.techniqueDepth)) {
    errors.push({ kind: "invalid_enum_value", field: "techniqueDepth", value: problem.techniqueDepth });
  }
  if (problem.creativityDemand && !VALID_CREATIVITY_DEMAND.has(problem.creativityDemand)) {
    errors.push({ kind: "invalid_enum_value", field: "creativityDemand", value: problem.creativityDemand });
  }
  if (problem.proofStyle && !VALID_PROOF_STYLE.has(problem.proofStyle)) {
    errors.push({ kind: "invalid_enum_value", field: "proofStyle", value: problem.proofStyle });
  }
  if (problem.entryBarrier && !VALID_ENTRY_BARRIER.has(problem.entryBarrier)) {
    errors.push({ kind: "invalid_enum_value", field: "entryBarrier", value: problem.entryBarrier });
  }

  if (errors.length > 0) {
    return err(errors);
  }
  return ok(problem);
}
