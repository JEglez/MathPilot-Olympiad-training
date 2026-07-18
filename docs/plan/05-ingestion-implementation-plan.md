# MathPilot — Ingestion Pipeline Implementation Plan

> **Date**: July 2026
> **Status**: Draft
> **Scope**: Concrete implementation plan for importing olympiad datasets into PostgreSQL with pgvector.
> **Dependencies**: [domain-model.md](../domain-model.md), [taxonomy.md](../taxonomy.md),
> [02-mvp-architecture.md](02-mvp-architecture.md), [03-dataset-import-search.md](03-dataset-import-search.md),
> [04-mvp-implementation-roadmap.md](04-mvp-implementation-roadmap.md)

---

## 1. Objective

Import ~12,000 olympiad problems from 4 open datasets (Omni-MATH, OlympiadBench,
OlymMATH, NuminaMath) into PostgreSQL with pgvector, fully classified against the
MathPilot taxonomy, with embeddings for hybrid search.

**Why now:** This is the cold-start problem — the platform has zero value without
a classified problem corpus. Everything else (search, chat, recommendations)
depends on having problems in the database.

---

## 2. Constitution Check

Applicable tenets from `docs/governance/constitution.md`:

| Tenet | How It Applies |
|-------|---------------|
| **§2.1 Domain Integrity Is Sacred** | Every imported problem maps to the canonical Problem entity. AI classifications are `ai_proposed` — never auto-published. Taxonomy codes must exist in the reference tables. |
| **§2.2 AI Assists, Humans Decide** | GPT-4o-mini classifies; all results start as `status: 'draft'`. Low-confidence results flagged for review. Classification metadata (model, prompt version, confidence) stored for audit. |
| **§2.3 Correctness Over Speed** | Validation at every boundary — Zod schemas for source data, taxonomy code validation post-classification, dedup before insert. |
| **§2.4 Cost Discipline** | AI at ingestion only. Batch API (50% discount). Embeddings pre-computed. Target: ~$3 one-time. |
| **§2.5 Open by Default** | No secrets in code. Connection strings from environment/Key Vault. All source datasets are Apache-2.0 or MIT licensed. |

---

## 3. Architecture

Per `docs/governance/architecture-principles.md`:

### Bounded Contexts Involved

| Context | Role in Ingestion |
|---------|-------------------|
| **Ingestion** (owns pipeline) | IngestionJob tracking, classification results, import orchestration |
| **Taxonomy** (read-only) | Provides Topic/Subtopic/Technique/LO reference data for validation |
| **Problem Corpus** (write target) | Receives classified Problem, Solution, Competition entities |

### Layer Assignment

```
Domain Layer (src/domain/)
├── ingestion/          → CanonicalProblem type, validation rules, dedup logic
├── problem/            → Problem entity, Solution entity
└── taxonomy/           → Topic, Subtopic, Technique types (read-only in this context)

Application Layer (src/application/)
└── ingestion/          → ImportPipelineUseCase orchestration

Infrastructure Layer (src/infrastructure/)
├── adapters/           → Source dataset adapters (Omni-MATH, OlympiadBench, etc.)
├── ai/                 → ClassificationAdapter, EmbeddingAdapter (behind domain interfaces)
├── database/           → PostgreSQL repository implementations
└── storage/            → Blob storage for raw dataset snapshots
```

### Dependency Direction

```
Infrastructure (adapters, AI, DB) → Application (use cases) → Domain (types, rules)
```

Domain has zero external imports. AI services wrapped behind interfaces
`ProblemClassifier` and `EmbeddingGenerator` defined in the domain layer.

---

## 4. Implementation Steps

### Prerequisites & Setup

#### Task 0.1 — Azure Resources

**What:** Provision PostgreSQL Flexible Server (B1ms) with pgvector, Azure OpenAI
(GPT-4o-mini + text-embedding-3-small deployments), Blob Storage, Key Vault.

**Files:**
- `infra/main.bicep` — Resource definitions
- `infra/parameters.prod.json` — Production parameters

**Layer:** Infrastructure (IaC)
**Dependencies:** None
**Acceptance criteria:**
- `az deployment group show` confirms all resources `Succeeded`
- pgvector enabled: `SELECT * FROM pg_extension WHERE extname = 'vector'`
- Azure OpenAI has `gpt-4o-mini` and `text-embedding-3-small` deployments
- Secrets in Key Vault, not in code

**Complexity:** M

#### Task 0.2 — Database Migrations

**What:** Create the full schema: taxonomy tables, problem tables, join tables,
search columns (pgvector + tsvector), import tracking tables, and indexes.

