# MathPilot — MVP Implementation Roadmap

> **Date**: July 2026
> **Status**: Draft
> **Scope**: Implementation roadmap for MVP Phase 1 — dataset import, search, and chat.
> **Dependencies**: [domain-model.md](../domain-model.md), [taxonomy.md](../taxonomy.md),
> [02-mvp-architecture.md](02-mvp-architecture.md), [03-dataset-import-search.md](03-dataset-import-search.md)

---

## Overview

This roadmap breaks the MVP into **5 implementation phases**, ordered by
dependency. Each phase produces a working, testable deliverable. The total
estimated effort is **6–8 weeks** for a solo developer.

**MVP scope (from `01-product-analysis.md` §4):**

1. Import existing problem datasets (Omni-MATH, OlympiadBench, OlymMATH, NuminaMath)
2. Normalise problems into the canonical Problem model
3. Apply taxonomy classification via GPT-4o-mini Batch API
4. Store in PostgreSQL (with pgvector for embeddings and tsvector for full-text)
5. Search problems by text, taxonomy filters, and vector similarity
6. Chat over the indexed problem repository (RAG)

**Explicitly excluded from MVP:**
- PDF ingestion
- Student profiles and progress tracking
- Personalised recommendations
- Training plan generation
- Knowledge gap detection

---

## Phase 1: Foundation — Infrastructure & Schema

**Goal:** Provision Azure resources and create the database schema so all
subsequent phases have a stable platform to build on.

**Duration:** 1–1.5 weeks

### Deliverables

1. Azure resource group with all MVP resources provisioned
2. PostgreSQL database with domain model tables, pgvector extension, tsvector indexes, and seed data
3. Project scaffolding (monorepo structure)

### Technical Tasks

| # | Task | Details | Effort |
|---|------|---------|--------|
| 1.1 | Scaffold monorepo | Create `apps/web/`, `functions/`, `db/`, `infra/` directories per `03-dataset-import-search.md` §13. Init `package.json` for functions (TypeScript, Azure Functions v4). Init Vite + React for `apps/web/`. | 0.5 day |
| 1.2 | Write Bicep templates | Define: Resource Group, PostgreSQL Flexible Server (B1ms, pgvector extension enabled), Azure OpenAI, Blob Storage (LRS), Static Web App (Free), Function App (Consumption), Key Vault. Follow `02-mvp-architecture.md` §10. | 2–3 days |
| 1.3 | Deploy infrastructure | Run `az deployment group create` with Bicep. Store connection strings in Key Vault. Configure Function App settings to reference Key Vault. Enable pgvector extension on PostgreSQL. | 0.5 day |
| 1.4 | Write database migrations | `001_create_taxonomy.sql` — `topics`, `subtopics`, `techniques`, `learning_objectives` tables. `002_create_problems.sql` — `problems`, `solutions`, `problem_relationships`, `problem_translations` + pgvector `statement_vector` column + tsvector `search_tsv` generated column. `003_create_join_tables.sql` — `problem_topics`, `problem_subtopics`, `problem_techniques`, `problem_learning_objectives`. `004_create_competitions.sql` — `competitions` table. `005_create_import_tables.sql` — `import_records`, `import_runs`. `006_create_search_indexes.sql` — HNSW index on `statement_vector`, GIN index on `search_tsv`, GIN indexes on join tables. All schemas derive from `domain-model.md` entities + `03-dataset-import-search.md` §7. | 2–3 days |
| 1.5 | Write seed scripts | `topics.sql` — 8 domains from `taxonomy.md` §1. `subtopics.sql` — 58 subtopics. `techniques.sql` — 160+ techniques with `cognitive_load` and `parent_subtopic`. `competitions.sql` — known competitions (IMO, USAMO, OMM, APMO, etc.). | 1–2 days |
| 1.6 | Run migrations + seed | Apply migrations via `golang-migrate` or Prisma. Run seed scripts. Verify with `SELECT count(*)` on all tables. | 0.5 day |
| 1.7 | Shared modules | `functions/src/shared/db.ts` — PostgreSQL connection pool (pg + pgvector). `functions/src/shared/openai.ts` — Azure OpenAI client. `functions/src/shared/search.ts` — Hybrid search query builder (tsvector + pgvector + RRF). | 0.5 day |

### Files / Modules Created

