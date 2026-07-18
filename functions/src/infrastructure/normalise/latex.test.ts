import { describe, it, expect } from "vitest";
import { normaliseLaTeX, stripLaTeX } from "./latex";

describe("normaliseLaTeX", () => {
  it("converts $$ display math to \\[...\\]", () => {
    const result = normaliseLaTeX("$$x^2 + y^2 = z^2$$");
    expect(result).toBe("\\[x^2 + y^2 = z^2\\]");
  });

  it("converts \\(...\\) inline math to $...$", () => {
    const result = normaliseLaTeX("Let \\(p\\) be prime.");
    expect(result).toBe("Let $p$ be prime.");
  });

  it("unescapes NuminaMath double backslashes", () => {
    const result = normaliseLaTeX("\\\\frac{a}{b}");
    expect(result).toBe("\\frac{a}{b}");
  });

  it("strips \\label{} annotations", () => {
    const result = normaliseLaTeX("equation \\label{eq:main}.");
    expect(result).not.toContain("\\label");
  });

  it("removes \\boxed{} wrapper from statements", () => {
    const result = normaliseLaTeX("The answer is \\boxed{42}.");
    expect(result).toBe("The answer is 42.");
  });
});

describe("stripLaTeX", () => {
  it("converts simple inline math to readable text", () => {
    const result = stripLaTeX("Let $p$ be a prime and $n \\geq 2$.");
    expect(result).toContain("p");
    expect(result).not.toContain("$");
  });

  it("converts \\le to ≤", () => {
    const result = stripLaTeX("$a \\le b$");
    expect(result).toContain("≤");
  });

  it("converts \\frac{a}{b} to a/b", () => {
    const result = stripLaTeX("$\\frac{1}{2}$");
    expect(result).toContain("1/2");
  });

  it("removes display math blocks entirely", () => {
    const result = stripLaTeX("Statement: \\[x^2 + y^2 = r^2\\] End.");
    expect(result).toContain("Statement:");
    expect(result).toContain("End.");
    expect(result).not.toContain("\\[");
  });

  it("collapses extra whitespace", () => {
    const result = stripLaTeX("Find  all   integers.");
    expect(result).toBe("Find all integers.");
  });
});