**Files:**
- `db/migrations/001_create_taxonomy.sql` — `topics`, `subtopics`, `techniques`, `learning_objectives`
- `db/migrations/002_create_problems.sql` — `problems` + `statement_vector vector(1536)` + `search_tsv tsvector GENERATED ALWAYS` + `solutions`, `problem_translations`, `problem_relationships`, `competitions`
- `db/migrations/003_create_join_tables.sql` — `problem_topics`, `problem_subtopics`, `problem_techniques`, `problem_learning_objectives`, `solution_techniques`
- `db/migrations/004_create_import_tables.sql` — `import_runs`, `import_records` (per `03-dataset-import-search.md` §6)
- `db/migrations/005_create_indexes.sql` — HNSW on `statement_vector`, GIN on `search_tsv`, GIN on join tables, B-tree on enum columns (per `03-dataset-import-search.md` §7.0)

**Layer:** Infrastructure
**Dependencies:** Task 0.1
**Acceptance criteria:**
- 12+ tables created
- HNSW index: `idx_problems_vector` with `m=16, ef_construction=64, vector_cosine_ops`
- GIN index: `idx_problems_search` on `search_tsv`
- `search_tsv` auto-populates from `title` (weight A) + `statement_plain` (weight B)

**DDL reference:** `02-mvp-architecture.md` §3.5 and `03-dataset-import-search.md` §7.0

**Complexity:** M

#### Task 0.3 — Taxonomy Seed Data

**What:** Populate reference tables with the full taxonomy from `docs/taxonomy.md`.

**Files:**
- `db/seed/topics.sql` — 8 domains (ALG, NT, GEO-S, GEO-A, COMB-E, COMB-S, GAME, MISC)
- `db/seed/subtopics.sql` — 58 subtopics with `topic_id` FK and `prerequisite_subtopics`
- `db/seed/techniques.sql` — 160+ techniques with `cognitive_load`, `primary_subtopic_id`, `prerequisite_techniques`
- `db/seed/competitions.sql` — Known competitions (IMO, USAMO, OMM, APMO, etc.)

**Layer:** Infrastructure
**Dependencies:** Task 0.2
**Acceptance criteria:**
- `topics` has 8 rows, `subtopics` has 58 rows, `techniques` has 160+ rows
- `competitions` has 20+ known competitions with correct `level` values
- All topic codes match `docs/taxonomy.md` Layer 1

**Complexity:** M

#### Task 0.4 — Project Scaffolding

**What:** Monorepo structure, TypeScript configuration, shared modules.

**Files:**
- `functions/package.json`, `functions/tsconfig.json`, `functions/host.json`
- `functions/src/shared/db.ts` — PostgreSQL connection pool (pg + pgvector)
- `functions/src/shared/openai.ts` — Azure OpenAI client (config-based model IDs)
- `apps/web/package.json`, `apps/web/vite.config.ts`

**Layer:** Infrastructure
**Dependencies:** Task 0.1
**Acceptance criteria:**
- `npm install` succeeds in `functions/`
- `db.ts` connects to PostgreSQL with pgvector support
- `openai.ts` reads model IDs from environment variables (not hardcoded)

**Complexity:** S

---

### Domain Types

#### Task 1.1 — Domain Types & Branded IDs

**What:** Define pure domain types for the ingestion pipeline. No external imports.

**Files:**
- `functions/src/domain/ingestion/types.ts` — `CanonicalProblem`, `SourceAdapter` interface, `ImportRun`, `ImportRecord`
- `functions/src/domain/problem/types.ts` — `ProblemId`, `SolutionId`, `CompetitionId` (branded)
- `functions/src/domain/taxonomy/types.ts` — `TopicCode`, `SubtopicCode`, `TechniqueCode` (branded), enum types
- `functions/src/domain/shared/result.ts` — `Result<T, E>` type

**Layer:** Domain (zero external dependencies)
**Dependencies:** None
**Acceptance criteria:**
- All types compile with `strict: true`
- No imports from `node_modules` in any domain file
- `CanonicalProblem` matches the schema in `03-dataset-import-search.md` §3

**Complexity:** M

See §5 (Type Design) below for detailed type definitions.

#### Task 1.2 — Domain Validation Rules

**What:** Pure functions that validate canonical problems before storage.

**Files:**
- `functions/src/domain/ingestion/validate-problem.ts`
- `functions/src/domain/ingestion/validate-problem.test.ts`

**Layer:** Domain
**Dependencies:** Task 1.1
**Acceptance criteria:**
- Validates topic/subtopic/technique codes exist (against a provided set)
- Validates enum values (`competition_level`, `proof_style`, etc.)
- Rejects problems with >5 techniques (flag for review)
- Returns `Result<ValidatedProblem, ValidationError[]>`

**Complexity:** S

#### Task 1.3 — Deduplication Logic

**What:** Pure function: normalise statement → SHA-256 hash for dedup.

**Files:**
- `functions/src/domain/ingestion/dedup.ts` — `computeDedupHash(statement: string): DedupHash`
- `functions/src/domain/ingestion/dedup.test.ts`

**Layer:** Domain
**Dependencies:** Task 1.1
**Acceptance criteria:**
- Strips LaTeX, lowercases, removes whitespace, removes "Problem N:" prefixes
- Same problem from different sources produces identical hash
- Per `03-dataset-import-search.md` §4.5