```
infra/main.bicep
infra/parameters.prod.json
db/migrations/001_create_taxonomy.sql
db/migrations/002_create_problems.sql
db/migrations/003_create_join_tables.sql
db/migrations/004_create_competitions.sql
db/migrations/005_create_import_tables.sql
db/migrations/006_create_search_indexes.sql
db/seed/topics.sql
db/seed/subtopics.sql
db/seed/techniques.sql
db/seed/competitions.sql
functions/package.json
functions/tsconfig.json
functions/host.json
functions/src/shared/db.ts
functions/src/shared/openai.ts
functions/src/shared/search.ts
apps/web/package.json
apps/web/vite.config.ts
```

### Acceptance Criteria

- [ ] `az deployment group show` confirms all resources are `Succeeded`
- [ ] PostgreSQL has 12+ tables; `topics` has 8 rows, `subtopics` has 58 rows, `techniques` has 160+ rows
- [ ] pgvector extension enabled: `SELECT * FROM pg_extension WHERE extname = 'vector'` returns a row
- [ ] HNSW and GIN indexes created: `SELECT indexname FROM pg_indexes WHERE tablename = 'problems'` shows `idx_problems_vector` and `idx_problems_search`
- [ ] `functions/src/shared/db.ts` connects to PostgreSQL successfully (unit test or smoke test)
- [ ] All secrets are in Key Vault, not in code or app settings

### Dependencies

None — this is the starting phase.

---

## Phase 2: Import Pipeline — Fetch, Normalise, Classify, Store

**Goal:** Import ~12,000 problems from 4 open datasets into PostgreSQL,
fully classified by the MathPilot taxonomy, with embeddings for vector search.

**Duration:** 2–2.5 weeks

### Deliverables

1. Source adapters for all 4 datasets
2. Normalisation module (LaTeX, dedup, competition resolution)
3. AI classification module with taxonomy-aware prompts
4. Store module (PostgreSQL write with embedding in single transaction)
5. Import orchestrator (`run-import.ts`)
6. ~8,000–12,000 problems imported and indexed

### Technical Tasks

| # | Task | Details | Effort |
|---|------|---------|--------|
| 2.1 | Define canonical types | `functions/src/import/adapters/types.ts` — `SourceProblem`, `CanonicalProblem`, `SourceAdapter` interface. Schema from `03-dataset-import-search.md` §3. | 0.5 day |
| 2.2 | Omni-MATH adapter | Download from HuggingFace. Parse JSONL. Map `domain` → topic hint, `difficulty` → source_difficulty. This is the first and best-covered dataset — build and test the full pipeline with this one first. | 1 day |
| 2.3 | OlympiadBench adapter | Download from HuggingFace. Parse JSON. Extract competition + year + problem number from filenames (e.g., `IMO_2019_P4`). Filter to math-only subset. | 1 day |
| 2.4 | OlymMATH adapter | Download from GitHub. Parse JSONL. Map `subject` → topic hint. Note: no solutions available. | 0.5 day |
| 2.5 | NuminaMath adapter | Download Parquet from HuggingFace. Filter `source = "olympiads"`. Map `problem_type` → topic hint. Largest source — estimate ~50k rows, ~5k unique after dedup. | 1 day |
| 2.6 | LaTeX normalisation | `normalise/latex.ts` — Convert `\( \)` → `$ $`, `\[ \]` → `$$ $$`, AoPS `<imath>`/`<cmath>` → standard LaTeX. Strip `\label{}`, normalise whitespace. Generate plain-text version (strip all LaTeX commands) for BM25 search. | 1 day |
| 2.7 | Dedup module | `normalise/dedup.ts` — SHA-256 of normalised plain-text statement. Check against `import_records.dedup_hash`. | 0.5 day |
| 2.8 | Competition resolver | `normalise/competition.ts` — Map source strings ("imo", "IMO 2019", "International Mathematical Olympiad") to canonical `competitions.abbreviation`. Use a lookup table + fuzzy fallback. | 0.5 day |
| 2.9 | Classification prompt | `classify/prompts.ts` — System prompt with condensed taxonomy (~2,000 tokens). User prompt template with problem statement + source hints. Output JSON schema. Per `03-dataset-import-search.md` §5. | 1 day |
| 2.10 | Classification caller | `classify/classifier.ts` — Prepare JSONL file for Azure OpenAI Batch API. Submit batch. Poll for completion. Parse results. Handle retries for invalid JSON / unknown taxonomy codes. | 2 days |
| 2.11 | Classification validator | `classify/validate.ts` — Verify returned topic/subtopic/technique codes exist in the `topics`/`subtopics`/`techniques` tables. Verify enum values (`proof_style`, `creativity_demand`, etc.) are valid. Flag problems that fail validation for manual review. | 0.5 day |
| 2.12 | PostgreSQL store | `store/postgres.ts` — Single transaction: insert `problems` (with `statement_vector` and `statement_plain`), `solutions`, join tables (`problem_topics`, etc.), `import_records`. The `search_tsv` column auto-populates via GENERATED ALWAYS. Per `03-dataset-import-search.md` §5.4. | 1 day |
| 2.13 | Embedding generation | Generate embeddings via `text-embedding-3-small` for each problem's plain-text statement. Store in `statement_vector` column. No separate search index write needed. | 0.5 day |
| 2.14 | Import orchestrator | `import/run-import.ts` — Fetch → normalise → dedup → classify → store → track. Per-problem error handling (skip + log, never block batch). Batch-level summary in `import_runs`. Per `03-dataset-import-search.md` §12. | 1 day |
| 2.15 | Run full import | Execute pipeline against all 4 sources. Verify counts. Review flagged problems. Fix any adapter issues found during real data. | 1 day |

