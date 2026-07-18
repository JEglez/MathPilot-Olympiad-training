# MathPilot — MVP Phase 1: Dataset Import & Search

> **Date**: July 2026
> **Status**: Draft
> **Scope**: Import existing olympiad datasets, make them searchable via API and chat.
> **Dependencies**: [domain-model.md](../domain-model.md), [taxonomy.md](../taxonomy.md),
> [02-mvp-architecture.md](02-mvp-architecture.md)

---

## 1. Phase 1 Goal

Get **searchable, classified olympiad problems** into the platform using existing
open datasets — no PDF ingestion, no student profiles, no recommendations.

**Success criteria** (from `01-product-analysis.md` §4):
- A trainer can find a relevant problem in under 30 seconds
- Semantic search returns results a trainer agrees are relevant (>80% precision)
- A trainer says "I would use this again"

---

## 2. Source Datasets

### 2.1 Selected Sources (Open License)

| Dataset | Size | Format | License | Why Selected |
|---------|------|--------|---------|-------------|
| **Omni-MATH** | 4,428 | JSONL / Parquet | Apache-2.0 | Best field coverage: problem, solution, answer, domain (hierarchical), source (competition name), difficulty (1–10). Expert-annotated. |
| **OlympiadBench** (math subset) | ~4,200 math | JSON | Apache-2.0 | Full solutions, subfield tags, competition source encoded in filenames. Bilingual (EN+ZH). |
| **OlymMATH** | 350 | JSONL | MIT | Small but clean. Bilingual (EN+ZH). Good for testing. Answers only (no solutions). |
| **NuminaMath-CoT** (`olympiads` subset) | ~50,000 est. | Parquet | Apache-2.0 | Large corpus with CoT solutions. Filter to `source = "olympiads"` only. |

**Combined unique problems (estimated after dedup):** ~8,000–12,000

### 2.2 Excluded Sources

| Source | Reason |
|--------|--------|
| **AoPS Wiki** | No license. Copyright unresolved. Cannot legally redistribute. |
| **MathNet.ru** | No bulk download, no API, Russian-only. Not a dataset. |
| **IMO Official** | PDF only, no structured data. Would require PDF ingestion (Phase 2). |
| **artnoage/Olympiads** | No stated license, undocumented provenance. |

### 2.3 Source Field Inventory

What each source provides vs. what the domain model needs:

```
                          Omni-MATH   OlympiadBench   OlymMATH   NuminaMath
                          ─────────   ─────────────   ────────   ──────────
problem statement            ✅            ✅            ✅           ✅
answer                       ✅            ✅            ✅           ✅
full solution                ✅            ✅            ❌           ✅
subject / domain             ✅ (hier.)    ✅ (flat)     ✅ (flat)   ✅ (flat)
competition source           ✅ (code)     ✅ (filename) ❌          ✅ (category)
competition year             ❌            ✅ (filename) ❌          ❌
problem number               ❌            ✅ (filename) ❌          ❌
difficulty                   ✅ (1-10)     ❌            ✅ (tier)   ❌
language                     ❌ (EN only)  ✅ (EN+ZH)    ✅ (EN+ZH) ❌ (EN)
LaTeX                        ✅ $...$      ✅ $...$      ✅ $...$   ✅ $...$
─────────────────────────────────────────────────────────────────────────────
competition_level            ❌            ❌            ❌          ❌
topics (our taxonomy)        ❌            ❌            ❌          ❌
subtopics (our taxonomy)     ❌            ❌            ❌          ❌
techniques (our taxonomy)    ❌            ❌            ❌          ❌
proof_style                  ❌            ❌            ❌          ❌
creativity_demand            ❌            ❌            ❌          ❌
technique_depth              ❌            ❌            ❌          ❌
entry_barrier                ❌            ❌            ❌          ❌
```

**Key observation:** No source provides MathPilot taxonomy fields. ALL problems
require AI classification against our taxonomy at import time.

---

## 3. Canonical Problem Schema

The import pipeline normalises every source into this canonical intermediate
format before writing to PostgreSQL. This is NOT a new entity — it maps 1:1
to the Problem entity in `domain-model.md` plus its join tables.

```typescript
interface CanonicalProblem {
  // ── Identity ──────────────────────────────────────────
  external_id: string;           // source-specific ID (e.g. "omni-math-42")
  source_dataset: string;        // "omni-math" | "olympiad-bench" | "olympmath" | "numina-math"
  dedup_hash: string;            // SHA-256 of normalised statement (for dedup)

  // ── Content (from source) ─────────────────────────────
  title: string;                 // generated if not in source
  statement: string;             // LaTeX, normalised (see §4)
  statement_plain: string;       // plain text (LaTeX stripped) for full-text search
  answer: string | null;         // final answer (LaTeX)
  language: string;              // ISO 639-1: "en", "zh", "es"

  // ── Provenance (from source, best-effort) ─────────────
  source_competition: string | null;  // normalised competition abbreviation
  source_year: number | null;
  source_round: string | null;        // "P3", "Shortlist C5", etc.

  // ── Source classification (raw, for reference) ────────
  source_subject: string | null;      // e.g. "Geometry", "Number Theory"
  source_difficulty: number | null;   // e.g. Omni-MATH 1–10
  source_domain_path: string | null;  // e.g. "Mathematics -> Algebra -> Polynomials"

  // ── Solutions (from source) ───────────────────────────
  solutions: {
    body: string;                // LaTeX
    approach_name: string;       // generated: "Solution 1", "Solution 2", etc.
    is_canonical: boolean;       // first solution = canonical
  }[];

  // ── AI-classified fields (filled by classification step) ──
  topics: string[];              // Topic codes: ["NT", "ALG"]
  subtopics: string[];           // Subtopic codes: ["NT-MOD", "ALG-INQ"]
  techniques: {
    code: string;                // Technique code: "T-FLT"
    is_primary: boolean;
  }[];
  competition_level: "local" | "state" | "national" | "international";
  position_in_paper: "early" | "middle" | "late" | null;
  technique_depth: "single" | "compound" | "synthesis";
  creativity_demand: "routine" | "insightful" | "inventive" | "breakthrough";
  proof_style: "computation" | "existence" | "construction" | "bound"
             | "characterisation" | "impossibility";
  entry_barrier: "transparent" | "camouflaged" | "deceptive";
  estimated_solve_time_minutes: number | null;
}
```

---

## 4. Normalisation Rules

### 4.1 LaTeX Normalisation

All sources use LaTeX, but with inconsistencies. Normalise to a standard form:

| Rule | Input | Output |
|------|-------|--------|
| Strip display delimiters | `$$ ... $$` | `\[ ... \]` |
| Preserve inline delimiters | `$ ... $` | `$ ... $` |
| OlympiadBench: no change needed | `\\frac`, `\\sqrt` | already standard |
| NuminaMath: unescape double backslash | `\\\\frac` | `\\frac` |
| Normalise whitespace in LaTeX | `\\frac { a }{ b }` | `\\frac{a}{b}` |
| Remove `\boxed{}` from statement | `Find $\boxed{42}$` | `Find $42$` |
| Keep `\boxed{}` in answers | — | — |

### 4.2 Plain Text Generation

Strip LaTeX to produce `statement_plain` for tsvector full-text search:

```
Input:  "Find all primes $p$ such that $p^2 + 2$ is also prime."
Output: "Find all primes p such that p² + 2 is also prime."
```

Rules:
- `$...$` → remove delimiters, convert simple expressions
- `\frac{a}{b}` → `a/b`
- `\sqrt{x}` → `√x`
- `\le`, `\ge`, `\ne` → `≤`, `≥`, `≠`
- `\cdot` → `·`
- Complex LaTeX → drop (keep surrounding text)

Use a lightweight library (e.g., `strip-latex` or custom regex) — NOT an LLM call.

### 4.3 Competition Name Resolution

Map raw source strings to Competition entity abbreviations in the domain model:

```typescript
const COMPETITION_MAP: Record<string, { abbreviation: string; level: string }> = {
  // Omni-MATH source codes
  "imo":                      { abbreviation: "IMO",   level: "international" },
  "imo_shortlist":            { abbreviation: "ISL",   level: "international" },
  "usa_team_selection_test":  { abbreviation: "USATST", level: "national" },
  "china_team_selection_test":{ abbreviation: "CNTST", level: "national" },
  "putnam":                   { abbreviation: "PUTNAM", level: "national" },
  "usamo":                    { abbreviation: "USAMO", level: "national" },
  "china_national_olympiad":  { abbreviation: "CNMO",  level: "national" },
  "apmo":                     { abbreviation: "APMO",  level: "international" },
  "balkan_mo":                { abbreviation: "BMO",   level: "international" },
  "baltic_way":               { abbreviation: "BWAY",  level: "international" },
  "egmo":                     { abbreviation: "EGMO",  level: "international" },

  // OlympiadBench filename patterns
  "COMP":                     { abbreviation: null,    level: "national" },
  "CEE":                      { abbreviation: "GAOKAO", level: "national" },

  // NuminaMath source categories
  "olympiads":                { abbreviation: null,    level: "national" },
  "amc_aime":                 { abbreviation: "AMC",   level: "local" },

  // Fallback
  "unknown":                  { abbreviation: null,    level: null },
};
```

If a competition doesn't exist in the `competitions` table, create it as a
new row with `is_active: false` and flag for human review.

### 4.4 Subject-to-Topic Mapping

Map source domain labels to MathPilot Topic codes:

```typescript
const SUBJECT_TO_TOPIC: Record<string, string[]> = {
  // Direct mappings
  "Algebra":              ["ALG"],
  "Number Theory":        ["NT"],
  "Combinatorics":        ["COMB-E", "COMB-S"],  // AI refines which one
  "Geometry":             ["GEO-S", "GEO-A"],    // AI refines which one

  // Omni-MATH hierarchical domains
  "Mathematics -> Algebra -> Polynomials":     ["ALG"],
  "Mathematics -> Algebra -> Inequalities":    ["ALG"],
  "Mathematics -> Combinatorics -> Graph Theory": ["COMB-S"],
  "Mathematics -> Number Theory -> Modular Arithmetic": ["NT"],
  "Mathematics -> Geometry -> Projective Geometry":     ["GEO-S"],
  "Mathematics -> Geometry -> Trigonometry":             ["GEO-A"],

  // Ambiguous — needs AI classification
  "Mathematics -> Discrete Mathematics": ["COMB-E", "COMB-S", "GAME"],
  "Mathematics -> Logic":                ["GAME"],
};
```

This provides **hints** to the AI classifier. The source subject narrows the
search space but the AI makes the final taxonomy assignment.

### 4.5 Deduplication

Problems appear in multiple datasets (e.g., an IMO problem exists in Omni-MATH,
OlympiadBench, and NuminaMath).

**Dedup strategy:**

```
1. Normalise statement:
   - Strip LaTeX formatting markers
   - Lowercase
   - Remove all whitespace
   - Remove "problem N:" prefixes
   - Result: a content-only fingerprint

2. Hash: SHA-256(normalised_statement)

3. On import:
   - If hash exists in DB → SKIP (keep the richer record)
   - If hash is new → INSERT

4. Priority order (when both exist):
   Omni-MATH > OlympiadBench > NuminaMath > OlymMATH
   (ordered by field richness: solutions, domain tags, difficulty)
```

**Fuzzy dedup (post-import):** Run `text-embedding-3-small` cosine similarity
on all problem pairs with similarity > 0.95. Flag as potential duplicates for
human review. Store via ProblemRelationship with `relationship_type: "dual"`.

---

## 5. Import Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        IMPORT PIPELINE (Azure Functions)                   │
│                                                                            │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │  1. FETCH   │───▶│ 2. NORMALISE │───▶│ 3. CLASSIFY  │───▶│ 4. STORE  │ │
│  │             │    │              │    │              │    │           │ │
│  │ Download    │    │ Parse format │    │ GPT-4o-mini  │    │ Write to  │ │
│  │ from HF /  │    │ Map fields   │    │ assigns:     │    │ PostgreSQL│ │
│  │ GitHub      │    │ Normalise    │    │  topics      │    │ + AI      │ │
│  │             │    │ LaTeX        │    │  subtopics   │    │ Search    │ │
│  │             │    │ Dedup hash   │    │  techniques  │    │           │ │
│  │             │    │ Resolve comp │    │  6 dims      │    │           │ │
│  └─────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│       │                    │                   │                  │        │
│       ▼                    ▼                   ▼                  ▼        │
│  Blob Storage         Canonical           Azure OpenAI      PostgreSQL    │
│  (raw dataset         Problem             GPT-4o-mini        (pgvector    │
│   snapshots)          (in-memory)         (batch API)        + tsvector)  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Step 1: Fetch

One Azure Function per source, triggered manually or on schedule:

| Function | Input | Output |
|----------|-------|--------|
| `import-omni-math` | HF dataset download (JSONL) | Raw records in memory |
| `import-olympiad-bench` | Google Drive ZIP → extract JSON | Raw records in memory |
| `import-olympmath` | GitHub raw JSONL | Raw records in memory |
| `import-numina-math` | HF Parquet (filter `source = "olympiads"`) | Raw records in memory |