**Complexity:** S

---

### Infrastructure Adapters

#### Task 2.1 — LaTeX Normalisation

**What:** Normalise LaTeX across sources + generate plain-text for tsvector.

**Files:**
- `functions/src/infrastructure/normalise/latex.ts`
- `functions/src/infrastructure/normalise/latex.test.ts`

**Layer:** Infrastructure (string processing, no domain logic)
**Dependencies:** None
**Acceptance criteria:**
- `\( \)` → `$ $`, `\[ \]` → `$$ $$`
- NuminaMath double backslash: `\\\\frac` → `\\frac`
- `stripLaTeX()` produces searchable plain text
- Per `03-dataset-import-search.md` §4.1–§4.2

**Complexity:** M

#### Task 2.2 — Competition Resolver

**What:** Map raw source competition strings to canonical `Competition` abbreviations.

**Files:**
- `functions/src/infrastructure/normalise/competition.ts`
- `functions/src/infrastructure/normalise/competition.test.ts`

**Layer:** Infrastructure
**Dependencies:** Task 0.3 (needs competition reference data)
**Acceptance criteria:**
- Maps `"imo"` → `{ abbreviation: "IMO", level: "international" }`
- Unknown competitions create new rows with `is_active: false`
- Per `03-dataset-import-search.md` §4.3

**Complexity:** S

#### Task 2.3 — Omni-MATH Source Adapter

**What:** Download from HuggingFace, parse JSONL, map to `CanonicalProblem`.

**Files:**
- `functions/src/infrastructure/adapters/omni-math.ts`
- `functions/src/infrastructure/adapters/omni-math.test.ts`

**Layer:** Infrastructure
**Dependencies:** Tasks 1.1, 2.1, 2.2
**Acceptance criteria:**
- Parses all ~4,428 records
- Maps `domain` → topic hint, `difficulty` → `source_difficulty`
- Generates `dedup_hash` for each problem
- Solutions extracted where available
- Per `03-dataset-import-search.md` §5.2 (Omni-MATH adapter example)

**Input format:** JSONL from HuggingFace (`KbsdJames/Omni-MATH`)
**Field mapping:**
| Source Field | Target Field |
|-------------|-------------|
| `problem` | `statement` (after LaTeX normalisation) |
| `solution` | `solutions[0].body` |
| `answer` | `answer` |
| `domain` (array) | `source_domain_path` (joined with ` -> `) |
| `domain[0]` | `source_subject` (first element) |
| `difficulty` (1–10) | `source_difficulty` |
| `source` | `source_competition` (via competition map) |

**Edge cases:**
- Some records have `null` solutions — import with empty solutions array
- `domain` is hierarchical (e.g., `["Mathematics", "Algebra", "Polynomials"]`)
- `source` field contains varied competition codes — normalise via `COMPETITION_MAP`

**Complexity:** M

#### Task 2.4 — OlympiadBench Source Adapter

**What:** Download from HuggingFace, parse JSON, filter math-only, extract competition/year from filenames.

**Files:**
- `functions/src/infrastructure/adapters/olympiad-bench.ts`
- `functions/src/infrastructure/adapters/olympiad-bench.test.ts`

**Layer:** Infrastructure
**Dependencies:** Tasks 1.1, 2.1, 2.2
**Acceptance criteria:**
- Filters to math-only subset (~4,200 records)
- Extracts competition + year + problem number from filenames (e.g., `IMO_2019_P4`)
- Bilingual: stores `language: "en"`, creates translation records for Chinese

**Input format:** JSON from HuggingFace (`lmms-lab/OlympiadBench`)
**Edge cases:**
- Physics problems must be filtered out (math subset only)
- Filenames encode metadata: competition, year, problem number
- Bilingual content (EN + ZH) — primary language = EN, ZH as translation

**Complexity:** M

#### Task 2.5 — OlymMATH Source Adapter

**What:** Download from GitHub, parse JSONL.

**Files:**
- `functions/src/infrastructure/adapters/olympmath.ts`
- `functions/src/infrastructure/adapters/olympmath.test.ts`

**Layer:** Infrastructure
**Dependencies:** Tasks 1.1, 2.1
**Acceptance criteria:**
- Parses ~350 records
- Maps `subject` → topic hint
- No solutions available — imports with empty solutions array
- Bilingual (EN + ZH)

**Edge cases:**
- Smallest dataset — good for initial pipeline testing
- No competition source data — `source_competition` will be null

**Complexity:** S

#### Task 2.6 — NuminaMath Source Adapter

**What:** Download Parquet from HuggingFace, filter `source = "olympiads"`.

**Files:**
- `functions/src/infrastructure/adapters/numina-math.ts`
- `functions/src/infrastructure/adapters/numina-math.test.ts`

**Layer:** Infrastructure
**Dependencies:** Tasks 1.1, 2.1, 2.2
**Acceptance criteria:**
- Filters to `source = "olympiads"` only (~5,000 after filter)
- After dedup, ~3,000–5,000 unique problems remain
- Maps `problem_type` → topic hint

