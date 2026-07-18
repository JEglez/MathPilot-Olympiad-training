// Unit tests for shared filter builder
// Tests the 4 worked examples from 03-dataset-import-search.md §7.3

import { describe, it, expect } from "vitest";
import {
  SearchParamsSchema,
  buildFilterClauses,
  rowToProblemCard,
} from "./shared/filters.js";

// ── Schema validation ─────────────────────────────────────────────────────────

describe("SearchParamsSchema", () => {
  it("parses minimal params with defaults", () => {
    const result = SearchParamsSchema.safeParse({ q: "pigeonhole" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page).toBe(1);
    expect(result.data.page_size).toBe(20);
    expect(result.data.q).toBe("pigeonhole");
  });

  it("splits comma-separated topics", () => {
    const result = SearchParamsSchema.safeParse({ topics: "NT,COMB-S" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.topics).toEqual(["NT", "COMB-S"]);
  });

  it("rejects page_size > 50", () => {
    const result = SearchParamsSchema.safeParse({ page_size: "100" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid competition level", () => {
    const result = SearchParamsSchema.safeParse({ level: "olympic" });
    expect(result.success).toBe(false);
  });

  it("coerces year_min to integer", () => {
    const result = SearchParamsSchema.safeParse({ year_min: "2015" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.year_min).toBe(2015);
  });
});

// ── Filter clause builder ─────────────────────────────────────────────────────

describe("buildFilterClauses", () => {
  it("returns empty SQL with no filters", () => {
    const params = SearchParamsSchema.parse({ q: "test" });
    const clause = buildFilterClauses(params, 3);
    expect(clause.sql).toBe("");
    expect(clause.values).toHaveLength(0);
    expect(clause.nextParamIdx).toBe(3);
  });

  // Example 1: geometry + GEO-S topic filter
  it("builds EXISTS clause for topic filter (§7.3 Example 1)", () => {
    const params = SearchParamsSchema.parse({ q: "cyclic quadrilateral", topics: "GEO-S" });
    const clause = buildFilterClauses(params, 3);
    expect(clause.sql).toContain("WHERE");
    expect(clause.sql).toContain("problem_topics");
    expect(clause.sql).toContain("ANY($3)");
    expect(clause.values[0]).toEqual(["GEO-S"]);
    expect(clause.nextParamIdx).toBe(4);
  });

  // Example 3: beginner invariant — technique + level + year filters
  it("builds technique + level clauses (§7.3 Example 3)", () => {
    const params = SearchParamsSchema.parse({
      techniques: "T-PARITY,T-COLOURING,T-MODINV",
      level: "state",
    });
    const clause = buildFilterClauses(params, 1);
    expect(clause.sql).toContain("problem_techniques");
    expect(clause.sql).toContain("competition_level");
    expect(clause.values).toContain("state");
  });

  // Example 4: NT practice set — topic + subtopic filters
  it("builds topic + subtopic clauses (§7.3 Example 4)", () => {
    const params = SearchParamsSchema.parse({
      topics: "NT",
      subtopics: "NT-MOD,NT-DIV",
    });
    const clause = buildFilterClauses(params, 1);
    expect(clause.sql).toContain("problem_topics");
    expect(clause.sql).toContain("problem_subtopics");
    expect(clause.nextParamIdx).toBe(3);
  });

  it("increments param index for each active filter", () => {
    const params = SearchParamsSchema.parse({
      topics: "NT",
      level: "national",
      year_min: "2015",
      year_max: "2024",
    });
    const clause = buildFilterClauses(params, 3);
    // topics($3) + level($4) + year_min($5) + year_max($6) → nextParamIdx = 7
    expect(clause.nextParamIdx).toBe(7);
    expect(clause.values).toHaveLength(4);
  });
});

// ── rowToProblemCard mapper ───────────────────────────────────────────────────

describe("rowToProblemCard", () => {
  it("maps a complete DB row to a ProblemCard", () => {
    const row = {
      id: "abc-123",
      title: "Divisibility Problem",
      statement: "Let $p$ be prime...",
      answer: "$p-1$",
      competition: "IMO",
      source_year: 2019,
      source_round: "P4",
      language: "en",
      competition_level: "international",
      proof_style: "computation",
      creativity_demand: "insightful",
      technique_depth: "compound",
      entry_barrier: "camouflaged",
      topics: [{ code: "NT", name: "Number Theory" }],
      techniques: [{ code: "T-FLT", name: "Fermat's Little Theorem", cognitive_load: "intermediate" }],
      search_score: 0.87,
    };
    const card = rowToProblemCard(row);
    expect(card.id).toBe("abc-123");
    expect(card.competition).toBe("IMO");
    expect(card.topics).toHaveLength(1);
    expect(card.techniques[0]?.code).toBe("T-FLT");
    expect(card.search_score).toBe(0.87);
  });

  it("defaults topics/techniques to empty array when null", () => {
    const row = {
      id: "xyz",
      title: "T",
      statement: "S",
      answer: null,
      competition: null,
      source_year: null,
      source_round: null,
      language: "en",
      competition_level: null,
      proof_style: null,
      creativity_demand: null,
      technique_depth: null,
      entry_barrier: null,
      topics: null,
      techniques: null,
    };
    const card = rowToProblemCard(row);
    expect(card.topics).toEqual([]);
    expect(card.techniques).toEqual([]);
    expect(card.search_score).toBeUndefined();
  });
});
