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

Strip LaTeX to produce `statement_plain` for BM25 full-text search in AI Search:

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
│  (raw dataset         Problem             GPT-4o-mini        + AI Search  │
│   snapshots)          (in-memory)         (batch API)        index        │
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
- Send in batches of 100 problems per request
- ~12,000 problems × ~800 tokens/problem ≈ 10M tokens ≈ **$1.50** with Batch API
- Include source hints to improve accuracy and reduce token usage

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

Write the classified problem to both PostgreSQL and Azure AI Search:

**PostgreSQL writes (single transaction per problem):**

```sql
BEGIN;

-- 1. Upsert competition (if resolved from source)
INSERT INTO competitions (id, abbreviation, name, level, is_active)
VALUES ($1, $2, $3, $4, false)
ON CONFLICT (abbreviation) DO NOTHING;

-- 2. Insert problem
INSERT INTO problems (
  id, title, statement, source_competition_id, source_year,
  source_round, answer, language, status,
  competition_level, position_in_paper, technique_depth,
  creativity_demand, proof_style, entry_barrier,
  estimated_solve_time_minutes, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
  'draft',  -- all imports start as draft
  $9, $10, $11, $12, $13, $14, $15, NOW());

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

**AI Search write (after PostgreSQL commit):**

Push a flattened document to the `problems` index (schema defined in
`02-mvp-architecture.md` §3.5) plus the embedding:

```typescript
const searchDoc = {
  id: problem.id,
  title: problem.title,
  statement: problem.statement_plain,  // plain text for BM25
  source_competition: problem.source_competition,
  source_year: problem.source_year,
  competition_level: problem.competition_level,
  topics: problem.topics,
  subtopics: problem.subtopics,
  techniques: problem.techniques.map(t => t.code),
  proof_style: problem.proof_style,
  creativity_demand: problem.creativity_demand,
  technique_depth: problem.technique_depth,
  entry_barrier: problem.entry_barrier,
  language: problem.language,
  statement_vector: await embed(problem.statement_plain),
};

await searchClient.uploadDocuments([searchDoc]);
```

**Embedding generation:** `text-embedding-3-small` (1536 dimensions).
~12,000 problems × ~200 tokens avg = 2.4M tokens ≈ **$0.05** total.

---

## 6. Import Tracking Schema

New table in PostgreSQL (MVP-only, not part of core domain model):

```sql
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

## 7. Azure AI Search Index

The index schema is defined in `02-mvp-architecture.md` §3.5. Here is the
full index definition for deployment:

```json
{
  "name": "problems",
  "fields": [
    { "name": "id",                "type": "Edm.String",  "key": true, "filterable": true },
    { "name": "title",             "type": "Edm.String",  "searchable": true },
    { "name": "statement",         "type": "Edm.String",  "searchable": true, "analyzerName": "en.microsoft" },
    { "name": "source_competition","type": "Edm.String",  "filterable": true, "facetable": true },
    { "name": "source_year",       "type": "Edm.Int32",   "filterable": true, "sortable": true, "facetable": true },
    { "name": "competition_level", "type": "Edm.String",  "filterable": true, "facetable": true },
    { "name": "topics",            "type": "Collection(Edm.String)", "filterable": true, "facetable": true },
    { "name": "subtopics",         "type": "Collection(Edm.String)", "filterable": true, "facetable": true },
    { "name": "techniques",        "type": "Collection(Edm.String)", "filterable": true, "facetable": true },
    { "name": "proof_style",       "type": "Edm.String",  "filterable": true, "facetable": true },
    { "name": "creativity_demand", "type": "Edm.String",  "filterable": true, "facetable": true },
    { "name": "technique_depth",   "type": "Edm.String",  "filterable": true, "facetable": true },
    { "name": "entry_barrier",     "type": "Edm.String",  "filterable": true, "facetable": true },
    { "name": "language",          "type": "Edm.String",  "filterable": true, "facetable": true },
    {
      "name": "statement_vector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "dimensions": 1536,
      "vectorSearchProfile": "default-vector-profile"
    }
  ],
  "vectorSearch": {
    "algorithms": [
      { "name": "hnsw-algo", "kind": "hnsw", "hnswParameters": { "m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine" } }
    ],
    "profiles": [
      { "name": "default-vector-profile", "algorithmConfigurationName": "hnsw-algo" }
    ]
  },
  "semantic": {
    "configurations": [
      {
        "name": "default-semantic",
        "prioritizedFields": {
          "titleField": { "fieldName": "title" },
          "contentFields": [{ "fieldName": "statement" }]
        }
      }
    ]
  }
}
```

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

The Search API builds a hybrid query from the parameters:

```typescript
async function buildSearchQuery(params: SearchParams): Promise<SearchRequest> {
  // 1. Build OData filter from structured params
  const filters: string[] = [];
  if (params.topics)
    filters.push(params.topics.map(t => `topics/any(x: x eq '${t}')`).join(' or '));
  if (params.level)
    filters.push(`competition_level eq '${params.level}'`);
  if (params.proof_style)
    filters.push(`proof_style eq '${params.proof_style}'`);
  if (params.competition)
    filters.push(`source_competition eq '${params.competition}'`);
  if (params.year_min)
    filters.push(`source_year ge ${params.year_min}`);
  if (params.year_max)
    filters.push(`source_year le ${params.year_max}`);

  // 2. Embed the query text for vector search
  const queryVector = await embed(params.q);

  // 3. Build hybrid request (text + vector + filters)
  return {
    search: params.q,                          // BM25 full-text
    vectorQueries: [{
      vector: queryVector,
      kNearestNeighborsCount: 50,
      fields: "statement_vector",
    }],
    filter: filters.join(' and '),
    queryType: "semantic",
    semanticConfiguration: "default-semantic",
    top: params.page_size,
    skip: (params.page - 1) * params.page_size,
    select: "id,title,statement,source_competition,source_year,competition_level,topics,subtopics,techniques,proof_style,creativity_demand,technique_depth",
  };
}
```