**Input format:** Parquet from HuggingFace (`AI-MO/NuminaMath-CoT`)
**Edge cases:**
- Largest source — ~50k rows before filtering
- Parquet parsing requires a library (e.g., `parquet-wasm` or download as CSV)
- CoT solutions may be verbose — store as-is, trim if >10k chars
- High overlap with other datasets — dedup essential

**Complexity:** M

---

### AI Classification Pipeline

#### Task 3.1 — Classification Prompt

**What:** Version-controlled prompt for taxonomy classification via GPT-4o-mini.

**Files:**
- `functions/src/infrastructure/ai/prompts/classify-problem.ts` — System prompt + user template + output schema
- `functions/src/infrastructure/ai/prompts/classify-problem.test.ts` — Validates prompt produces valid JSON schema

**Layer:** Infrastructure (AI adapter)
**Dependencies:** Task 0.3 (taxonomy data for condensed reference)
**Acceptance criteria:**
- System prompt ≤ 2,500 tokens (condensed taxonomy reference)
- Output schema matches `CanonicalProblem` AI-classified fields
- Temperature: 0 (per `docs/governance/ai-guidelines.md` §2.2)
- Includes source hints (subject, difficulty, competition) to improve accuracy
- Per `03-dataset-import-search.md` §5.3

**Prompt design approach:**
- Condensed taxonomy: ~2,000 tokens listing codes + one-line descriptions
- Full taxonomy is ~50k tokens — too large for context window
- Source hints narrow the classification space
- JSON mode enforced via `response_format: { type: "json_object" }`

**Complexity:** M

#### Task 3.2 — Batch API Classifier

**What:** Submit problems to Azure OpenAI Batch API, poll for completion, parse results.

**Files:**
- `functions/src/infrastructure/ai/classifier.ts` — Implements `ProblemClassifier` domain interface
- `functions/src/infrastructure/ai/classifier.test.ts`

**Layer:** Infrastructure (AI adapter behind domain interface)
**Dependencies:** Tasks 1.1, 3.1
**Acceptance criteria:**
- Prepares JSONL file for Batch API (one request per problem)
- Submits batch, polls for completion (24-hour turnaround)
- Parses results, maps to `CanonicalProblem` AI fields
- Retries on invalid JSON or unknown taxonomy codes (max 2 retries)
- Logs: model version, prompt version, token usage per problem
- Per `03-dataset-import-search.md` §5.3

**Batch API workflow:**
1. Prepare JSONL — each line is a chat completion request
2. Upload file to Azure OpenAI
3. Create batch job
4. Poll `GET /batches/{id}` until `status: "completed"` (check every 5 min)
5. Download output file
6. Parse results, match to input problems by `custom_id`

**Fallback:** If Batch API is unavailable, fall back to synchronous API
(slower, 2× cost). Circuit breaker after 3 consecutive failures (per
`docs/governance/ai-guidelines.md` §6).

**Cost estimation:**
| Dataset | Problems | Input Tokens | Output Tokens | Batch Cost |
|---------|----------|-------------|--------------|------------|
| Omni-MATH | 4,428 | ~11M | ~0.9M | $1.09 |
| OlympiadBench | 4,200 | ~10.5M | ~0.8M | $1.03 |
| OlymMATH | 350 | ~0.9M | ~0.07M | $0.09 |
| NuminaMath | 3,000 | ~7.5M | ~0.6M | $0.74 |
| **Total** | **~12,000** | **~30M** | **~2.4M** | **~$2.95** |

**Complexity:** L

#### Task 3.3 — Classification Validator

**What:** Validate AI classification outputs against taxonomy reference data.

**Files:**
- `functions/src/infrastructure/ai/validate-classification.ts`
- `functions/src/infrastructure/ai/validate-classification.test.ts`

**Layer:** Infrastructure
**Dependencies:** Tasks 1.1, 1.2
**Acceptance criteria:**
- Verifies topic/subtopic/technique codes exist in DB
- Verifies subtopic belongs to claimed topic
- Verifies enum values are valid
- Flags >5 techniques as over-classified
- Returns `Result<ValidatedClassification, ClassificationValidationError[]>`
- Per `03-dataset-import-search.md` §5.3 validation rules table

**Complexity:** S

#### Task 3.4 — Embedding Generator

**What:** Generate embeddings via `text-embedding-3-small` for problem statements.

**Files:**
- `functions/src/infrastructure/ai/embedder.ts` — Implements `EmbeddingGenerator` domain interface
- `functions/src/infrastructure/ai/embedder.test.ts`

**Layer:** Infrastructure (AI adapter behind domain interface)
**Dependencies:** Task 1.1
**Acceptance criteria:**
- Embeds `statement_plain` (not raw LaTeX)
- Returns `vector(1536)` for pgvector storage
- Batches requests (up to 2,048 inputs per API call)
- Logs token usage
- Cost: ~$0.05 for 12,000 problems

