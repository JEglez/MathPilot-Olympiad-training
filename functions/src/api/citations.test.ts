// Unit tests for citations.ts — extraction and validation logic
// Per 04-mvp-implementation-roadmap.md §4 task 4.5

import { describe, it, expect, vi } from "vitest";
import { extractCitations, lookupCitations } from "./shared/citations.js";
import type { Pool } from "pg";

// ── extractCitations ──────────────────────────────────────────────────────────

describe("extractCitations", () => {
  it("returns empty array for text with no citations", () => {
    expect(extractCitations("No problems here.")).toEqual([]);
  });

  it("extracts a single UUID citation", () => {
    const text = "See [prob-550e8400-e29b-41d4-a716-446655440000] for a nice problem.";
    expect(extractCitations(text)).toEqual([
      "550e8400-e29b-41d4-a716-446655440000",
    ]);
  });

  it("extracts multiple citations", () => {
    const text = [
      "Problem 1: [prob-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee]",
      "Problem 2: [prob-11111111-2222-3333-4444-555555555555]",
    ].join("\n");
    const ids = extractCitations(text);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(ids).toContain("11111111-2222-3333-4444-555555555555");
  });

  it("deduplicates repeated citations", () => {
    const text = "[prob-abc-123] and again [prob-abc-123]";
    expect(extractCitations(text)).toHaveLength(1);
    expect(extractCitations(text)[0]).toBe("abc-123");
  });

  it("is case-insensitive and normalises to lowercase", () => {
    const text = "[prob-AABBCCDD-1234-5678-ABCD-123456789ABC]";
    const ids = extractCitations(text);
    expect(ids[0]).toBe("aabbccdd-1234-5678-abcd-123456789abc");
  });

  it("does not match malformed markers without prob- prefix", () => {
    expect(extractCitations("[abc-123] [problem-456]")).toEqual([]);
  });

  it("does not match markers with spaces inside", () => {
    expect(extractCitations("[prob- abc-123]")).toEqual([]);
  });

  it("handles empty string", () => {
    expect(extractCitations("")).toEqual([]);
  });

  it("handles text with only whitespace", () => {
    expect(extractCitations("   \n\t  ")).toEqual([]);
  });

  it("extracts citation from a realistic multi-paragraph response", () => {
    const response = `
Here are three problems that combine the Pigeonhole Principle with modular arithmetic:

**1. [prob-550e8400-e29b-41d4-a716-446655440000] Residues on a Circle**
This problem is excellent for $\\mathbb{Z}/n\\mathbb{Z}$ reasoning combined with
the Pigeonhole Principle.

**2. [prob-11111111-2222-3333-4444-555555555555] Coloured Integers**
A classic combinatorial number theory problem.
    `;
    const ids = extractCitations(response);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(ids).toContain("11111111-2222-3333-4444-555555555555");
  });
});

// ── lookupCitations ───────────────────────────────────────────────────────────

// Raw DB row shape (what lookupCitations queries from the DB)
interface RawCitationRow {
  id: string;
  title: string;
  statement_plain: string | null;
}

function makePool(rows: RawCitationRow[]): Pool {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  } as unknown as Pool;
}

describe("lookupCitations", () => {
  it("returns empty array when ids is empty", async () => {
    const pool = makePool([]);
    const result = await lookupCitations([], pool);
    expect(result).toEqual([]);
    // Should not query the DB at all
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("returns CitedProblem objects for found IDs", async () => {
    const fakeRows: RawCitationRow[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Residues on a Circle",
        statement_plain: "Let $n$ integers be placed on a circle...",
      },
    ];
    const pool = makePool(fakeRows);
    const result = await lookupCitations(
      ["550e8400-e29b-41d4-a716-446655440000"],
      pool,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result[0]?.title).toBe("Residues on a Circle");
    expect(result[0]?.snippet).toBe("Let $n$ integers be placed on a circle...");
  });

  it("silently omits hallucinated IDs not found in DB", async () => {
    // DB returns only 1 of the 2 requested IDs
    const pool = makePool([
      {
        id: "real-id",
        title: "Real Problem",
        statement_plain: "Statement",
      },
    ]);
    const result = await lookupCitations(["real-id", "hallucinated-id"], pool);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("real-id");
  });

  it("truncates statement_plain to 300 chars for the snippet", async () => {
    const longStatement = "A".repeat(500);
    const pool = makePool([
      { id: "abc", title: "T", statement_plain: longStatement },
    ]);
    const result = await lookupCitations(["abc"], pool);
    expect(result[0]?.snippet).toHaveLength(300);
  });

  it("handles null statement_plain gracefully", async () => {
    const pool = makePool([
      { id: "abc", title: "T", statement_plain: null },
    ]);
    const result = await lookupCitations(["abc"], pool);
    expect(result[0]?.snippet).toBe("");
  });

  it("queries the DB with the provided IDs as a postgres array", async () => {
    const querySpy = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query: querySpy } as unknown as Pool;
    await lookupCitations(["id-1", "id-2"], pool);

    expect(querySpy).toHaveBeenCalledOnce();
    const [sqlArg, paramsArg] = querySpy.mock.calls[0] as [string, unknown[]];
    expect(sqlArg).toContain("WHERE id = ANY($1::uuid[])");
    expect(paramsArg[0]).toEqual(["id-1", "id-2"]);
  });
});
