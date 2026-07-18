import { describe, it, expect } from "vitest";
import { OmniMathAdapter } from "./omni-math";

const adapter = new OmniMathAdapter();

const sampleRecord = {
  problem: "Find all primes $p$ such that $p^2 + 2$ is also prime.",
  solution: "Only $p = 3$ works because for $p > 3$ one of $p, p+2, p+4$ is divisible by 3.",
  answer: "p = 3",
  domain: ["Mathematics", "Number Theory", "Primes"],
  difficulty: 5,
  source: "imo",
};

describe("OmniMathAdapter", () => {
  it("parses a valid record into CanonicalProblem", () => {
    const [problem] = adapter.parse([sampleRecord]);
    expect(problem).toBeDefined();
    expect(problem!.sourceDataset).toBe("omni-math");
    expect(problem!.statement).toContain("prime");
    expect(problem!.solutions).toHaveLength(1);
    expect(problem!.solutions[0]!.isCanonical).toBe(true);
  });

  it("extracts competition from source field", () => {
    const [problem] = adapter.parse([sampleRecord]);
    expect(problem!.sourceCompetition).toBe("IMO");
  });

  it("computes a stable dedup hash", () => {
    const [a] = adapter.parse([sampleRecord]);
    const [b] = adapter.parse([sampleRecord]);
    expect(a!.dedupHash).toBe(b!.dedupHash);
  });

  it("skips records with missing problem field", () => {
    const result = adapter.parse([{ answer: "42" }]);
    expect(result).toHaveLength(0);
  });

  it("handles missing solution gracefully", () => {
    const record = { ...sampleRecord, solution: null };
    const [problem] = adapter.parse([record]);
    expect(problem!.solutions).toHaveLength(0);
  });

  it("strips LaTeX from statementPlain", () => {
    const [problem] = adapter.parse([sampleRecord]);
    expect(problem!.statementPlain).not.toContain("$");
  });
});