**Complexity:** S

---

### Storage

#### Task 4.1 — PostgreSQL Repository

**What:** Write classified problems to PostgreSQL in a single transaction.

**Files:**
- `functions/src/infrastructure/database/problem-repository.ts`
- `functions/src/infrastructure/database/problem-repository.test.ts`

**Layer:** Infrastructure
**Dependencies:** Tasks 0.2, 1.1
**Acceptance criteria:**
- Single transaction per problem: `problems` + `solutions` + join tables + `import_records`
- `statement_vector` stored as `vector(1536)` via pgvector
- `search_tsv` auto-populates (GENERATED ALWAYS column)
- All problems inserted with `status: 'draft'`
- Upserts competitions with `ON CONFLICT DO NOTHING`
- Per `03-dataset-import-search.md` §5.4 (exact SQL provided)

**Idempotency:** Check `import_records.dedup_hash` before inserting. If exists → skip.

**Complexity:** M

---

### Orchestration

#### Task 5.1 — Import Pipeline Orchestrator

**What:** End-to-end orchestration: fetch → normalise → dedup → classify → embed → store → track.

**Files:**
- `functions/src/application/ingestion/import-pipeline.ts` — `ImportPipelineUseCase`
- `functions/src/application/ingestion/import-pipeline.test.ts`

**Layer:** Application (orchestration only, no business logic)
**Dependencies:** Tasks 1.1–4.1 (all above)
**Acceptance criteria:**
- Processes one dataset at a time (Omni-MATH first)
- Per-problem error handling: skip + log, never block batch
- Tracks progress in `import_runs` table
- Summary: total, imported, duplicates_skipped, classification_failures, parse_errors
- Per `03-dataset-import-search.md` §5 pipeline diagram

**Error handling:**
- Parse error → log, skip problem, increment `parse_errors`
- Classification failure → log, flag `needs_review`, increment `classification_failures`
- Embedding failure → retry 3× with exponential backoff, then skip
- DB write failure → rollback transaction, log, skip
- No error blocks the batch

**Complexity:** L

#### Task 5.2 — Import CLI Runner

**What:** CLI script to trigger imports manually.

**Files:**
- `functions/src/import/run-import.ts` — CLI entry point

**Layer:** Infrastructure (entry point)
**Dependencies:** Task 5.1
**Acceptance criteria:**
- `npx tsx run-import.ts --source omni-math` imports Omni-MATH
- `npx tsx run-import.ts --source all` imports all 4 sources in priority order
- Prints progress and summary to stdout
- Exits with code 1 if >10% of records failed

**Complexity:** S

#### Task 5.3 — Run Full Import

**What:** Execute the pipeline against all 4 sources and verify results.

**Dependencies:** Task 5.2
**Acceptance criteria:**
- Omni-MATH: ~4,400 problems imported
- OlympiadBench: ~4,000 math problems (physics excluded)
- OlymMATH: ~350 problems
- NuminaMath: ~3,000–5,000 unique after dedup
- Total: 8,000–12,000 problems with embeddings and tsvector
- Dedup works: re-running produces 0 new inserts
- Classification spot-check: ≥80% accuracy on random 50-problem sample
- One-time cost ≤ $5
- Per `04-mvp-implementation-roadmap.md` Phase 2 acceptance criteria

**Complexity:** M

---

### Index Timing Strategy

**When to create indexes:**

1. **Before bulk insert:** Create tables and `search_tsv` generated column
2. **After bulk insert:** Create HNSW and GIN indexes

HNSW index build is expensive on a populated table. For 12k rows it's manageable
(~seconds on B1ms), but creating the index after data load is faster than
maintaining it during inserts.

**Sequence:**
```
1. Run migrations 001–004 (tables, generated column, import tables)
2. Run seed scripts (taxonomy, competitions)
3. Run import pipeline (bulk insert ~12k problems)
4. Run migration 005 (create HNSW, GIN, B-tree indexes)
5. ANALYZE problems; -- update statistics for query planner
```

---

## 5. Type Design

### Branded IDs

```typescript
// functions/src/domain/shared/branded.ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type ProblemId = Brand<string, "ProblemId">;
type TopicId = Brand<string, "TopicId">;
type SubtopicId = Brand<string, "SubtopicId">;
type TechniqueId = Brand<string, "TechniqueId">;
type CompetitionId = Brand<string, "CompetitionId">;
type SolutionId = Brand<string, "SolutionId">;
type ImportRunId = Brand<string, "ImportRunId">;
type DedupHash = Brand<string, "DedupHash">;
```

### Discriminated Unions

```typescript
// Classification result state
type ClassificationState =
  | { status: "pending" }
  | { status: "classified"; classification: TaxonomyClassification; confidence: number }
  | { status: "failed"; error: ClassifyError; retryCount: number }
  | { status: "needs_review"; reason: string; partialClassification?: TaxonomyClassification };

// Import record outcome
type ImportOutcome =
  | { kind: "imported"; problemId: ProblemId }
  | { kind: "duplicate_skipped"; existingProblemId: ProblemId; dedupHash: DedupHash }
  | { kind: "parse_error"; error: string; rawRecord: unknown }
  | { kind: "classification_failed"; error: ClassifyError }
  | { kind: "validation_failed"; errors: ValidationError[] };
```

