// LaTeX normalisation — infrastructure concern, not domain logic
// Converts varied LaTeX conventions from 4 source datasets to a standard form
// Per 03-dataset-import-search.md §4.1–§4.2

/**
 * Normalise LaTeX to a consistent representation for storage.
 * Handles variations across Omni-MATH, OlympiadBench, OlymMATH, NuminaMath.
 */
export function normaliseLaTeX(input: string): string {
  return input
    // NuminaMath: unescape double backslash
    .replace(/\\\\/g, "\\")
    // Strip \label{...} annotations
    .replace(/\\label\{[^}]*\}/g, "")
    // Strip \boxed{} from statements (keep in answers)
    .replace(/\\boxed\{([^}]*)\}/g, "$1")
    // Normalise display math: \[...\] stays as-is (preferred)
    // Convert $$ ... $$ → \[ ... \] for display
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `\\[${inner}\\]`)
    // Normalise \( \) → $ $ for inline
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`)
    // Normalise whitespace inside \frac{ a }{ b } → \frac{a}{b}
    .replace(/\\frac\s*\{\s*/g, "\\frac{")
    .replace(/\s*\}\s*\{/g, "}{")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Strip LaTeX to produce plain text for tsvector full-text search.
 * Per 03-dataset-import-search.md §4.2
 */
export function stripLaTeX(input: string): string {
  return input
    // Display math → remove block entirely (keeps surrounding text)
    .replace(/\\\[[\s\S]*?\\]/g, " ")
    .replace(/\$\$([\s\S]*?)\$\$/g, " ")
    // Inline math → convert simple expressions, drop complex ones
    .replace(/\$([^$]{1,30}?)\$/g, (_, inner) => simplifyInlineMath(inner))
    // Remove remaining LaTeX commands
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, " ")
    // Normalise whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert simple inline math to readable text for search indexing */
function simplifyInlineMath(inner: string): string {
  return inner
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\neq\b|\\ne\b/g, "≠")
    .replace(/\\cdot/g, "·")
    .replace(/\\sqrt\{([^}]+)\}/g, "√$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}^_]/g, "")
    .trim();
}