### Files / Modules Created

```
functions/src/import/adapters/types.ts
functions/src/import/adapters/omni-math.ts
functions/src/import/adapters/olympiad-bench.ts
functions/src/import/adapters/olympmath.ts
functions/src/import/adapters/numina-math.ts
functions/src/import/normalise/latex.ts
functions/src/import/normalise/dedup.ts
functions/src/import/normalise/competition.ts
functions/src/import/classify/prompts.ts
functions/src/import/classify/classifier.ts
functions/src/import/classify/validate.ts
functions/src/import/store/postgres.ts
functions/src/import/run-import.ts
```

### Acceptance Criteria

- [ ] Omni-MATH: ~4,400 problems imported with valid taxonomy codes
- [ ] OlympiadBench: ~4,000 math problems imported (physics excluded)
- [ ] OlymMATH: ~350 problems imported
- [ ] NuminaMath: ~3,000–5,000 unique problems after dedup
- [ ] Total: 8,000–12,000 problems in PostgreSQL with embeddings and tsvector populated
- [ ] `import_runs` table shows completion summary for each source
- [ ] Dedup works: re-running any adapter produces 0 new inserts
- [ ] Classification accuracy spot check: ≥80% of a random 50-problem sample have correct primary topic and ≥1 correct technique (manual review)
- [ ] All problems have `status = 'draft'` (no auto-publishing)
- [ ] Problems with classification failures are flagged `needs_review: true`
- [ ] One-time import cost ≤ $5 total (target: ~$3.06)

### Dependencies

- Phase 1 complete (PostgreSQL schema with pgvector + tsvector, shared modules)
- Azure OpenAI Batch API access enabled

---

## Phase 3: Search API

**Goal:** Expose a search endpoint that supports full-text search (tsvector),
vector similarity (pgvector), taxonomy filters, and hybrid ranking (RRF) —
so trainers can find problems in under 30 seconds.

**Duration:** 1–1.5 weeks

### Deliverables

1. `GET /api/search` — hybrid search with structured filters
2. `GET /api/problems` — paginated browse with filter/facet support
3. `GET /api/problems/:id` — single problem detail with full enrichment
4. `GET /api/taxonomy` — taxonomy reference data for filter UI

### Technical Tasks

| # | Task | Details | Effort |
|---|------|---------|--------|
| 3.1 | Search endpoint | `functions/src/api/search.ts` — Parse query params (per `03-dataset-import-search.md` §8.2). Build hybrid SQL query with tsvector + pgvector + RRF + taxonomy JOINs. Embed query text via `text-embedding-3-small`. | 1.5 days |
| 3.2 | Browse endpoint | `functions/src/api/browse.ts` — Paginated `SELECT` from PostgreSQL with filter JOINs on `problem_topics`, `problem_techniques`, etc. Support: topic, subtopic, technique, competition, level, year range. Return facet counts via `GROUP BY`. | 1.5 days |
| 3.3 | Problem detail | `functions/src/api/problem-detail.ts` — `GET /api/problems/:id`. Return full problem with solutions, techniques (with names), topics, subtopics, competition info. Include related problems from `problem_relationships` if any exist. | 0.5 day |
| 3.4 | Taxonomy endpoint | `functions/src/api/taxonomy.ts` — `GET /api/taxonomy`. Return topics, subtopics, techniques as a tree structure. Used by the frontend filter panel to populate dropdowns. Cache-friendly (taxonomy changes rarely). | 0.5 day |
| 3.5 | Integration tests | Test the 4 worked examples from `03-dataset-import-search.md` §7.3 against real data. Verify: geometry + cyclic quad returns relevant results; beginner invariant filter returns ≤state-level problems; NT practice set returns 20 candidates. | 1 day |

