// Dedup logic — pure function, no external deps
// Produces a content-only fingerprint for exact-match deduplication across datasets

import { createHash } from "crypto";
import type { DedupHash } from "../domain/shared/branded";
import { asDedupHash } from "../domain/shared/branded";

/**
 * Normalise a problem statement to a content-only fingerprint:
 * 1. Strip LaTeX formatting markers
 * 2. Lowercase
 * 3. Remove all whitespace
 * 4. Remove "Problem N:" / "P.N" prefixes
 *
 * Per 03-dataset-import-search.md §4.5
 */
export function normalisedForDedup(statement: string): string {
  return statement
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, " ")  // \cmd{...}
    .replace(/\\[a-zA-Z]+/g, " ")             // \cmd
    .replace(/\$\$[\s\S]*?\$\$/g, " ")        // display math
    .replace(/\$[^$]*?\$/g, " ")              // inline math
    .replace(/\\\[[\s\S]*?\\]/g, " ")         // \[...\]
    .replace(/\\\([\s\S]*?\\\)/g, " ")        // \(...\)
    .replace(/^(problem\s*\d+\s*[:.]?\s*|p\.\s*\d+\s*)/i, "") // "Problem 3:"
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** SHA-256 of the normalised statement */
export function computeDedupHash(statement: string): DedupHash {
  const normalised = normalisedForDedup(statement);
  const hash = createHash("sha256").update(normalised, "utf8").digest("hex");
  return asDedupHash(hash);
}
