import { describe, it, expect } from "vitest";
import { NuminaMathAdapter } from "./numina-math";

const adapter = new NuminaMathAdapter();

const olympiadRecord = {
  problem: "Prove that for all $n \\geq 1$, the sum $\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}$.",
  solution: "We use induction. Base case $n=1$: $1 = \\frac{1 \\cdot 2 \\cdot 3}{6} = 1$. ✓",
  answer: "Proved by induction",
  source: "olympiads",
  problem_type: "algebra",
};

describe("NuminaMathAdapter", () => {
  it("parses olympiad records", () => {
    const [problem] = adapter.parse([olympiadRecord]);
    expect(problem).toBeDefined();
    expect(problem!.sourceDataset).toBe("numina-math");
  });

  it("filters out non-olympiad records", () => {
    const amc = { ...olympiadRecord, source: "amc_aime" };
    const result = adapter.parse([amc]);
    expect(result).toHaveLength(0);
  });

  it("trims solutions longer than 10k chars", () => {
    const longSolution = "x".repeat(15_000);
    const [problem] = adapter.parse([{ ...olympiadRecord, solution: longSolution }]);
    expect(problem!.solutions[0]!.body.length).toBeLessThanOrEqual(10_000);
  });
});