### Files / Modules Created

```
functions/src/api/search.ts
functions/src/api/browse.ts
functions/src/api/problem-detail.ts
functions/src/api/taxonomy.ts
functions/src/api/shared/filters.ts        # SQL filter builder, shared by search + browse
```

### Acceptance Criteria

- [ ] `GET /api/search?q=pigeonhole` returns relevant results ranked by RRF score
- [ ] `GET /api/search?q=geometry&topics=GEO-S&level=national` correctly applies taxonomy and enum filters
- [ ] `GET /api/problems?topic=NT&page=1&page_size=20` returns paginated results with total count
- [ ] `GET /api/problems/:id` returns full problem with solutions and technique names
- [ ] `GET /api/taxonomy` returns complete topic → subtopic → technique tree
- [ ] Response times: search < 500ms, browse < 300ms, detail < 200ms
- [ ] Vector similarity search works: searching for "distributing objects into boxes" returns pigeonhole problems
- [ ] Search response matches the shape in `03-dataset-import-search.md` §8.5

### Dependencies

- Phase 2 complete (problems imported and indexed)

---

## Phase 4: Chat API (RAG)

**Goal:** Trainers can ask natural-language questions about the problem corpus
and get grounded responses that cite specific problems.

**Duration:** 1 week

### Deliverables

1. `POST /api/chat` — RAG endpoint (retrieve + generate)
2. Streaming response support
3. Citation extraction and problem linking

### Technical Tasks

| # | Task | Details | Effort |
|---|------|---------|--------|
| 4.1 | Chat endpoint | `functions/src/api/chat.ts` — Accept message + history + optional filters. Per `03-dataset-import-search.md` §9.1. | 0.5 day |
| 4.2 | Retrieval step | Reuse hybrid search from Phase 3 (tsvector + pgvector + taxonomy filters, top 10). Per `03-dataset-import-search.md` §9.2. | 0.5 day |
| 4.3 | System prompt | Craft the olympiad coach system prompt. Rules: only cite retrieved problems, use `[prob-id]` format, show statements, explain relevance, admit when no good matches. Per `03-dataset-import-search.md` §9.3. | 0.5 day |
| 4.4 | Generation + streaming | Call GPT-4o-mini with system prompt + retrieved problems + conversation history. Stream response using Azure OpenAI streaming API. `temperature: 0.3`, `max_tokens: 1500`. | 1 day |
| 4.5 | Citation extraction | Parse `[prob-xxx]` patterns from response. Return cited problems as structured data alongside the response text. Per `03-dataset-import-search.md` §9.4. | 0.5 day |
| 4.6 | Conversation management | Support multi-turn conversation by accepting `history[]` in the request body. Truncate history to fit within context window (~8k tokens for history, rest for system prompt + retrieved problems). | 0.5 day |
| 4.7 | Integration test | Test: "Find 3 problems that combine pigeonhole with modular arithmetic" returns a response citing 2–3 real problems from the corpus with valid IDs. | 0.5 day |

### Files / Modules Created

```
functions/src/api/chat.ts
functions/src/api/shared/retrieval.ts    # Shared search-for-chat logic
functions/src/api/shared/citations.ts    # Citation extraction utility
```

### Acceptance Criteria

- [ ] `POST /api/chat` with "Find geometry problems about cyclic quadrilaterals" returns a response citing real problems
- [ ] All cited `[prob-xxx]` IDs exist in the database
- [ ] Response streams incrementally (not a single large payload)
- [ ] Multi-turn: follow-up "Show me harder ones" uses conversation history
- [ ] When no good matches exist, response says so honestly (no hallucinated problems)
- [ ] Response cost per chat turn ≤ $0.01 (GPT-4o-mini, ~4k input + 1.5k output)
- [ ] Response time: first token < 2 seconds

### Dependencies

- Phase 3 complete (search API works and returns results)

---

## Phase 5: Frontend — React SPA

**Goal:** A functional web UI where trainers can browse, search, and chat over
the problem corpus. Deployed to Azure Static Web Apps.