**Raw dataset snapshots** are saved to Blob Storage (`datasets-raw/` container)
so imports are reproducible without re-downloading.

### 5.2 Step 2: Normalise

Each source has a **source adapter** that converts raw records to `CanonicalProblem`:

```typescript
// Source adapter interface
interface SourceAdapter {
  readonly datasetName: string;
  parse(raw: unknown): CanonicalProblem[];
}

// Example: Omni-MATH adapter
class OmniMathAdapter implements SourceAdapter {
  readonly datasetName = "omni-math";

  parse(raw: OmniMathRecord[]): CanonicalProblem[] {
    return raw.map(r => ({
      external_id: `omni-math-${hash(r.problem).slice(0, 8)}`,
      source_dataset: "omni-math",
      dedup_hash: computeDedupHash(r.problem),
      title: generateTitle(r.problem),          // first sentence or "Problem from {source}"
      statement: normaliseLaTeX(r.problem),
      statement_plain: stripLaTeX(r.problem),
      answer: r.answer,
      language: "en",
      source_competition: COMPETITION_MAP[r.source]?.abbreviation ?? null,
      source_year: null,                        // not in Omni-MATH
      source_round: null,
      source_subject: r.domain?.[0] ?? null,
      source_difficulty: r.difficulty,
      source_domain_path: r.domain?.join(" -> ") ?? null,
      solutions: r.solution ? [{
        body: normaliseLaTeX(r.solution),
        approach_name: "Solution 1",
        is_canonical: true,
      }] : [],
      // AI-classified fields left empty — filled in Step 3
      topics: [],
      subtopics: [],
      techniques: [],
      competition_level: null,
      position_in_paper: null,
      technique_depth: null,
      creativity_demand: null,
      proof_style: null,
      entry_barrier: null,
      estimated_solve_time_minutes: null,
    }));
  }
}
```

### 5.3 Step 3: Classify (AI)

Each normalised problem is classified using GPT-4o-mini. This is the most
expensive step — but it happens **once per problem at import time** (cost rule #1).

**Prompt structure:**

```
System: You are a math olympiad problem classifier. Given a problem statement,
classify it using the taxonomy below. Return JSON only.

TAXONOMY REFERENCE:
- Topics: ALG, NT, GEO-S, GEO-A, COMB-E, COMB-S, GAME, MISC
- Subtopics: [condensed list with codes and one-line descriptions]
- Techniques: [condensed list with codes, grouped by subtopic]
- Competition levels: local, state, national, international
- Technique depth: single, compound, synthesis
- Creativity demand: routine, insightful, inventive, breakthrough
- Proof style: computation, existence, construction, bound, characterisation, impossibility
- Entry barrier: transparent, camouflaged, deceptive

HINTS FROM SOURCE DATA:
- Source subject: {source_subject}
- Source difficulty: {source_difficulty}
- Source competition: {source_competition}

PROBLEM:
{statement}

Respond with this exact JSON schema:
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
}
```

**Cost optimisation:**
- Use **Azure OpenAI Batch API** (50% cost reduction, 24-hour turnaround)
- Each problem is one request in the batch JSONL file (up to 100k requests per batch)
- Per problem: ~2,500 input tokens (2,000 condensed taxonomy + ~300 statement + ~200 hints) + ~200 output tokens
- 12,000 problems via Batch API:
  - Input:  30M tokens × $0.075/1M = $2.25
  - Output: 2.4M tokens × $0.30/1M = $0.72
  - **Total classification: ~$3.00**
- The condensed taxonomy system prompt is cached within each batch — no per-problem re-tokenisation overhead
- Include source hints (subject, difficulty, competition) to improve accuracy and constrain output

**Taxonomy reference compression:** The full taxonomy is ~50,000 tokens — too
large for the context window. Instead, provide a condensed reference:

```
Domains: ALG (Algebra), NT (Number Theory), GEO-S (Synthetic Geometry), ...
Subtopics (ALG): ALG-MAN (Manipulation), ALG-EQN (Equations), ALG-POL (Polynomials), ...
Techniques (top 50): T-PHP (Pigeonhole), T-AMGM (AM-GM), T-FLT (Fermat Little), ...
```

~2,000 tokens for the condensed reference. Full taxonomy used as a validation
layer post-classification (reject codes that don't exist).

**Validation rules (post-classification):**

| Rule | Action |
|------|--------|
| Topic code not in taxonomy | Reject, re-classify with correction prompt |
| Subtopic not under claimed topic | Reject, re-classify |
| Technique code doesn't exist | Map to closest match or flag for human review |
| `competition_level` contradicts source competition's known level | Keep AI's classification but flag discrepancy |
| More than 5 techniques on a single problem | Flag for human review (likely over-classified) |

### 5.4 Step 4: Store

Write the classified problem to PostgreSQL (the single source of truth and
search engine via pgvector + tsvector):

**PostgreSQL writes (single transaction per problem):**

```sql
BEGIN;

-- 1. Upsert competition (if resolved from source)
INSERT INTO competitions (id, abbreviation, name, level, is_active)
VALUES ($1, $2, $3, $4, false)
ON CONFLICT (abbreviation) DO NOTHING;

-- 2. Insert problem
INSERT INTO problems (
  id, title, statement, statement_plain, source_competition_id, source_year,
  source_round, answer, language, status,
  competition_level, position_in_paper, technique_depth,
  creativity_demand, proof_style, entry_barrier,
  estimated_solve_time_minutes, statement_vector, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
  'draft',  -- all imports start as draft
  $10, $11, $12, $13, $14, $15, $16, $embedding, NOW());

-- 3. Insert join table rows
INSERT INTO problem_topics (problem_id, topic_id)
  SELECT $1, id FROM topics WHERE code = ANY($topics);

INSERT INTO problem_subtopics (problem_id, subtopic_id)
  SELECT $1, id FROM subtopics WHERE code = ANY($subtopics);

INSERT INTO problem_techniques (problem_id, technique_id, is_primary)
  SELECT $1, t.id, v.is_primary
  FROM unnest($techniques) AS v(code, is_primary)
  JOIN techniques t ON t.code = v.code;

-- 4. Insert solutions (if any)
INSERT INTO solutions (id, problem_id, approach_name, body, is_canonical)
VALUES ($1, $2, $3, $4, $5);

-- 5. Track import provenance
INSERT INTO import_records (
  problem_id, source_dataset, external_id, dedup_hash,
  source_subject, source_difficulty, imported_at
) VALUES ($1, $2, $3, $4, $5, $6, NOW());

COMMIT;
```

**Embedding generation and storage (same transaction):**

After classification, embed the statement and store everything in PostgreSQL
in a single transaction — no separate search index write needed:

```typescript
// Generate embedding
const statementVector = await embed(problem.statement_plain);

// The INSERT in the transaction above includes:
// statement_vector = $embedding (vector(1536) column via pgvector)
// statement_plain is already stored for tsvector full-text search
// (search_tsv is a GENERATED ALWAYS column — auto-populated)
```

**Embedding generation:** `text-embedding-3-small` (1536 dimensions).
~12,000 problems × ~200 tokens avg = 2.4M tokens ≈ **$0.05** total.

**Key simplification:** Because search uses pgvector and tsvector inside the
same PostgreSQL database, there is no dual-write to a separate search service.
The import pipeline writes once to PostgreSQL — that's it.

---

## 6. Import Tracking Schema

New tables in PostgreSQL (MVP-only, not part of core domain model):

> **Note:** `import_records` and `import_runs` (below) track **dataset imports**
> (this pipeline). The `ingestion_jobs` table in `02-mvp-architecture.md` §3.4
> tracks **PDF uploads** (Phase 2). They are separate tracking mechanisms for
> separate ingestion paths.

```sql
CREATE TABLE import_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset  TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  total_records   INT NOT NULL DEFAULT 0,
  imported        INT NOT NULL DEFAULT 0,
  duplicates_skipped INT NOT NULL DEFAULT 0,
  classification_failures INT NOT NULL DEFAULT 0,
  parse_errors    INT NOT NULL DEFAULT 0,
  flagged_for_review INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE import_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES problems(id),
  source_dataset  TEXT NOT NULL,    -- "omni-math", "olympiad-bench", etc.
  external_id     TEXT NOT NULL,    -- source-specific ID
  dedup_hash      TEXT NOT NULL,    -- SHA-256 of normalised statement
  source_subject  TEXT,             -- raw subject from source
  source_difficulty FLOAT,          -- raw difficulty from source
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source_dataset, external_id),
  UNIQUE (dedup_hash)
);

CREATE INDEX idx_import_dedup ON import_records (dedup_hash);
```

This table enables:
- Dedup checks during import (`WHERE dedup_hash = $1`)
- Tracing a problem back to its source dataset
- Re-importing from a source without duplicating

---

## 7. Search Schema (pgvector + tsvector in PostgreSQL)

All search capabilities live inside PostgreSQL — no separate search service.
This section defines the search-specific columns and indexes added to the
domain model tables.

### 7.0 Search Schema Definition

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add search columns to problems table
ALTER TABLE problems ADD COLUMN statement_plain TEXT;       -- LaTeX-stripped plain text
ALTER TABLE problems ADD COLUMN statement_vector vector(1536); -- embedding from text-embedding-3-small

-- Auto-generated tsvector for full-text search (title weighted higher)
ALTER TABLE problems ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(statement_plain, '')), 'B')
  ) STORED;