### 8.4 Response Enrichment

AI Search returns search-optimised documents. The API enriches results from
PostgreSQL before returning to the frontend:

```typescript
async function enrichResults(searchResults: SearchResult[]): Promise<ProblemCard[]> {
  const ids = searchResults.map(r => r.id);

  // Single query: get full LaTeX statements + solutions + technique names
  const enriched = await db.query(`
    SELECT
      p.id, p.title, p.statement, p.answer,
      p.source_year, p.source_round, p.language,
      c.abbreviation AS competition,
      json_agg(DISTINCT jsonb_build_object(
        'code', t.code, 'name', t.name, 'cognitive_load', t.cognitive_load
      )) AS techniques,
      json_agg(DISTINCT jsonb_build_object(
        'code', top.code, 'name', top.name
      )) AS topics
    FROM problems p
    LEFT JOIN competitions c ON p.source_competition_id = c.id
    LEFT JOIN problem_techniques pt ON p.id = pt.problem_id
    LEFT JOIN techniques t ON pt.technique_id = t.id
    LEFT JOIN problem_topics ptop ON p.id = ptop.problem_id
    LEFT JOIN topics top ON ptop.topic_id = top.id
    WHERE p.id = ANY($1)
    GROUP BY p.id, c.abbreviation
  `, [ids]);

  return enriched.map(row => ({
    ...row,
    search_score: searchResults.find(r => r.id === row.id)?.score,
  }));
}
```

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

  // 2. Search with optional filters
  const results = await searchClient.search({
    search: message,
    vectorQueries: [{ vector: queryVector, kNearestNeighborsCount: 20, fields: "statement_vector" }],
    filter: buildFilterString(filters),
    queryType: "semantic",
    top: 10,
    select: "id,title,statement,source_competition,source_year,topics,subtopics,techniques,competition_level,proof_style",
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
| AI classification (12,000 problems × ~800 tok) | GPT-4o-mini Batch API | ~$1.50 |
| Embedding generation (12,000 × ~200 tok) | text-embedding-3-small | ~$0.05 |
| PostgreSQL writes | Included in monthly cost | $0 incremental |
| AI Search indexing | Included in monthly cost | $0 incremental |
| **Total one-time import cost** | | **~$1.56** |

---

## 11. Implementation Order

| Step | What | Depends On | Effort |
|------|------|------------|--------|
| 1 | PostgreSQL schema (domain model tables + import_records) | — | 3–4 days |
| 2 | Seed taxonomy reference data (topics, subtopics, techniques, competitions) | Step 1 | 2 days |
| 3 | AI Search index creation | — | 1 day |
| 4 | Source adapters (Omni-MATH first, then others) | Step 1 | 3–4 days |
| 5 | LaTeX normalisation + dedup module | — | 2 days |
| 6 | AI classification function + prompt engineering | Step 2 | 3–5 days |
| 7 | Store function (PostgreSQL + AI Search writes) | Steps 1, 3 | 2 days |
| 8 | Run full import pipeline | Steps 4–7 | 1 day |
| 9 | Search API | Steps 1, 3, 8 | 3–4 days |
| 10 | Chat API (RAG) | Steps 8, 9 | 3–4 days |
| 11 | React UI (search + chat + problem cards) | Steps 9, 10 | 2–3 weeks |
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
| **Embedding failure** | OpenAI API error | Retry with exponential backoff (3 attempts); if still failing, store in PostgreSQL without AI Search entry (add to search index later) |
| **PostgreSQL write failure** | Constraint violation, connection error | Rollback transaction, log full error, add to dead-letter queue for manual inspection |
| **AI Search write failure** | Index unavailable or quota exceeded | Store in PostgreSQL (source of truth); queue for AI Search retry |

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
│   │   │   │   ├── postgres.ts       # PostgreSQL write logic
│   │   │   │   └── search-index.ts   # AI Search document push
│   │   │   └── run-import.ts         # Orchestrator: fetch → normalise → classify → store
│   │   │
│   │   └── shared/
│   │       ├── db.ts                 # PostgreSQL connection pool
│   │       ├── openai.ts             # Azure OpenAI client
│   │       └── search.ts             # AI Search client
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
| 1 | Should we start with AI Search **Free tier** (no vector search) and upgrade to Basic later? Saves $75/month but loses semantic search. | Before Step 3 |
| 2 | Should the import pipeline run as a one-shot script or as Azure Functions? Script is simpler for a one-time import. | Before Step 4 |
| 3 | How compressed should the taxonomy reference be in the classification prompt? Need to balance accuracy vs. token cost. | Before Step 6 |
| 4 | Should NuminaMath's `olympiads` subset be filtered further? 50k problems may include non-olympiad competition math. | Before Step 8 |
| 5 | What is the minimum classification accuracy we accept before human review? 80%? 90%? | Before Step 8 |