**Duration:** 2–3 weeks

### Deliverables

1. Search page with text input + taxonomy filter panel
2. Browse page with paginated problem list and faceted navigation
3. Problem detail view with LaTeX rendering
4. Chat interface with streaming responses and problem citations
5. Deployed to Azure Static Web Apps (Free tier)

### Technical Tasks

| # | Task | Details | Effort |
|---|------|---------|--------|
| 5.1 | API client | `apps/web/src/services/api.ts` — Typed client for all API endpoints (search, browse, detail, taxonomy, chat). Handle pagination, streaming. | 1 day |
| 5.2 | LaTeX rendering | Integrate KaTeX (lightweight, fast) for rendering LaTeX in problem statements. Handle inline `$...$` and display `$$...$$`. | 0.5 day |
| 5.3 | Problem card component | `ProblemCard.tsx` — Displays: title, competition + year, statement (LaTeX), topic/technique tags, complexity dimensions. Expandable for full solution. | 1.5 days |
| 5.4 | Filter panel | `FilterPanel.tsx` — Dropdowns/checkboxes for: topics (8), subtopics (dynamic based on selected topic), techniques, competition level, proof style, competition, year range. Populated from `/api/taxonomy`. | 2 days |
| 5.5 | Search page | `SearchPage.tsx` — Search bar + filter panel + results list (ProblemCards). Shows result count and pagination. Updates URL query params for shareable links. | 2 days |
| 5.6 | Browse page | `BrowsePage.tsx` — Paginated problem list with faceted sidebar (topic counts, competition counts). Click topic facet to filter. | 1.5 days |
| 5.7 | Problem detail page | `ProblemDetailPage.tsx` — Full problem view: statement (LaTeX), solution (expandable), metadata (competition, year, round), taxonomy tags, complexity dimensions. "Find similar" button (calls search API with vector query). | 1 day |
| 5.8 | Chat interface | `ChatPage.tsx` — Message input, streaming response display, cited problem cards inline. Optional filter panel for pre-filtering. Message history state. | 2–3 days |
| 5.9 | Navigation + layout | App shell: header with nav links (Search, Browse, Chat), responsive layout, mobile-friendly. | 0.5 day |
| 5.10 | Static Web App config | `staticwebapp.config.json` — API proxy rules to route `/api/*` to the Function App. SPA fallback for client-side routing. | 0.5 day |
| 5.11 | Deploy | GitHub Actions workflow: build React app → deploy to Static Web Apps. Verify production URL loads and API calls succeed. | 0.5 day |

### Files / Modules Created

```
apps/web/src/services/api.ts
apps/web/src/components/ProblemCard.tsx
apps/web/src/components/SearchBar.tsx
apps/web/src/components/FilterPanel.tsx
apps/web/src/components/ChatPanel.tsx
apps/web/src/components/ChatMessage.tsx
apps/web/src/components/TaxonomyTag.tsx
apps/web/src/components/Pagination.tsx
apps/web/src/pages/SearchPage.tsx
apps/web/src/pages/BrowsePage.tsx
apps/web/src/pages/ProblemDetailPage.tsx
apps/web/src/pages/ChatPage.tsx
apps/web/src/App.tsx
apps/web/src/hooks/useSearch.ts
apps/web/src/hooks/useChat.ts
apps/web/staticwebapp.config.json
.github/workflows/deploy.yml
```

### Acceptance Criteria

- [ ] Trainer can type "pigeonhole" in search bar and see relevant problems in < 2 seconds
- [ ] Trainer can filter by topic (e.g., Number Theory) and see only NT problems
- [ ] Trainer can combine text + filters (e.g., "cyclic quadrilateral" + GEO-S + national)
- [ ] Problem statements render LaTeX correctly (inline and display math)
- [ ] Chat: "Find 3 combinatorics problems about coloring" returns a streaming response with clickable problem citations
- [ ] Browse page shows faceted counts (e.g., "Number Theory (1,847)")
- [ ] Problem detail page shows full solution when expanded
- [ ] Works on mobile (responsive layout)
- [ ] Deployed URL is publicly accessible
- [ ] No authentication required for read-only access (public platform per `01-product-analysis.md` §7)

### Dependencies

- Phase 3 and Phase 4 complete (search + chat APIs work)

---

## Phase Summary