### Zod Schemas (Boundary Validation)

```typescript
// functions/src/infrastructure/adapters/schemas.ts
import { z } from "zod";

const OmniMathRecordSchema = z.object({
  problem: z.string().min(1),
  solution: z.string().nullable(),
  answer: z.string().nullable(),
  domain: z.array(z.string()).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  source: z.string().optional(),
});

const ClassificationOutputSchema = z.object({
  topics: z.array(z.string()).min(1).max(4),
  subtopics: z.array(z.string()).min(1).max(6),
  techniques: z.array(z.object({
    code: z.string(),
    is_primary: z.boolean(),
  })).min(1).max(5),
  competition_level: z.enum(["local", "state", "national", "international"]),
  position_in_paper: z.enum(["early", "middle", "late"]).nullable(),
  technique_depth: z.enum(["single", "compound", "synthesis"]),
  creativity_demand: z.enum(["routine", "insightful", "inventive", "breakthrough"]),
  proof_style: z.enum(["computation", "existence", "construction", "bound", "characterisation", "impossibility"]),
  entry_barrier: z.enum(["transparent", "camouflaged", "deceptive"]),
  estimated_solve_time_minutes: z.number().int().min(5).max(240).nullable(),
});
```

---

## 6. Error Handling

### Result Type

```typescript
// functions/src/domain/shared/result.ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> { return { ok: true, value }; }
function err<E>(error: E): Result<E, never> { return { ok: false, error }; }
```

### Error Types

```typescript
// Ingestion domain errors
type ParseError = { kind: "parse_error"; source: string; message: string; rawData?: unknown };
type ClassifyError =
  | { kind: "ai_unavailable"; retryAfter: number }
  | { kind: "invalid_json"; rawResponse: string }
  | { kind: "unknown_taxonomy_code"; code: string; field: string }
  | { kind: "confidence_too_low"; score: number }
  | { kind: "timeout"; elapsedMs: number };
type ValidationError =
  | { kind: "invalid_topic_code"; code: string }
  | { kind: "subtopic_parent_mismatch"; subtopicCode: string; topicCode: string }
  | { kind: "invalid_enum_value"; field: string; value: string }
  | { kind: "over_classified"; techniqueCount: number };
type StorageError =
  | { kind: "duplicate"; dedupHash: DedupHash }
  | { kind: "transaction_failed"; pgError: string }
  | { kind: "embedding_failed"; message: string };
```

### Boundary Error Mapping

| Layer | Error Type | Handling |
|-------|-----------|----------|
| Source adapter (parse) | `ParseError` | Log + skip problem |
| AI classifier | `ClassifyError` | Retry 2× → flag `needs_review` |
| Validator | `ValidationError[]` | Re-classify with correction prompt → flag if still invalid |
| DB repository | `StorageError` | Rollback transaction, log, skip |
| Orchestrator | All above | Aggregate into `ImportRun` summary |

---

## 7. Testing Strategy

Per `docs/governance/testing-standards.md`:

### Unit Tests (Domain Layer)

| Test | File | What It Tests |
|------|------|--------------|
| Dedup hash | `dedup.test.ts` | Same problem → same hash; different problems → different hash |
| Problem validation | `validate-problem.test.ts` | Valid/invalid codes, enum values, technique count limits |
| LaTeX normalisation | `latex.test.ts` | All normalisation rules from §4.1–§4.2 |
| Competition resolution | `competition.test.ts` | Known mappings, unknown fallback, fuzzy matching |

### Integration Tests (Infrastructure)

| Test | File | What It Tests |
|------|------|--------------|
| DB repository | `problem-repository.integration.test.ts` | Full transaction: insert + join tables + import_records |
| Classification parse | `classifier.integration.test.ts` | VCR-recorded AI responses → valid classification output |
| Adapter parse | `omni-math.integration.test.ts` (etc.) | Real sample records → valid CanonicalProblem output |

### Test Data

- **Factory functions:** `buildCanonicalProblem()`, `buildClassificationResult()`, `buildImportRun()`
- **Golden dataset:** 50 manually classified problems for accuracy benchmarks
- **VCR fixtures:** Recorded Batch API responses for classifier tests
- **Real samples:** 5–10 real records from each dataset for adapter tests

### Accuracy Benchmark

Post-import spot-check:
1. Random sample of 50 imported problems
2. Manual review: is primary topic correct? At least 1 technique correct?
3. Threshold: ≥80% accuracy
4. If below threshold: iterate on prompt (Task 3.1) before importing remaining sources

---

## 8. AI Considerations

Per `docs/governance/ai-guidelines.md`:

