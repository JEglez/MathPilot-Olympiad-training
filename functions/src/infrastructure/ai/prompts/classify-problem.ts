// Classification prompt — versioned, per ai-guidelines.md §2.1
// Version: v1
// Model target: gpt-4o-mini (config-based, not hardcoded)
// Per 03-dataset-import-search.md §5.3

export const CLASSIFICATION_PROMPT_VERSION = "v1";

/** System prompt — condensed taxonomy reference (~2,000 tokens) */
export const SYSTEM_PROMPT = `You are a math olympiad problem classifier. Given a problem statement, classify it using the MathPilot taxonomy. Return JSON only — no explanation.

## TAXONOMY REFERENCE

### Primary Domains (topics)
ALG - Algebraic Structures & Manipulations (equations, inequalities, polynomials, functional equations)
NT - Number Theory & Arithmetic (divisibility, primes, modular arithmetic)
GEO-S - Synthetic & Projective Geometry (angle chasing, collinearity, concurrence — no coordinates)
GEO-A - Analytic & Transformational Geometry (coordinates, complex numbers, inversions)
COMB-E - Enumerative & Algebraic Combinatorics (counting, generating functions, bijections)
COMB-S - Structural & Extremal Combinatorics (graph theory, Ramsey, extremal problems)
GAME - Strategies, Algorithms & Games (invariants, monovariants, game theory)
MISC - Cross-Domain & Unconventional (3+ domains, or doesn't fit above)

### Subtopics (code: description)
ALG-MAN: Algebraic manipulation & simplification | ALG-EQN: Equations & systems | ALG-BAS-INQ: Elementary inequalities | ALG-POL: Polynomials & roots | ALG-INQ: Classical inequalities (AM-GM, Cauchy-Schwarz) | ALG-SYS: Nonlinear symmetric systems | ALG-SEQ: Sequences & recurrences | ALG-FEQ: Functional equations
NT-DIV: Divisibility & GCD | NT-MOD: Modular arithmetic | NT-PRM: Prime numbers & factorisation | NT-DIO: Diophantine equations | NT-CONG: Congruences & residues | NT-PVAL: p-adic valuations
GEO-S-ANG: Angle chasing | GEO-S-CYC: Cyclic quadrilaterals | GEO-S-CIRC: Circle theorems | GEO-S-TRI: Triangle geometry | GEO-A-COORD: Coordinate geometry | GEO-A-CMPLX: Complex numbers in geometry | GEO-A-INV: Inversions & transformations
COMB-E-CNT: Basic counting | COMB-E-GENFN: Generating functions | COMB-E-GRAPH: Graph colouring & chromatic | COMB-S-EXT: Extremal combinatorics | COMB-S-RAMSEY: Ramsey theory
GAME-INV: Invariants & monovariants | GAME-STRAT: Game strategy | GAME-PROC: Process analysis

### Techniques (top 50 — use these codes)
T-PHP: Pigeonhole Principle | T-AMGM: AM-GM inequality | T-CS: Cauchy-Schwarz | T-REARR: Rearrangement inequality | T-FLT: Fermat's Little Theorem | T-CRT: Chinese Remainder Theorem | T-LTE: Lifting the Exponent | T-VIET: Vieta's formulas | T-INDUCT: Mathematical induction | T-EXTREM: Extremal principle | T-BIJEC: Bijection / double counting | T-GENF: Generating functions | T-INV: Inversion (geometry) | T-ANGCHASE: Angle chasing | T-POWPT: Power of a point | T-PTOLEMY: Ptolemy's theorem | T-COORD: Coordinate bash | T-TRIGBA: Trigonometric bash | T-COMPLX: Complex numbers | T-AREABC: Area / barycentric coords | T-PARITY: Parity argument | T-COLOUR: Colouring argument | T-MODINV: Modular invariant | T-MONOVAR: Monovariant | T-CONSTR: Construction | T-EXCONTR: Extreme / contradiction | T-WELLORD: Well-ordering | T-BEZOUT: Bézout's identity | T-EULER: Euler's theorem (NT) | T-WILSON: Wilson's theorem | T-QUADRES: Quadratic residues | T-DESCARTES: Descartes / Vieta jumping | T-SOS: Sum of squares decomposition | T-CAUCHY: Cauchy functional equation | T-SCHUR: Schur's inequality | T-MUIRHEAD: Muirhead | T-TANGENT: Tangent line trick | T-HOLDER: Hölder's inequality | T-POWER: Power mean inequality | T-SYMM: Symmetric polynomial manipulation | T-RECUR: Linear recurrence | T-MATRINV: Matrix / determinant method | T-POLYDIV: Polynomial division / factoring | T-SUBST: Clever substitution | T-PARAM: Parametrisation | T-PIGEONMOD: Pigeonhole + modular combo | T-GRAPHFLOW: Graph flow / matching | T-TURAN: Turán-type extremal | T-RAMSEY: Ramsey argument | T-GAME2P: Two-player game analysis

### Competition levels
local: AMC 8/10, MATHCOUNTS, regional contests
state: AIME, state olympiads, AMC 12
national: USAMO, IMO Shortlist, national olympiads (CNMO, OMM, etc.)
international: IMO, EGMO, APMO, Balkan MO, Baltic Way

### Output dimensions
technique_depth: single (one technique), compound (2-3 techniques), synthesis (novel combination)
creativity_demand: routine (standard application), insightful (recognise technique), inventive (non-obvious), breakthrough (IMO P3/P6 level)
proof_style: computation | existence | construction | bound | characterisation | impossibility
entry_barrier: transparent (approach visible immediately), camouflaged (needs insight to see), deceptive (misleads solver)`;