```
Phase 1: Foundation            ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  Week 1–1.5
Phase 2: Import Pipeline       ░░░░░░████████████░░░░░░░░░░░░░░  Week 1.5–4
Phase 3: Search API            ░░░░░░░░░░░░░░░░░░██████░░░░░░░░  Week 4–5.5
Phase 4: Chat API              ░░░░░░░░░░░░░░░░░░░░░░░░████░░░░  Week 5.5–6.5
Phase 5: Frontend              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  Week 5–8
                               ──────────────────────────────────
                               1    2    3    4    5    6    7    8
```

> **Note:** Phase 5 (frontend) can overlap with Phases 3–4. The API client and
> components can be built against mock data while the APIs are being developed.
> A developer could start the UI scaffold in Week 3.

---

## Cost Summary

| Category | Cost | When |
|----------|------|------|
| Azure infrastructure (monthly) | ~$13/month | Ongoing (PostgreSQL only) |
| Dataset import (one-time) | ~$3.06 | Phase 2 |
| Runtime OpenAI (monthly) | ~$0.50/month | After Phase 4 launch |
| **Total first month** | **~$17** | |
| **Ongoing monthly** | **~$13.50** | |

> **No separate search service cost.** All search (full-text, vector, hybrid)
> runs on the same PostgreSQL instance — no Azure AI Search needed.

See `02-mvp-architecture.md` §6 for detailed cost breakdown and tier upgrade
strategy.

---

## Risk Register

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|------------|
| Classification accuracy < 80% | Phase 2 | Trainers don't trust results | Spot-check 50 problems after first source import. Iterate on prompts before importing remaining sources. |
| Dedup misses cross-dataset duplicates | Phase 2 | Inflated problem count, duplicate search results | SHA-256 on normalised plain text catches exact matches. Near-duplicates (paraphrases) handled post-MVP via embedding similarity. |
| pgvector performance at scale | Phase 3 | Slow vector search | 12k problems × 1536 dims ≈ 73 MB — well within B1ms memory. HNSW index provides sub-100ms queries. If performance degrades, tune m and ef_construction parameters. |
| tsvector search quality vs BM25 | Phase 3 | Less precise text search than AI Search | PostgreSQL tsvector with English dictionary is sufficient for math terminology. RRF fusion with vector search compensates. Upgrade to AI Search later if needed. |
| LaTeX rendering inconsistencies | Phase 5 | Garbled math in the UI | Normalise LaTeX at import time (Phase 2). Use KaTeX with fallback to raw text. |
| Azure OpenAI Batch API quota | Phase 2 | Import blocked or delayed | Submit batches of ≤5,000 problems. Have fallback to synchronous API (slower, costs 2× more). |
| Cold start on Functions Consumption | Phase 3–4 | First request slow (5–10s) | Acceptable for MVP (3–5 users). Document in known issues. Upgrade to Functions Premium if it becomes a problem. |

---

## Definition of Done (MVP)

The MVP is complete when **all** of the following are true:

1. **Content:** ≥8,000 classified problems in PostgreSQL with embeddings
2. **Search:** A trainer can find a relevant problem in under 30 seconds using
   hybrid search (tsvector + pgvector) + taxonomy filters
3. **Chat:** A trainer can ask "Find me 3 number theory problems about modular
   arithmetic" and get a grounded response citing real problems
4. **Accuracy:** ≥80% of a random 50-problem sample are correctly classified
   (primary topic + ≥1 technique — verified by manual review)
5. **Access:** The web UI is publicly accessible, no login required
6. **Cost:** Monthly running cost ≤ $20/month
7. **Trainer feedback:** At least 1 olympiad trainer says "I would use this again"

---

## Post-MVP Roadmap (Out of Scope)

These features are designed into the domain model and architecture but NOT
implemented in the MVP. See `02-mvp-architecture.md` §8 and `01-product-analysis.md`
§5 for where they plug in.

| Feature | Prerequisite |
|---------|-------------|
| PDF ingestion (upload + extract) | Blob trigger pipeline in `02-mvp-architecture.md` §4.2 |
| Student accounts + profiles | Auth layer (Azure AD B2C or similar) |
| Knowledge gap detection | StudentMastery + KnowledgeGap entities from domain model |
| Personalised recommendations | Student profile + `personalised_difficulty()` formula |
| Training plan generation | TrainingPlan + TrainingSession entities from domain model |
| Trainer validation workflow | Admin UI + `status` transitions (`draft` → `published`) |
| Multi-language support | ProblemTranslation entity is in domain model; UI i18n needed |
