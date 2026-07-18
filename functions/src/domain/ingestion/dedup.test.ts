import { describe, it, expect } from "vitest";
import { computeDedupHash, normalisedForDedup } from "./dedup";

describe("computeDedupHash", () => {
  it("produces the same hash for identical statements", () => {
    const s = "Find all primes $p$ such that $p^2 + 2$ is also prime.";
    expect(computeDedupHash(s)).toBe(computeDedupHash(s));
  });

  it("produces the same hash regardless of LaTeX whitespace", () => {
    const a = "Let $n$ be an integer.";
    const b = "Let $n$  be  an  integer.";
    expect(computeDedupHash(a)).toBe(computeDedupHash(b));
  });

  it("produces different hashes for different problems", () => {
    const a = "Find all primes $p$ such that $p^2 + 2$ is also prime.";
    const b = "Prove that there are infinitely many primes.";
    expect(computeDedupHash(a)).not.toBe(computeDedupHash(b));
  });

  it("strips Problem N: prefix before hashing", () => {
    const a = "Problem 3: Find all integers $n \\geq 2$.";
    const b = "Find all integers $n \\geq 2$.";
    expect(computeDedupHash(a)).toBe(computeDedupHash(b));
  });

  it("is case-insensitive", () => {
    const a = "Find all Primes P.";
    const b = "find all primes p.";
    expect(computeDedupHash(a)).toBe(computeDedupHash(b));
  });
});

describe("normalisedForDedup", () => {
  it("strips LaTeX commands", () => {
    const result = normalisedForDedup("\\frac{a}{b}");
    expect(result).not.toContain("\\");
  });

  it("strips display math blocks", () => {
    const result = normalisedForDedup("Let $$x^2 = 4$$ be given.");
    expect(result).not.toContain("$$");
  });
});