-- HNSW index for vector similarity search (cosine distance)
CREATE INDEX idx_problems_vector ON problems
  USING hnsw (statement_vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search
CREATE INDEX idx_problems_search ON problems USING gin (search_tsv);

-- GIN indexes on join tables for fast taxonomy filtering
CREATE INDEX idx_problem_topics_problem ON problem_topics (problem_id);
CREATE INDEX idx_problem_topics_topic ON problem_topics (topic_id);
CREATE INDEX idx_problem_subtopics_problem ON problem_subtopics (problem_id);
CREATE INDEX idx_problem_techniques_problem ON problem_techniques (problem_id);

-- Indexes on filterable enum columns
CREATE INDEX idx_problems_level ON problems (competition_level);
CREATE INDEX idx_problems_proof_style ON problems (proof_style);
CREATE INDEX idx_problems_year ON problems (source_year);
CREATE INDEX idx_problems_language ON problems (language);
```

**Hybrid search query (RRF — Reciprocal Rank Fusion):**

```sql
WITH text_results AS (
  SELECT id, ts_rank(search_tsv, query) AS text_score,
         ROW_NUMBER() OVER (ORDER BY ts_rank(search_tsv, query) DESC) AS text_rank
  FROM problems, plainto_tsquery('english', $query_text) query
  WHERE search_tsv @@ query
  LIMIT 50
),
vector_results AS (
  SELECT id, 1 - (statement_vector <=> $query_vector) AS vector_score,
         ROW_NUMBER() OVER (ORDER BY statement_vector <=> $query_vector) AS vector_rank
  FROM problems
  ORDER BY statement_vector <=> $query_vector
  LIMIT 50
),
rrf AS (
  SELECT COALESCE(t.id, v.id) AS id,
         COALESCE(1.0 / (60 + t.text_rank), 0) +
         COALESCE(1.0 / (60 + v.vector_rank), 0) AS rrf_score
  FROM text_results t
  FULL OUTER JOIN vector_results v ON t.id = v.id
  ORDER BY rrf_score DESC
  LIMIT $page_size OFFSET $offset
)
SELECT p.id, p.title, p.statement, p.answer,
       p.source_year, p.source_round, p.language,
       p.competition_level, p.proof_style,
       p.creativity_demand, p.technique_depth, p.entry_barrier,
       c.abbreviation AS competition,
       rrf.rrf_score AS search_score,
       json_agg(DISTINCT jsonb_build_object(
         'code', tech.code, 'name', tech.name
       )) AS techniques,
       json_agg(DISTINCT jsonb_build_object(
         'code', top.code, 'name', top.name
       )) AS topics
FROM rrf
JOIN problems p ON rrf.id = p.id
LEFT JOIN competitions c ON p.source_competition_id = c.id
LEFT JOIN problem_techniques pt ON p.id = pt.problem_id
LEFT JOIN techniques tech ON pt.technique_id = tech.id
LEFT JOIN problem_topics ptop ON p.id = ptop.problem_id
LEFT JOIN topics top ON ptop.topic_id = top.id
-- Apply structured filters here:
-- WHERE p.competition_level = $level
-- AND EXISTS (SELECT 1 FROM problem_topics pt2 JOIN topics t2 ON pt2.topic_id = t2.id
--             WHERE pt2.problem_id = p.id AND t2.code = ANY($topic_codes))
GROUP BY p.id, c.abbreviation, rrf.rrf_score
ORDER BY rrf.rrf_score DESC;
```

### 7.1 Search Capabilities Summary

| Capability | Implementation | Column / Index |
|-----------|---------------|----------------|
| Full-text keyword search | `tsvector @@ tsquery` | `search_tsv` (GIN index) |
| Vector similarity | `statement_vector <=> $query` | `statement_vector` (HNSW index) |
| Filter by topic | `JOIN problem_topics` | GIN index on `problem_topics` |
| Filter by subtopic | `JOIN problem_subtopics` | GIN index on `problem_subtopics` |
| Filter by technique | `JOIN problem_techniques` | GIN index on `problem_techniques` |
| Filter by competition level | `WHERE competition_level = $1` | B-tree index |
| Filter by proof style | `WHERE proof_style = $1` | B-tree index |
| Filter by competition | `JOIN competitions` | FK index |
| Filter by year | `WHERE source_year BETWEEN $1 AND $2` | B-tree index |
| Sort by year | `ORDER BY source_year` | B-tree index |
| Facet counts | `GROUP BY ... COUNT(*)` | Computed in SQL |
| Hybrid ranking | RRF over text_rank + vector_rank | Application-level CTE |

### 7.2 Search Mode Mechanics

**Full-text (tsvector):** Matches keywords in `title` (weight A) and
`statement_plain` (weight B). PostgreSQL's English dictionary handles stemming
and stop words. Ranked by `ts_rank`. Good for specific terms ("pigeonhole",
"cyclic quadrilateral", "Fermat").

**Vector (pgvector):** The query text is embedded via `text-embedding-3-small`
and compared to `statement_vector` using cosine distance (`<=>` operator) with
an HNSW index (m=16, ef_construction=64). Good for semantic intent ("problems
about distributing objects into boxes" → finds pigeonhole problems even without
the keyword).

**Hybrid (default):** Combines full-text + vector results using Reciprocal Rank
Fusion (RRF) implemented as a SQL CTE (see §7.0). This is the default for all
search bar queries — keyword precision + semantic recall.

**Note:** Azure AI Search's semantic reranking is not available with pgvector.
The RRF fusion and rich taxonomy-based structured filtering compensate at MVP
scale. If search quality needs improve, AI Search can be added as an upgrade.

### 7.3 Worked Example Queries

#### Example 1: "Find geometry problems about cyclic quadrilaterals"

```sql
-- User types: "cyclic quadrilateral geometry"
-- UI has filter: topics = GEO-S
-- $query_vector = await embed("cyclic quadrilateral geometry problems")

WITH text_results AS (
  SELECT p.id, ts_rank(p.search_tsv, q) AS text_score,
         ROW_NUMBER() OVER (ORDER BY ts_rank(p.search_tsv, q) DESC) AS text_rank
  FROM problems p, plainto_tsquery('english', 'cyclic quadrilateral') q
  WHERE p.search_tsv @@ q
  LIMIT 50
),
vector_results AS (
  SELECT p.id, 1 - (p.statement_vector <=> $query_vector) AS vector_score,
         ROW_NUMBER() OVER (ORDER BY p.statement_vector <=> $query_vector) AS vector_rank
  FROM problems p
  ORDER BY p.statement_vector <=> $query_vector
  LIMIT 50
),
rrf AS (
  SELECT COALESCE(t.id, v.id) AS id,
         COALESCE(1.0 / (60 + t.text_rank), 0) +
         COALESCE(1.0 / (60 + v.vector_rank), 0) AS rrf_score
  FROM text_results t FULL OUTER JOIN vector_results v ON t.id = v.id
)
SELECT p.*, rrf.rrf_score
FROM rrf JOIN problems p ON rrf.id = p.id
-- Structured filter: only GEO-S problems
WHERE EXISTS (
  SELECT 1 FROM problem_topics pt JOIN topics t ON pt.topic_id = t.id
  WHERE pt.problem_id = p.id AND t.code = 'GEO-S'
)
ORDER BY rrf.rrf_score DESC
LIMIT 20;
```

**What each search mode contributes:**
- **tsvector:** Finds problems with "cyclic quadrilateral" in the statement
- **pgvector:** Also finds problems about "inscribed quadrilaterals in a circle"
  or "Ptolemy's inequality" (semantically related, different wording)
- **SQL filter:** Excludes analytic geometry (GEO-A) and non-geometry problems

#### Example 2: "Find problems similar to this one"

```sql
-- User clicks "Find similar" on problem prob-abc-123
-- System reads the problem's embedding directly from PostgreSQL

SELECT p.id, p.title, p.statement,
       1 - (p.statement_vector <=> source.statement_vector) AS similarity
FROM problems p,
     (SELECT statement_vector FROM problems WHERE id = 'prob-abc-123') source
WHERE p.id != 'prob-abc-123'
ORDER BY p.statement_vector <=> source.statement_vector
LIMIT 10;
```

**Why vector-only works here:** "Similar" means mathematically related structure,
not keyword overlap. Two problems about the same concept may use completely
different phrasing. Vector similarity captures this better than full-text.

**Advantage over the previous AI Search design:** The source problem's embedding
is already stored in PostgreSQL — no need to re-embed it. The query is a single
SQL statement with no external API call.

**Post-processing:** The API also checks `problem_relationships` for curated
similar/variant links (stored via ProblemRelationship entity) and merges those
results with the vector search results, deduplicating by ID.

#### Example 3: "Find beginner-friendly invariant problems"

```sql
-- User types: "invariant problems for beginners"
-- System applies taxonomy-driven filters
-- $query_vector = await embed("beginner friendly invariant parity problems")

SELECT p.id, p.title, p.statement, p.competition_level, p.entry_barrier,
       1 - (p.statement_vector <=> $query_vector) AS similarity
FROM problems p
WHERE p.competition_level IN ('local', 'state')
  AND p.entry_barrier = 'transparent'
  AND EXISTS (
    SELECT 1 FROM problem_techniques pt JOIN techniques t ON pt.technique_id = t.id
    WHERE pt.problem_id = p.id AND t.code IN ('T-PARITY', 'T-COLOURING', 'T-MODINV')
  )
  AND p.search_tsv @@ plainto_tsquery('english', 'invariant')
ORDER BY p.statement_vector <=> $query_vector
LIMIT 15;
```

**How taxonomy makes this work:**
- `techniques` filter targets the specific foundational invariant techniques
  from the GAME domain (Tier 1: `T-PARITY`, `T-COLOURING`, `T-TILING`)
- `competition_level` filters to the local/state pipeline stage
- `entry_barrier: transparent` ensures the student can see how to start

#### Example 4: "Build a short number theory practice set"

```typescript
// Chat message: "Give me 6 number theory problems for a 2-hour session,
//                mix of modular arithmetic and divisibility, state level"

// Step 1: RETRIEVE — hybrid search via PostgreSQL
const queryVector = await embed("number theory modular arithmetic divisibility practice");

const candidates = await db.query(`
  WITH text_results AS (
    SELECT p.id, ts_rank(p.search_tsv, q) AS text_score,
           ROW_NUMBER() OVER (ORDER BY ts_rank(p.search_tsv, q) DESC) AS text_rank
    FROM problems p, plainto_tsquery('english', 'number theory modular arithmetic divisibility') q
    WHERE p.search_tsv @@ q
    LIMIT 50
  ),
  vector_results AS (
    SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.statement_vector <=> $1) AS vector_rank
    FROM problems p
    ORDER BY p.statement_vector <=> $1
    LIMIT 50
  ),
  rrf AS (
    SELECT COALESCE(t.id, v.id) AS id,
           COALESCE(1.0 / (60 + t.text_rank), 0) +
           COALESCE(1.0 / (60 + v.vector_rank), 0) AS rrf_score
    FROM text_results t FULL OUTER JOIN vector_results v ON t.id = v.id
  )
  SELECT p.id, p.title, p.statement, p.competition_level, rrf.rrf_score
  FROM rrf JOIN problems p ON rrf.id = p.id
  WHERE p.competition_level = 'state'
    AND EXISTS (SELECT 1 FROM problem_topics pt JOIN topics t ON pt.topic_id = t.id
                WHERE pt.problem_id = p.id AND t.code = 'NT')
    AND EXISTS (SELECT 1 FROM problem_subtopics ps JOIN subtopics s ON ps.subtopic_id = s.id
                WHERE ps.problem_id = p.id AND s.code IN ('NT-MOD', 'NT-MOD-BAS', 'NT-DIV'))
  ORDER BY rrf.rrf_score DESC
  LIMIT 20
`, [queryVector]);

// Step 2: GENERATE — LLM selects and sequences
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: `You are a math olympiad coach.
Select 6 problems from the RETRIEVED SET for a 2-hour practice session.
Sequence them: 2 warm-up (routine), 3 main (insightful), 1 stretch (inventive).
Only reference problems by their [id].` },
    { role: "user", content: `Build a number theory practice set.
Retrieved problems: ${JSON.stringify(candidates)}` },
  ],
});