/** User message template */
export function buildUserMessage(opts: {
  statement: string;
  sourceSubject?: string | null;
  sourceDifficulty?: string | null;
  sourceCompetition?: string | null;
}): string {
  const hints = [
    opts.sourceSubject ? `Source subject: ${opts.sourceSubject}` : null,
    opts.sourceDifficulty ? `Source difficulty: ${opts.sourceDifficulty}` : null,
    opts.sourceCompetition ? `Source competition: ${opts.sourceCompetition}` : null,
  ].filter(Boolean).join("\n");

  return `${hints ? `HINTS:\n${hints}\n\n` : ""}PROBLEM:\n${opts.statement}

Respond with ONLY this JSON (no markdown, no explanation):
{
  "topics": ["NT"],
  "subtopics": ["NT-MOD"],
  "techniques": [{ "code": "T-FLT", "is_primary": true }],
  "competition_level": "national",
  "position_in_paper": "middle",
  "technique_depth": "single",
  "creativity_demand": "insightful",
  "proof_style": "computation",
  "entry_barrier": "transparent",
  "estimated_solve_time_minutes": 25
}`;
}

/** Expected output schema (for Zod validation) */
export const CLASSIFICATION_OUTPUT_SCHEMA = {
  type: "object",
  required: ["topics", "subtopics", "techniques", "competition_level", "technique_depth", "creativity_demand", "proof_style", "entry_barrier"],
  properties: {
    topics: { type: "array", items: { type: "string" } },
    subtopics: { type: "array", items: { type: "string" } },
    techniques: {
      type: "array",
      items: {
        type: "object",
        properties: { code: { type: "string" }, is_primary: { type: "boolean" } },
        required: ["code", "is_primary"],
      },
    },
    competition_level: { type: "string", enum: ["local", "state", "national", "international"] },
    position_in_paper: { type: ["string", "null"], enum: ["early", "middle", "late", null] },
    technique_depth: { type: "string", enum: ["single", "compound", "synthesis"] },
    creativity_demand: { type: "string", enum: ["routine", "insightful", "inventive", "breakthrough"] },
    proof_style: { type: "string", enum: ["computation", "existence", "construction", "bound", "characterisation", "impossibility"] },
    entry_barrier: { type: "string", enum: ["transparent", "camouflaged", "deceptive"] },
    estimated_solve_time_minutes: { type: ["integer", "null"] },
  },
};
