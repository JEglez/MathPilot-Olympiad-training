import { describe, it, expect } from "vitest";
import { OlympiadBenchAdapter } from "./olympiad-bench";

const adapter = new OlympiadBenchAdapter();

const mathRecord = {
  id: "IMO_2019_P4",
  problem: "Find all pairs of integers $(k, n)$ with $k \\geq 1$ and $n \\geq 1$.",
  solution: "The answer is all pairs where $n | k$.",
  answer: "all (k,n) with n|k",
  subject: "Number Theory",
  language: "English",
};

const physicsRecord = {
  id: "PHYS_2019_1",
  problem: "A ball rolls down an inclined plane.",
  subject: "Physics",
  language: "English",
};

describe("OlympiadBenchAdapter", () => {
  it("parses a math record", () => {
    const [problem] = adapter.parse([mathRecord]);
    expect(problem).toBeDefined();
    expect(problem!.sourceDataset).toBe("olympiad-bench");
  });

  it("filters out physics records", () => {
    const result = adapter.parse([physicsRecord]);
    expect(result).toHaveLength(0);
  });

  it("extracts competition, year, and round from filename-style id", () => {
    const [problem] = adapter.parse([mathRecord]);
    expect(problem!.sourceCompetition).toBe("IMO");
    expect(problem!.sourceYear).toBe(2019);
    expect(problem!.sourceRound).toBe("P4");
  });

  it("detects Chinese language records", () => {
    const zhRecord = { ...mathRecord, language: "Chinese" };
    const [problem] = adapter.parse([zhRecord]);
    expect(problem!.language).toBe("zh");
  });
});