| Rule | Implementation |
|------|---------------|
| **§1.2 Retrieve, Don't Generate** | AI classifies only — does not generate proofs or solutions |
| **§2.1 Prompts versioned** | Prompt file in `src/infrastructure/ai/prompts/` with version number |
| **§2.2 Temperature 0** | Classification is deterministic — `temperature: 0` |
| **§2.2 Constrain output** | JSON mode + Zod schema validation |
| **§3 Model IDs from config** | `MATHPILOT_CLASSIFICATION_MODEL` env var, not hardcoded `"gpt-4o-mini"` |
| **§4.1 Async classification** | Batch API, not in request path |
| **§4.1 Store metadata** | Model version, prompt version, confidence, timestamp per classification |
| **§4.2 Pre-compute embeddings** | Stored in `statement_vector` at import time |
| **§4.3 Content-addressable cache** | Hash(statement + model + prompt version) → skip if cached |
| **§6 Rate limiting** | Token budget per minute on API calls |
| **§6 Circuit breaker** | After 3 consecutive failures → open for 60s |
| **§6 Logging** | Every AI call: operation, model, prompt version, tokens in/out, latency, success/fail |

---

## 9. ADR Needed?

**No new ADR required.** The key architectural decisions are already recorded:

- pgvector replaces Azure AI Search — covered in `02-mvp-architecture.md` §3.5
- Batch API for classification — covered in `03-dataset-import-search.md` §5.3
- RRF hybrid search — covered in `03-dataset-import-search.md` §7.0
- Source dataset selection — covered in `03-dataset-import-search.md` §2.1

If classification accuracy falls below 80% and requires upgrading from
GPT-4o-mini to GPT-4o, that decision warrants an ADR (per constitution §3:
"AI model/prompt changes require accuracy benchmark").

---

## 10. Performance & Cost

### One-Time Import Cost

| Item | Cost |
|------|------|
| Classification (Batch API, 12k problems) | ~$2.95 |
| Embeddings (text-embedding-3-small, 12k problems) | ~$0.05 |
| PostgreSQL compute during import | ~$0.02 (minutes of B1ms usage) |
| **Total one-time** | **~$3.02** |

Target from `01-product-analysis.md` §7: ~$3. ✅

### Ongoing Monthly Cost

| Item | Cost |
|------|------|
| PostgreSQL Flexible Server (B1ms) | ~$13/month |
| Azure OpenAI (chat only, post-import) | ~$0.50/month |
| Blob Storage (dataset snapshots) | ~$0.01/month |
| **Total monthly** | **~$13.50/month** |

### Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| Full import (12k problems) | ~4–6 hours | Dominated by Batch API turnaround (24h max) |
| Per-problem insert | < 50ms | Single PostgreSQL transaction |
| HNSW index build (12k rows) | ~10–30 seconds | Built after bulk insert |
| Vector search (post-index) | < 100ms | HNSW with m=16, ef_construction=64 |

### Cost Overrun Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Batch API unavailable, sync fallback | 2× classification cost (~$6 vs ~$3) | Still within $10 budget. Monitor and switch back when available |
| NuminaMath yields 10k+ unique after dedup | ~$1.50 extra classification | Cap at 5k per source, import highest-quality first |
| Classification accuracy <80%, re-run needed | 2× total cost (~$6) | Iterate prompt on 50-problem sample first, then re-run |
| GPT-4o-mini deprecated, forced to GPT-4o | ~10× cost (~$30) | ADR required. Evaluate GPT-4o-mini alternatives first |

---

## 11. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Classification accuracy < 80% | Medium | High | Spot-check 50 problems after first source. Iterate prompt before remaining sources. |
| R2 | Batch API quota limits | Low | Medium | Submit ≤5k per batch. Fallback to sync API. |
| R3 | Cross-dataset dedup misses paraphrased duplicates | Medium | Low | SHA-256 catches exact matches. Near-duplicates handled post-MVP via embedding similarity >0.95. |
| R4 | LaTeX normalisation breaks math rendering | Medium | Medium | Test with real samples from each source. Keep raw statement as backup. |
| R5 | Parquet parsing fails for NuminaMath | Low | Low | Fallback: download as CSV from HuggingFace. |
| R6 | pgvector HNSW performance on B1ms | Low | Medium | 12k × 1536 ≈ 73MB — well within 2GB RAM. Tune m and ef_construction if needed. |
| R7 | OlympiadBench filename parsing edge cases | Medium | Low | Log unparseable filenames, import problem without competition metadata. |
| R8 | Azure OpenAI rate limits during embedding | Low | Low | Batch embeddings in groups of 2,048. Exponential backoff. |

---