// Returns a curated set of 6 problems with ordering rationale
```

**Key design point:** The search layer retrieves a broad candidate set (20
problems). The LLM in the chat layer curates and sequences — it doesn't search
the database directly. This separation keeps search deterministic and cheap.

---

## 8. Search API

### 8.1 Endpoint

```
GET /api/search?q={query}&topics={topic_codes}&level={competition_level}&...
```

### 8.2 Query Parameters

| Param | Type | Required | Example |
|-------|------|----------|---------|
| `q` | string | Yes | `"pigeonhole number theory"` |
| `topics` | string (comma-sep) | No | `"NT,COMB-S"` |
| `subtopics` | string (comma-sep) | No | `"NT-MOD"` |
| `techniques` | string (comma-sep) | No | `"T-PHP,T-FLT"` |
| `level` | string | No | `"national"` |
| `proof_style` | string | No | `"existence"` |
| `competition` | string | No | `"IMO"` |
| `year_min` | int | No | `2015` |
| `year_max` | int | No | `2024` |
| `language` | string | No | `"en"` |
| `page` | int | No | `1` (default) |
| `page_size` | int | No | `20` (default, max 50) |

### 8.3 Query Construction

The Search API builds a hybrid SQL query from the parameters. Because search
and data live in the same PostgreSQL database, there is no separate enrichment
step — the query returns full problem data in a single round-trip.

```typescript
async function executeSearch(params: SearchParams): Promise<ProblemCard[]> {
  // 1. Embed the query text for vector search
  const queryVector = await embed(params.q);

  // 2. Build SQL with dynamic WHERE clauses
  const conditions: string[] = [];
  const values: any[] = [queryVector, params.q];
  let paramIdx = 3;

  if (params.topics) {
    conditions.push(`EXISTS (SELECT 1 FROM problem_topics pt JOIN topics t ON pt.topic_id = t.id
      WHERE pt.problem_id = p.id AND t.code = ANY($${paramIdx}))`);
    values.push(params.topics);
    paramIdx++;
  }
  if (params.level) {
    conditions.push(`p.competition_level = $${paramIdx}`);
    values.push(params.level);
    paramIdx++;
  }
  if (params.proof_style) {
    conditions.push(`p.proof_style = $${paramIdx}`);
    values.push(params.proof_style);
    paramIdx++;
  }
  if (params.year_min) {
    conditions.push(`p.source_year >= $${paramIdx}`);
    values.push(params.year_min);
    paramIdx++;
  }
  if (params.year_max) {
    conditions.push(`p.source_year <= $${paramIdx}`);
    values.push(params.year_max);
    paramIdx++;
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  // 3. Execute hybrid search (tsvector + pgvector + RRF)
  const result = await db.query(`
    WITH text_results AS (
      SELECT p.id, ts_rank(p.search_tsv, q) AS text_score,
             ROW_NUMBER() OVER (ORDER BY ts_rank(p.search_tsv, q) DESC) AS text_rank
      FROM problems p, plainto_tsquery('english', $2) q
      WHERE p.search_tsv @@ q
      LIMIT 50
    ),
    vector_results AS (
      SELECT p.id,
             ROW_NUMBER() OVER (ORDER BY p.statement_vector <=> $1) AS vector_rank
      FROM problems p
      ORDER BY p.statement_vector <=> $1
      LIMIT 50
    ),
    rrf AS (
      SELECT COALESCE(t.id, v.id) AS id,
             COALESCE(1.0 / (60 + t.text_rank), 0) +
             COALESCE(1.0 / (60 + v.vector_rank), 0) AS rrf_score
      FROM text_results t FULL OUTER JOIN vector_results v ON t.id = v.id
    )
    SELECT p.id, p.title, p.statement, p.answer,
           p.source_year, p.source_round, p.language,
           p.competition_level, p.proof_style,
           p.creativity_demand, p.technique_depth, p.entry_barrier,
           c.abbreviation AS competition,
           rrf.rrf_score AS search_score,
           json_agg(DISTINCT jsonb_build_object(
             'code', tech.code, 'name', tech.name, 'cognitive_load', tech.cognitive_load
           )) AS techniques,
           json_agg(DISTINCT jsonb_build_object(
             'code', top.code, 'name', top.name
           )) AS topics
    FROM rrf
    JOIN problems p ON rrf.id = p.id
    LEFT JOIN competitions c ON p.source_competition_id = c.id
    LEFT JOIN problem_techniques pt ON p.id = pt.problem_id
    LEFT JOIN techniques tech ON pt.technique_id = tech.id
    LEFT JOIN problem_topics ptop ON p.id = ptop.problem_id
    LEFT JOIN topics top ON ptop.topic_id = top.id
    ${whereClause}
    GROUP BY p.id, c.abbreviation, rrf.rrf_score
    ORDER BY rrf.rrf_score DESC
    LIMIT ${params.page_size} OFFSET ${(params.page - 1) * params.page_size}
  `, values);

  return result.rows;
}
```

**Key advantage over the previous dual-store design:** No enrichment step needed.
Search and data live in the same database, so the query returns full problem data
(LaTeX statements, solutions, technique names) in a single SQL round-trip.

### 8.5 Response Shape

```json
{
  "results": [
    {
      "id": "prob-abc-123",
      "title": "Divisibility and Modular Arithmetic",
      "statement": "Let $p$ be a prime and $a$ an integer not divisible by $p$...",
      "answer": "$p - 1$",
      "competition": "IMO",
      "source_year": 2019,
      "source_round": "P4",
      "competition_level": "international",
      "topics": [{ "code": "NT", "name": "Number Theory & Arithmetic" }],
      "techniques": [
        { "code": "T-FLT", "name": "Fermat's Little Theorem", "cognitive_load": "intermediate" },
        { "code": "T-ORD", "name": "Order of an Element mod n", "cognitive_load": "intermediate" }
      ],
      "proof_style": "computation",
      "creativity_demand": "insightful",
      "technique_depth": "compound",
      "search_score": 0.87
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

---

## 9. Chat Retrieval Flow

The chat API follows the RAG pattern defined in `02-mvp-architecture.md` §4.4.
Here is the detailed implementation for Phase 1:

### 9.1 Endpoint

```
POST /api/chat
{
  "message": "Find 3 problems that combine pigeonhole with modular arithmetic",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "filters": {                    // optional — pre-applied by UI filter panel
    "level": "national",
    "topics": ["NT", "COMB-S"]
  }
}
```

### 9.2 Retrieval Step

```typescript
async function retrieveProblems(message: string, filters?: Filters): Promise<Problem[]> {
  // 1. Embed the user message
  const queryVector = await embed(message);

  // 2. Hybrid search via PostgreSQL (reuses the same search logic from §8.3)
  const results = await executeSearch({
    q: message,
    topics: filters?.topics,
    level: filters?.level,
    page: 1,
    page_size: 10,
  });

  return results;
}
```

### 9.3 Generation Step

```typescript
async function generateChatResponse(
  message: string,
  history: Message[],
  retrievedProblems: Problem[]
): Promise<ChatResponse> {

  const systemPrompt = `You are a math olympiad coach assistant. You help trainers
find and understand olympiad problems.

RULES:
1. ONLY reference problems from the RETRIEVED SET below. Never invent problems.
2. When citing a problem, use its ID in brackets: [prob-abc-123]
3. Show the problem statement when recommending it.
4. Explain WHY each problem is relevant to the user's request.
5. If the retrieved set doesn't contain good matches, say so honestly.
6. Use LaTeX notation for mathematical expressions.

RETRIEVED PROBLEMS:
${retrievedProblems.map(p => `
[${p.id}] ${p.title}
Source: ${p.source_competition} ${p.source_year} ${p.source_round ?? ""}
Level: ${p.competition_level}
Topics: ${p.topics.join(", ")}
Techniques: ${p.techniques.join(", ")}
Statement: ${p.statement}
`).join("\n---\n")}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
    temperature: 0.3,    // low temperature for factual retrieval
    max_tokens: 1500,
  });

  // Extract cited problem IDs from response
  const citedIds = extractCitations(response.content);  // regex: /\[prob-[a-z0-9-]+\]/g

  return {
    response: response.content,
    cited_problems: retrievedProblems.filter(p => citedIds.includes(p.id)),
  };
}
```

### 9.4 Chat Response Shape

```json
{
  "response": "Here are 3 problems that combine the Pigeonhole Principle with modular arithmetic:\n\n**1. [prob-abc-123] Residues on a Circle**\nSource: IMO 2019, P4\n...\n\n**2. [prob-def-456] Coloured Integers**\n...",
  "cited_problems": [
    { "id": "prob-abc-123", "title": "Residues on a Circle", "statement": "...", "techniques": ["T-PHP", "T-CONGBASIC"] },
    { "id": "prob-def-456", "title": "Coloured Integers", "statement": "...", "techniques": ["T-PHP", "T-FLT"] }
  ]
}
```

---

## 10. Import Cost Estimate

| Step | Resource | Estimated Cost |
|------|----------|---------------|
| Download datasets | Bandwidth | Free (HF, GitHub) |
| Store raw snapshots | Blob Storage | ~$0.01 |
| AI classification (12,000 problems, Batch API) | GPT-4o-mini (input: 30M tok, output: 2.4M tok) | ~$3.00 |
| Embedding generation (12,000 × ~200 tok) | text-embedding-3-small | ~$0.05 |
| PostgreSQL writes (+ vector column) | Included in monthly cost | $0 incremental |
| **Total one-time import cost** | | **~$3.06** |

This is **one-time** — the cost of importing the initial corpus. Subsequent
dataset updates (re-importing with new problems) are incremental: only new
problems (dedup-filtered) incur classification costs.

---

## 11. Implementation Order

| Step | What | Depends On | Effort |
|------|------|------------|--------|
| 1 | PostgreSQL schema (domain model tables + pgvector + tsvector + import_records) | — | 3–4 days |
| 2 | Seed taxonomy reference data (topics, subtopics, techniques, competitions) | Step 1 | 2 days |
| 3 | Source adapters (Omni-MATH first, then others) | Step 1 | 3–4 days |
| 4 | LaTeX normalisation + dedup module | — | 2 days |
| 5 | AI classification function + prompt engineering | Step 2 | 3–5 days |
| 6 | Store function (PostgreSQL write with embedding) | Step 1 | 1–2 days |
| 7 | Run full import pipeline | Steps 3–6 | 1 day |
| 8 | Search API (hybrid: tsvector + pgvector + SQL filters) | Steps 1, 7 | 3–4 days |
| 9 | Chat API (RAG) | Steps 7, 8 | 3–4 days |
| 10 | React UI (search + chat + problem cards) | Steps 8, 9 | 2–3 weeks |
| **Total** | | | **6–8 weeks** |

---

## 12. Error Handling

### 12.1 Per-Problem Errors

The pipeline processes problems individually. A single problem failure must NOT
block the rest of the import batch.

| Error | Cause | Action |
|-------|-------|--------|
| **Parse failure** | Source record missing `problem` field or malformed JSON | Log error, skip problem, increment `skipped` counter |
| **LaTeX normalisation failure** | Unparseable LaTeX (e.g., broken delimiters) | Store raw statement as-is, flag `needs_review: true` |
| **Dedup collision** | SHA-256 hash already in `import_records` | Skip silently, log as `duplicate` |
| **Classification failure** | GPT-4o-mini returns invalid JSON or codes not in taxonomy | Retry once with correction prompt; if still invalid, store problem with `status: draft` and empty classification (flag for manual review) |
| **Classification timeout** | Batch API exceeds 24h or individual call hangs | Retry the batch; problems already stored are idempotent via dedup hash |
| **Embedding failure** | OpenAI API error | Retry with exponential backoff (3 attempts); if still failing, store in PostgreSQL without embedding (vector search won't find it, but text search and filters will) |
| **PostgreSQL write failure** | Constraint violation, connection error | Rollback transaction, log full error, add to dead-letter queue for manual inspection |

### 12.2 Batch-Level Tracking

Each import run produces a summary:

```json
{
  "run_id": "import-2026-07-18-omni-math",
  "source_dataset": "omni-math",
  "started_at": "2026-07-18T10:00:00Z",
  "completed_at": "2026-07-18T10:45:00Z",
  "total_records": 4428,
  "imported": 4102,
  "duplicates_skipped": 280,
  "classification_failures": 12,
  "parse_errors": 3,
  "flagged_for_review": 31,
  "status": "completed_with_warnings"
}
```

Stored in an `import_runs` table for auditability.

### 12.3 Idempotency

The pipeline is safe to re-run. The `dedup_hash` UNIQUE constraint on
`import_records` prevents double-inserts. Re-running a source adapter on the
same dataset version produces zero new rows (all skipped as duplicates).

---

## 13. Project Structure

```
mathpilot/
├── apps/
│   └── web/                          # React SPA (Vite)
│       ├── src/
│       │   ├── components/
│       │   │   ├── ProblemCard.tsx
│       │   │   ├── SearchBar.tsx
│       │   │   ├── FilterPanel.tsx
│       │   │   └── ChatPanel.tsx
│       │   ├── pages/
│       │   │   ├── SearchPage.tsx
│       │   │   ├── BrowsePage.tsx
│       │   │   └── ChatPage.tsx
│       │   ├── services/
│       │   │   └── api.ts            # API client
│       │   └── App.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── functions/                        # Azure Functions (single Function App)
│   ├── src/
│   │   ├── api/
│   │   │   ├── search.ts             # GET /api/search
│   │   │   ├── browse.ts             # GET /api/problems
│   │   │   └── chat.ts               # POST /api/chat
│   │   │
│   │   ├── import/
│   │   │   ├── adapters/
│   │   │   │   ├── types.ts          # SourceAdapter interface, CanonicalProblem
│   │   │   │   ├── omni-math.ts
│   │   │   │   ├── olympiad-bench.ts
│   │   │   │   ├── olympmath.ts
│   │   │   │   └── numina-math.ts
│   │   │   ├── normalise/
│   │   │   │   ├── latex.ts          # LaTeX normalisation + plain text
│   │   │   │   ├── dedup.ts          # SHA-256 dedup hash
│   │   │   │   └── competition.ts    # Competition name resolution map
│   │   │   ├── classify/
│   │   │   │   ├── classifier.ts     # GPT-4o-mini classification caller
│   │   │   │   ├── prompts.ts        # System + user prompt templates
│   │   │   │   └── validate.ts       # Post-classification validation rules
│   │   │   ├── store/
│   │   │   │   └── postgres.ts       # PostgreSQL write logic (+ embedding)
│   │   │   └── run-import.ts         # Orchestrator: fetch → normalise → classify → store
│   │   │
│   │   └── shared/
│   │       ├── db.ts                 # PostgreSQL connection pool (+ pgvector)
│   │       ├── openai.ts             # Azure OpenAI client
│   │       └── search.ts             # Hybrid search query builder (tsvector + pgvector)
│   │
│   ├── host.json
│   ├── package.json
│   └── tsconfig.json
│
├── db/
│   ├── migrations/
│   │   ├── 001_create_taxonomy.sql   # topics, subtopics, techniques, learning_objectives
│   │   ├── 002_create_problems.sql   # problems, solutions, problem_relationships, translations
│   │   ├── 003_create_join_tables.sql# problem_topics, problem_subtopics, problem_techniques, etc.
│   │   ├── 004_create_competitions.sql
│   │   └── 005_create_import_tables.sql  # import_records, import_runs
│   └── seed/
│       ├── topics.sql                # 8 domains from taxonomy.md
│       ├── subtopics.sql             # 58 subtopics from taxonomy.md
│       ├── techniques.sql            # 160+ techniques from taxonomy.md
│       └── competitions.sql          # Known competitions (IMO, USAMO, OMM, etc.)
│
├── infra/
│   ├── main.bicep                    # All Azure resources
│   ├── modules/
│   │   ├── functions.bicep
│   │   ├── postgres.bicep
│   │   ├── search.bicep
│   │   ├── openai.bicep
│   │   └── storage.bicep
│   └── parameters.json
│
├── docs/                             # ← existing documentation (this repo)
│   ├── domain-model.md
│   ├── taxonomy.md
│   ├── taxonomy-integration.md
│   └── plan/
│       ├── 01-product-analysis.md
│       ├── 02-mvp-architecture.md
│       └── 03-dataset-import-search.md
│
├── .github/
│   └── workflows/
│       ├── deploy-web.yml            # CI/CD: build + deploy React SPA
│       └── deploy-functions.yml      # CI/CD: build + deploy Azure Functions
│
├── package.json                      # Workspace root (monorepo)
└── README.md
```

**Key conventions:**
- **Monorepo** with `apps/` (frontend) and `functions/` (backend) workspaces
- Import adapters are pluggable: add a new file in `adapters/` for each source
- Database migrations are numbered and sequential
- Seed data is generated directly from `taxonomy.md` codes and names
- Infrastructure as Code via Bicep (matching `02-mvp-architecture.md` §10)

---

## 14. Open Questions

| # | Question | Decision Needed By |
|---|----------|--------------------|
| 1 | ~~Should we start with AI Search Free tier?~~ **Resolved:** Using pgvector in PostgreSQL instead of AI Search. No separate search service needed. | ✅ Resolved |
| 2 | Should the import pipeline run as a one-shot script or as Azure Functions? Script is simpler for a one-time import. | Before Step 4 |
| 3 | How compressed should the taxonomy reference be in the classification prompt? Need to balance accuracy vs. token cost. | Before Step 6 |
| 4 | Should NuminaMath's `olympiads` subset be filtered further? 50k problems may include non-olympiad competition math. | Before Step 8 |
| 5 | What is the minimum classification accuracy we accept before human review? 80%? 90%? | Before Step 8 |
