import { describe, it, expect } from "vitest";
import { validateClassification } from "./validate-problem";
import type { CanonicalProblem } from "./types";
import type { TaxonomyReference } from "../taxonomy/types";
import { asTechniqueCode, asTopicCode, asSubtopicCode, asDedupHash } from "../shared/branded";

const taxonomy: TaxonomyReference = {
  topicCodes: new Set(["NT", "ALG", "GEO-S", "GEO-A", "COMB-E", "COMB-S", "GAME", "MISC"]),
  subtopicCodes: new Set(["NT-DIV", "NT-MOD", "ALG-INQ"]),
  techniqueCodes: new Set(["T-PHP", "T-FLT", "T-AMGM"]),
  subtopicToTopic: new Map([["NT-DIV", "NT"], ["NT-MOD", "NT"], ["ALG-INQ", "ALG"]]),
};

function base(): CanonicalProblem {
  return {
    externalId: "test-1",
    sourceDataset: "omni-math",
    dedupHash: asDedupHash("abc123"),
    title: "Test problem",
    statement: "Let $p$ be prime.",
    statementPlain: "Let p be prime.",
    answer: null,
    language: "en",
    sourceCompetition: "IMO",
    sourceYear: 2020,
    sourceRound: "P1",
    sourceSubject: "Number Theory",
    sourceDifficulty: 5,
    sourceDomainPath: null,
    solutions: [],
    topics: [asTopicCode("NT")],
    subtopics: [asSubtopicCode("NT-MOD")],
    techniques: [{ code: asTechniqueCode("T-FLT"), isPrimary: true }],
    competitionLevel: "national",
    positionInPaper: "early",
    techniqueDepth: "single",
    creativityDemand: "insightful",
    proofStyle: "computation",
    entryBarrier: "transparent",
    estimatedSolveTimeMinutes: 20,
  };
}

describe("validateClassification", () => {
  it("returns ok for a fully valid problem", () => {
    const result = validateClassification(base(), taxonomy);
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown topic code", () => {
    const problem = { ...base(), topics: [asTopicCode("INVALID")] };
    const result = validateClassification(problem, taxonomy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.kind === "invalid_topic_code")).toBe(true);
    }
  });

  it("rejects subtopic that does not belong to the claimed topic", () => {
    const problem = { ...base(), topics: [asTopicCode("ALG")], subtopics: [asSubtopicCode("NT-MOD")] };
    const result = validateClassification(problem, taxonomy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.kind === "subtopic_parent_mismatch")).toBe(true);
    }
  });

  it("flags over-classification when >5 techniques", () => {
    const techniques = Array.from({ length: 6 }, (_, i) => ({
      code: asTechniqueCode("T-PHP"),
      isPrimary: i === 0,
    }));
    const problem = { ...base(), techniques };
    const result = validateClassification(problem, taxonomy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.kind === "over_classified")).toBe(true);
    }
  });

  it("rejects invalid enum value for competitionLevel", () => {
    const problem = { ...base(), competitionLevel: "galactic" as never };
    const result = validateClassification(problem, taxonomy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.kind === "invalid_enum_value")).toBe(true);
    }
  });
});