## 12. Data Flow Summary

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐
│  1. FETCH   │────▶│ 2. NORMALISE │────▶│  3. DEDUP    │────▶│ 4. CLASSIFY  │────▶│ 5. EMBED  │
│             │     │              │     │              │     │              │     │           │
│ HuggingFace │     │ Parse format │     │ SHA-256 hash │     │ GPT-4o-mini  │     │ text-emb  │
│ / GitHub    │     │ LaTeX norm   │     │ Check DB     │     │ Batch API    │     │ -3-small  │
│             │     │ Resolve comp │     │ Skip if dup  │     │ Validate     │     │           │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └───────────┘
                                                                                        │
                                                                                        ▼
                                                                                  ┌───────────┐
                                                                                  │ 6. STORE  │
                                                                                  │           │
                                                                                  │ PostgreSQL│
                                                                                  │ + pgvector│
                                                                                  │ single tx │
                                                                                  └───────────┘
```

**Automated steps:** All 6 steps are automated. The pipeline runs end-to-end
without human intervention.

**Manual steps:**
- Triggering the import CLI (`run-import.ts`)
- Post-import accuracy spot-check (50-problem sample)
- Reviewing flagged problems (`needs_review: true`)
- Promoting problems from `draft` → `in_review` → `published` (post-MVP workflow)

---

## 13. Verification & Post-Import Checks

### Data Integrity

```sql
-- Total problem count
SELECT count(*) FROM problems;  -- expect 8,000–12,000

-- Problems with embeddings
SELECT count(*) FROM problems WHERE statement_vector IS NOT NULL;  -- should equal total

-- Problems with tsvector
SELECT count(*) FROM problems WHERE search_tsv IS NOT NULL;  -- should equal total

-- Import tracking
SELECT source_dataset, count(*) FROM import_records GROUP BY source_dataset;

-- Import run summary
SELECT source_dataset, imported, duplicates_skipped, classification_failures
FROM import_runs ORDER BY started_at DESC;
```

### Search Quality

```sql
-- Text search: "pigeonhole" should return results
SELECT count(*) FROM problems
WHERE search_tsv @@ plainto_tsquery('english', 'pigeonhole');

-- Vector search: embed "distributing objects into boxes" → should find pigeonhole problems
-- (run programmatically with embedding)

-- Taxonomy coverage: every problem has at least one topic
SELECT count(*) FROM problems p
WHERE NOT EXISTS (SELECT 1 FROM problem_topics pt WHERE pt.problem_id = p.id);
-- should be 0

-- Taxonomy coverage: every problem has at least one technique
SELECT count(*) FROM problems p
WHERE NOT EXISTS (SELECT 1 FROM problem_techniques pt WHERE pt.problem_id = p.id);
-- should be 0
```

### Classification Quality

```sql
-- Topic distribution (should roughly match competition math domain distribution)
SELECT t.code, t.name, count(*) as problem_count
FROM problem_topics pt
JOIN topics t ON pt.topic_id = t.id
GROUP BY t.code, t.name
ORDER BY problem_count DESC;

-- Competition level distribution
SELECT competition_level, count(*) FROM problems GROUP BY competition_level;

-- Problems flagged for review
SELECT count(*) FROM problems WHERE status = 'draft';  -- all should be draft initially
```

---

## 14. Task Dependency Graph

```
Task 0.1 (Azure Resources)
  └─▶ Task 0.2 (Migrations)
       └─▶ Task 0.3 (Seed Data)
  └─▶ Task 0.4 (Scaffolding)

Task 1.1 (Domain Types)  ← no deps
  └─▶ Task 1.2 (Validation Rules)
  └─▶ Task 1.3 (Dedup Logic)

Task 2.1 (LaTeX Norm)    ← no deps
Task 2.2 (Competition)   ← Task 0.3
Task 2.3 (Omni-MATH)     ← Tasks 1.1, 2.1, 2.2
Task 2.4 (OlympiadBench) ← Tasks 1.1, 2.1, 2.2
Task 2.5 (OlymMATH)      ← Tasks 1.1, 2.1
Task 2.6 (NuminaMath)     ← Tasks 1.1, 2.1, 2.2

Task 3.1 (Prompt)         ← Task 0.3
Task 3.2 (Classifier)     ← Tasks 1.1, 3.1
Task 3.3 (Validator)      ← Tasks 1.1, 1.2
Task 3.4 (Embedder)       ← Task 1.1

Task 4.1 (DB Repository)  ← Tasks 0.2, 1.1

Task 5.1 (Orchestrator)   ← Tasks 1.2, 1.3, 2.3–2.6, 3.2, 3.3, 3.4, 4.1
Task 5.2 (CLI Runner)     ← Task 5.1
Task 5.3 (Full Import)    ← Task 5.2
```

**Parallelisable work:**
- Tasks 0.x (infra) and Tasks 1.x (domain types) can run in parallel
- Tasks 2.1–2.6 (adapters) can be built in parallel once domain types exist
- Tasks 3.1–3.4 (AI pipeline) can be built in parallel with adapters
- Task 4.1 (storage) can be built once migrations and types exist

**Critical path:** 0.1 → 0.2 → 0.3 → 3.1 → 3.2 → 5.1 → 5.2 → 5.3

**Estimated total effort:** 2–2.5 weeks (aligned with `04-mvp-implementation-roadmap.md` Phase 2)
