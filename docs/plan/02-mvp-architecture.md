# MathPilot — MVP Architecture

> **Date**: July 2026
> **Status**: Draft
> **Scope**: MVP only — supports the 5 core workflows defined in
> [01-product-analysis.md](./01-product-analysis.md) §4

---

## 1. Design Principles

These architectural choices follow directly from the cost efficiency rules
in `01-product-analysis.md` §7:

| Principle | Architectural Implication |
|-----------|--------------------------|
| AI at ingestion, not at runtime | LLM calls happen in the async ingestion pipeline, not in the search/browse hot path |
| Pre-compute everything possible | Embeddings and classifications are stored; search uses pre-indexed data |
| Use the cheapest model that works | GPT-4o-mini for extraction/classification; text-embedding-3-small for vectors |
| Prefer consumption-based pricing | Azure Functions Consumption plan; PostgreSQL + pgvector for search (no separate search service); no always-on servers |
| No Cosmos DB | PostgreSQL Flexible Server (Burstable B1ms) for the entity model |
| Scale with problems, not users | Ingestion cost grows with corpus; serving cost stays near-zero |

**The one exception:** Chat uses a per-request LLM call (GPT-4o-mini via RAG).
This is acceptable because (a) chat is low-frequency in the MVP (3–5 trainers),
(b) GPT-4o-mini is ~$0.15/1M input tokens, and (c) the alternative (no chat)
removes a core MVP feature.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USERS (Trainers)                                │
│                                                                         │
│  React SPA (Azure Static Web Apps — free tier)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Upload  │  │  Browse  │  │  Search  │  │   Chat   │               │
│  │   PDF    │  │ Problems │  │ Problems │  │ Problems │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
└───────┼─────────────┼─────────────┼──────────────┼─────────────────────┘
        │             │             │              │
        ▼             ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AZURE FUNCTIONS (Consumption Plan)                    │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Upload API  │  │ Browse API  │  │Search API│  │   Chat API       │ │
│  │ (HTTP)      │  │ (HTTP)      │  │ (HTTP)   │  │ (HTTP)           │ │
│  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  └────────┬─────────┘ │
│         │                │              │                  │           │
│         │         ┌──────┘──────────────┘                  │           │
│         │         │  reads                                 │           │
│         ▼         ▼                                        ▼           │
│  ┌────────────────────┐                          ┌──────────────────┐ │
│  │  Ingestion Pipeline │                          │  RAG Orchestrator│ │
│  │  (Blob Trigger)     │                          │  (retrieves +   │ │
│  │                     │                          │   generates)     │ │
│  │  1. Extract         │                          └────────┬─────────┘ │
│  │  2. Classify        │                                   │           │
│  │  3. Embed           │                                   │           │
│  │  4. Store           │                                   │           │
│  └──────┬──────────────┘                                   │           │
└─────────┼──────────────────────────────────────────────────┼───────────┘
          │                                                  │
          ▼                                                  ▼
┌──────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────┐
│  Azure Blob      │  │  PostgreSQL               │  │  Azure OpenAI            │
│  Storage         │  │  Flexible Server          │  │                          │
│                  │  │  (Burstable B1ms)         │  │  • GPT-4o-mini (chat,    │
│  • PDF uploads   │  │  + pgvector extension     │  │    extraction,           │
│  • Static assets │  │                           │  │    classification)       │
│                  │  │  • Problems               │  │  • text-embedding-3-small│
└──────────────────┘  │  • Topics                 │  │    (embeddings)          │
                      │  • Techniques             │  │                          │
                      │  • Solutions              │  └──────────────────────────┘
                      │  • Competitions           │
                      │  • Translations           │
                      │  • Join tables            │
                      │  • statement_vector (1536) │  ← pgvector column
                      │  • tsvector full-text idx  │  ← PostgreSQL FTS
                      └───────────────────────────┘
```

---

## 3. Component Responsibilities

### 3.1 React Frontend (Azure Static Web Apps — Free Tier)

| Responsibility | Details |
|----------------|---------|
| PDF upload | File picker → POST to Upload API; show progress |
| Problem browser | Paginated list with filters (topic, technique, competition, level) |
| Search | Text input → Search API; render ranked result cards |
| Chat | Conversational interface → Chat API; stream responses |
| Problem card | Display: statement (LaTeX), source, topics, techniques, complexity dims |

**Technology:** React + Vite. LaTeX rendering via KaTeX. No SSR needed for MVP
(static SPA is simpler and free on Azure Static Web Apps).

**Why not Next.js for MVP?** SSR adds hosting complexity (need Node.js runtime)
with no benefit for the MVP. The API layer is Azure Functions, not Next.js API
routes. If SSR becomes needed later (SEO for public problem pages), migrate then.

### 3.2 Azure Functions (Consumption Plan)

Five function groups, all in a single Function App:

| Function | Trigger | Purpose | LLM Call? |
|----------|---------|---------|-----------|
| `upload-pdf` | HTTP POST | Validates file, stores in Blob, returns job ID | No |
| `ingest-pipeline` | Blob trigger | Extracts, classifies, embeds, stores problems from PDF | **Yes** (ingestion-time) |
| `import-dataset` | HTTP POST (manual) | Imports from HF/GitHub datasets (Omni-MATH, etc.) | **Yes** (ingestion-time, Batch API) |
| `browse-problems` | HTTP GET | Paginated queries against PostgreSQL | No |
| `search-problems` | HTTP GET | Hybrid search via PostgreSQL (tsvector + pgvector + filters) | No |
| `chat-problems` | HTTP POST | RAG: retrieve from PostgreSQL → generate with LLM | **Yes** (runtime — justified) |

> **Dataset import details:** See `03-dataset-import-search.md` §5 for source
> adapters, normalisation, and the full import pipeline.

**Cold start mitigation:** Not needed for MVP (3–5 users). If latency matters
later, use Azure Functions Premium plan's pre-warmed instances.

### 3.3 Azure Blob Storage (General-Purpose v2)

| Container | Content | Access |
|-----------|---------|--------|
| `pdf-uploads` | Raw uploaded PDFs | Private; accessed only by ingestion pipeline |
| `pdf-processed` | Archival copy after extraction | Private; kept for re-processing if taxonomy changes |

**Cost:** ~$0.02/GB/month for hot tier. Even 10,000 PDFs at ~500KB each = 5GB ≈ $0.10/month.

### 3.4 PostgreSQL Flexible Server (Burstable B1ms)

The relational database stores the full domain model from `domain-model.md`:

| Schema Area | Tables |
|-------------|--------|
| Taxonomy (reference data) | `topics`, `subtopics`, `techniques`, `learning_objectives` |
| Problem content | `problems`, `problem_translations`, `solutions`, `problem_relationships` |
| Classification (join tables) | `problem_topics`, `problem_subtopics`, `problem_techniques`, `problem_learning_objectives`, `solution_techniques` |
| Competition reference | `competitions` |
| Ingestion tracking | `ingestion_jobs` (MVP-only table for tracking PDF processing status) |

**What's NOT in the MVP database:** Student profiles, mastery tracking, knowledge
gaps, training sessions, training plans, personal collections. These are post-MVP
features (see `01-product-analysis.md` §5).

**Why PostgreSQL over Azure SQL?**
- Flexible Server B1ms: ~$13/month (1 vCore, 2 GB RAM, 32 GB storage)
- Azure SQL Basic: ~$5/month but limited to 2 GB database, 5 DTUs
- PostgreSQL supports **pgvector** extension for vector similarity search,
  eliminating the need for a separate search service (Azure AI Search)
- PostgreSQL built-in `tsvector` provides full-text search with ranking
- JSONB fields, array columns, and full-text search all in one service
- **One database for everything:** relational data, vector search, full-text
  search — no dual-write, no sync issues

### 3.5 PostgreSQL pgvector + Full-Text Search

All search capabilities live inside PostgreSQL — no separate search service.

**pgvector extension:** Adds a `vector(1536)` column type and cosine similarity
operator (`<=>`) with HNSW indexing for fast approximate nearest neighbor search.
Azure Database for PostgreSQL Flexible Server supports pgvector natively.

**Full-text search:** PostgreSQL's built-in `tsvector` + `tsquery` with the
English dictionary provides keyword search with stemming and ranking (`ts_rank`).

| Search Mode | Implementation | Example |
|-------------|---------------|---------|
| Structured filter | SQL `WHERE` + `JOIN` on taxonomy tables | `WHERE topic_code = 'NT' AND competition_level = 'state'` |
| Full-text | `tsvector @@ tsquery` on statement + title | `to_tsquery('english', 'pigeonhole & divisibility')` |
| Semantic (vector) | `ORDER BY statement_vector <=> $query_vector` | Embed query → find cosine-similar problems |
| Hybrid | Full-text + vector scores combined with RRF | Default for search bar queries |

**Schema additions to the `problems` table:**

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column for embeddings
ALTER TABLE problems ADD COLUMN statement_vector vector(1536);

-- Add tsvector column for full-text search
ALTER TABLE problems ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(statement_plain, '')), 'B')
  ) STORED;

-- Indexes
CREATE INDEX idx_problems_vector ON problems
  USING hnsw (statement_vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_problems_search ON problems USING gin (search_tsv);
```

**Why this replaces Azure AI Search:**
- 12k problems × 1536 floats × 4 bytes ≈ 73 MB — fits comfortably in B1ms
- HNSW index on pgvector provides sub-100ms vector search at this scale
- Full-text with `ts_rank` is adequate for keyword search (not as polished as
  BM25 with language-specific analyzers, but sufficient for math content)
- **$0/month additional cost** — search runs on the same PostgreSQL instance
- Eliminates dual-write complexity (no sync issues between two data stores)
- If search quality needs improve later, Azure AI Search can be added as an
  upgrade path without changing the data model

### 3.6 Azure OpenAI

| Model | Used For | When | Est. Cost |
|-------|----------|------|-----------|
| `gpt-4o-mini` | PDF extraction (parse problems from PDF text) | Ingestion (Phase 2) | ~$0.50 per 500 PDFs |
| `gpt-4o-mini` | Dataset classification (assign taxonomy codes) | Ingestion (Phase 1) | ~$3.00 for 12,000 problems (Batch API) |
| `gpt-4o-mini` | Chat responses (RAG over retrieved problems) | Runtime | ~$0.01/query |
| `text-embedding-3-small` | Generate statement embeddings | Ingestion | ~$0.05 for 12,000 problems |

> **Detailed import cost breakdown:** See `03-dataset-import-search.md` §10.

**Why GPT-4o-mini for everything?** It's sufficient for structured extraction
and classification tasks (JSON-mode output). The math content understanding
needed here is pattern matching against the taxonomy, not proving theorems.
If classification quality is too low, upgrade to GPT-4o for classification only.

---

## 4. Data Flows

### 4.1 Upload PDF

```
Trainer                React SPA               Upload API             Blob Storage
  │                       │                       │                       │
  │  selects PDF file     │                       │                       │
  │──────────────────────▶│                       │                       │
  │                       │  POST /api/upload     │                       │
  │                       │  (multipart form)     │                       │
  │                       │──────────────────────▶│                       │
  │                       │                       │  validate (size,      │
  │                       │                       │  type = PDF)          │
  │                       │                       │                       │
  │                       │                       │  PUT blob to          │
  │                       │                       │  pdf-uploads/{id}.pdf │
  │                       │                       │──────────────────────▶│
  │                       │                       │                       │
  │                       │                       │  INSERT INTO          │
  │                       │                       │  ingestion_jobs       │
  │                       │                       │  (status: 'uploaded') │
  │                       │                       │                       │
  │                       │  200 { job_id }       │                       │
  │                       │◀──────────────────────│                       │
  │  "Upload received,   │                       │                       │
  │   processing..."     │                       │                       │
  │◀──────────────────────│                       │                       │
```

### 4.2 Extract & Classify Problems (Async Ingestion Pipeline)

```
Blob Storage          Ingest Pipeline          Azure OpenAI           PostgreSQL
     │                     │                       │                     │
     │  blob trigger       │                       │                     │
     │  (new PDF)          │                       │                     │
     │────────────────────▶│                       │                     │
     │                     │                       │                     │
     │                     │  UPDATE ingestion_job │                     │
     │                     │  status: 'extracting' │                     │
     │                     │────────────────────────────────────────────▶│
     │                     │                       │                     │
     │                     │  ── STEP 1: EXTRACT ──│                     │
     │                     │                       │                     │
     │                     │  Extract PDF text     │                     │
     │                     │  (pdf-parse library)  │                     │
     │                     │                       │                     │
     │                     │  Send text chunks to  │                     │
     │                     │  GPT-4o-mini:         │                     │
     │                     │  "Split into separate │                     │
     │                     │   olympiad problems.  │                     │
     │                     │   Return JSON array." │                     │
     │                     │──────────────────────▶│                     │
     │                     │                       │                     │
     │                     │  [{ title, statement, │                     │
     │                     │    source, year }]    │                     │
     │                     │◀──────────────────────│                     │
     │                     │                       │                     │
     │                     │  ── STEP 2: CLASSIFY ─│ (per problem)       │
     │                     │                       │                     │
     │                     │  Send problem +       │                     │
     │                     │  taxonomy reference   │                     │
     │                     │  to GPT-4o-mini:      │                     │
     │                     │  "Classify using these│                     │
     │                     │   codes. Return JSON."│                     │
     │                     │──────────────────────▶│                     │
     │                     │                       │                     │
     │                     │  { topics, subtopics, │                     │
     │                     │    techniques,        │                     │
     │                     │    competition_level,  │                     │
     │                     │    proof_style, ... }  │                     │
     │                     │◀──────────────────────│                     │
     │                     │                       │                     │
     │                     │  ── STEP 3: EMBED ────│                     │
     │                     │                       │                     │
     │                     │  Send statement to    │                     │
     │                     │  text-embedding-3-small│                    │
     │                     │──────────────────────▶│                     │
     │                     │  [0.012, -0.034, ...] │                     │
     │                     │◀──────────────────────│                     │
     │                     │                       │                     │
     │                     │  ── STEP 4: STORE ────│                     │
     │                     │                       │                     │
     │                     │  INSERT problem +     │                     │
     │                     │  join table rows +    │                     │
     │                     │  statement_vector     │                     │
     │                     │────────────────────────────────────────────▶│
     │                     │                       │                     │
     │                     │  UPDATE ingestion_job │                     │
     │                     │  status: 'completed'  │                     │
     │                     │  problems_extracted: N│                     │
     │                     │────────────────────────────────────────────▶│
```

**Problem status after ingestion:** `draft` (as per domain model lifecycle).
All AI-classified problems require human review before becoming `published`.

### 4.3 Search Problems

```
Trainer               React SPA              Search API            PostgreSQL
  │                       │                       │                    │
  │  types: "pigeonhole   │                       │                    │
  │  number theory state" │                       │                    │
  │──────────────────────▶│                       │                    │
  │                       │  GET /api/search      │                    │
  │                       │  ?q=pigeonhole...     │                    │
  │                       │  &topics=NT           │                    │
  │                       │  &level=state         │                    │
  │                       │──────────────────────▶│                    │
  │                       │                       │                    │
  │                       │                       │  Build hybrid query│
  │                       │                       │  • embed query     │
  │                       │                       │    via OpenAI      │
  │                       │                       │  • tsvector match  │
  │                       │                       │  • pgvector cosine │
  │                       │                       │  • SQL filters on  │
  │                       │                       │    taxonomy JOINs  │
  │                       │                       │  • RRF rank fusion │
  │                       │                       │───────────────────▶│
  │                       │                       │                    │
  │                       │                       │  Ranked results    │
  │                       │                       │  (full problem     │
  │                       │                       │   data in one      │
  │                       │                       │   query — no       │
  │                       │                       │   enrichment step) │
  │                       │                       │◀───────────────────│
  │                       │                       │                    │
  │                       │  200 [problem cards]  │                    │
  │                       │◀──────────────────────│                    │
  │  renders result cards │                       │                    │
  │◀──────────────────────│                       │                    │
```

**Note on embedding the query:** The search API embeds the query text using
`text-embedding-3-small` for the vector component. This is the one runtime
embedding call. At ~$0.00002 per query, it's negligible.

**Advantage over the previous dual-store design:** Because search and data live
in the same database, there is no separate enrichment step. The search query
JOINs directly to solutions, techniques, and competition tables, returning full
problem data in a single round-trip.

### 4.4 Chat Over Problems

```
Trainer               React SPA               Chat API           PostgreSQL     Azure OpenAI
  │                       │                       │                   │               │
  │  "Find 3 problems     │                       │                   │               │
  │   using inversion     │                       │                   │               │
  │   for a student who   │                       │                   │               │
  │   knows power of a    │                       │                   │               │
  │   point"              │                       │                   │               │
  │──────────────────────▶│                       │                   │               │
  │                       │  POST /api/chat       │                   │               │
  │                       │  { message,           │                   │               │
  │                       │    history[] }        │                   │               │
  │                       │──────────────────────▶│                   │               │
  │                       │                       │                   │               │
  │                       │                       │  ── RETRIEVE ──   │               │
  │                       │                       │  Hybrid search    │               │
  │                       │                       │  (tsvector +      │               │
  │                       │                       │   pgvector + SQL) │               │
  │                       │                       │──────────────────▶│               │
  │                       │                       │  top 10 problems  │               │
  │                       │                       │◀──────────────────│               │
  │                       │                       │                   │               │
  │                       │                       │  ── GENERATE ──   │               │
  │                       │                       │                   │               │
  │                       │                       │  System prompt:   │               │
  │                       │                       │  "You are a math  │               │
  │                       │                       │   olympiad coach. │               │
  │                       │                       │   Use ONLY the    │               │
  │                       │                       │   problems below."│               │
  │                       │                       │                   │               │
  │                       │                       │  User message +   │               │
  │                       │                       │  retrieved problems│              │
  │                       │                       │─────────────────────────────────▶│
  │                       │                       │                   │               │
  │                       │                       │  "Here are 3      │               │
  │                       │                       │   problems..."    │               │
  │                       │                       │  (with citations)  │               │
  │                       │                       │◀─────────────────────────────────│
  │                       │                       │                   │               │
  │                       │  200 { response,      │                   │               │
  │                       │    cited_problems[] } │                   │               │
  │                       │◀──────────────────────│                   │               │
  │  renders response +   │                       │                   │               │
  │  clickable problem    │                       │                   │               │
  │  cards                │                       │                   │               │
  │◀──────────────────────│                       │                   │               │
```

**Grounding rule:** The chat API's system prompt instructs the model to ONLY
reference problems from the retrieved set. This prevents hallucinated problems
and lets the UI render clickable problem cards from the `cited_problems[]` array.

### 4.5 Browse Problems

```
Trainer               React SPA              Browse API           PostgreSQL
  │                       │                       │                    │
  │  applies filters:     │                       │                    │
  │  topic=GEO-S          │                       │                    │
  │  level=national       │                       │                    │
  │  technique=T-INV      │                       │                    │
  │──────────────────────▶│                       │                    │
  │                       │  GET /api/problems    │                    │
  │                       │  ?topic=GEO-S         │                    │
  │                       │  &level=national      │                    │
  │                       │  &technique=T-INV     │                    │
  │                       │  &page=1&limit=20     │                    │
  │                       │──────────────────────▶│                    │
  │                       │                       │  SQL query with    │
  │                       │                       │  JOINs on filter   │
  │                       │                       │  tables            │
  │                       │                       │───────────────────▶│
  │                       │                       │  results + count   │
  │                       │                       │◀───────────────────│
  │                       │  200 { problems[],    │                    │
  │                       │    total, page }      │                    │
  │                       │◀──────────────────────│                    │
  │  renders paginated    │                       │                    │
  │  problem list         │                       │                    │
  │◀──────────────────────│                       │                    │
```

---

## 5. Component Complexity Estimate

| Component | Complexity | Effort | Notes |
|-----------|------------|--------|-------|
| React SPA (browse, filters, cards) | Medium | 2–3 weeks | LaTeX rendering, filter UI, responsive layout |
| React SPA (chat interface) | Low–Medium | 1 week | Streaming response display, message history |
| Upload API + Blob write | Low | 1–2 days | File validation, blob SDK call |
| Ingestion pipeline — PDF text extraction | Medium | 1 week | Handling varied PDF formats (scanned vs text, multi-column) |
| Ingestion pipeline — LLM extraction | Medium–High | 1–2 weeks | Prompt engineering, JSON parsing, error handling, multi-problem PDFs |
| Ingestion pipeline — LLM classification | Medium–High | 1–2 weeks | Taxonomy-aware prompts, validation against known codes |
| Ingestion pipeline — embed + store | Low | 2–3 days | Embedding API call, PostgreSQL write (single store) |
| Browse API | Low | 2–3 days | Parameterised SQL queries with pagination |
| Search API | Medium | 1 week | Hybrid search (tsvector + pgvector + filters), query embedding |
| Chat API (RAG) | Medium | 1 week | System prompt design, citation extraction, response streaming |
| PostgreSQL schema + migrations | Medium | 1 week | Domain model tables, pgvector, tsvector, indexes, seed data |
| Infrastructure (Bicep/Terraform) | Medium | 1 week | All Azure resources, RBAC, connection strings |
| **Total estimated MVP effort** | | **8–12 weeks** | Solo developer; less with a team |

---

## 6. Cost Estimate (MVP at Steady State)

Assumptions: ~12,000 problems indexed, 3–5 active users, ~50 queries/day,
~10 chat messages/day.

| Resource | Recommended SKU | Monthly Cost |
|----------|----------------|-------------|
| Azure Static Web Apps | Free | $0 |
| Azure Functions | Consumption | ~$0 (within free grant) |
| Azure Blob Storage | Hot, LRS | ~$0.10 |
| PostgreSQL Flexible Server (+ pgvector) | Burstable B1ms | ~$13 |
| Azure OpenAI (runtime: chat + query embeddings) | Pay-per-token | ~$0.50/month |
| **Monthly total** | | **~$14/month** |

**Why no separate search service:** PostgreSQL with pgvector and tsvector handles
all search needs (structured filters, full-text, vector similarity) at MVP scale.
This eliminates Azure AI Search entirely, saving $0–75/month and removing the
dual-write sync pattern. If search quality needs improve beyond what PostgreSQL
provides, Azure AI Search can be added later as an upgrade.

### One-time costs

| Item | Cost |
|------|------|
| Initial dataset import (12k problems) | ~$3.06 (see `03-dataset-import-search.md` §10) |

---

## 7. Security & Access (MVP Scope)

| Concern | MVP Approach |
|---------|-------------|
| Authentication | None for read (public browse/search). Simple API key or Azure AD B2C for upload/chat if needed. |
| PDF upload | Validate file type and size (max 20 MB). Virus scanning out of scope for MVP. |
| API rate limiting | Not needed for 3–5 users. Add Azure API Management later. |
| Data at rest | Azure-managed encryption (default on all services). |
| Secrets management | Azure Key Vault or Function App settings for OpenAI keys, connection strings. |

---

## 8. What's NOT in the MVP Architecture

These are post-MVP features from `01-product-analysis.md` §5. The architecture
is designed so they can be added without redesigning the core:

| Feature | Where It Plugs In |
|---------|-------------------|
| Student accounts & profiles | Add `student_profiles` + `student_mastery` tables to PostgreSQL; add auth layer |
| Knowledge gap detection | Rule engine in a new Azure Function; reads `student_mastery`, writes `knowledge_gaps` |
| Personalised recommendations | New API endpoint; reads problem index + student mastery; applies `personalised_difficulty()` formula |
| Training plans | New tables (`training_plans`, `plan_weeks`); new generation function |
| Trainer validation workflow | Add `status` filter to browse; add review API endpoints |
| AI-assisted classification review | Admin UI for reviewing `draft` problems; approve → `published` |
| Multilingual support | `problem_translations` table already in schema; add language filter to search |

---

## 9. Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **SPA vs SSR** | React SPA (Vite) | No SEO need for MVP; free hosting on Static Web Apps; simpler deployment |
| **Single Function App** | All functions in one app | Simpler deployment, shared config; split later if cold-start becomes an issue |
| **Blob trigger vs queue** | Blob trigger for ingestion | Simpler; no need for Azure Queue/Service Bus at MVP scale |
| **pgvector instead of Azure AI Search** | PostgreSQL with pgvector + tsvector | One service instead of two; $0 incremental cost; no dual-write; search, data, and vectors co-located. Upgrade to AI Search later if needed. |
| **GPT-4o-mini everywhere** | Same model for extraction, classification, chat | Simplifies deployment; one model, one endpoint. Upgrade selectively if quality demands it |
| **PostgreSQL over Azure SQL** | PostgreSQL Flexible Server | pgvector support, JSONB, array columns, tsvector, lower cost |
| **No API gateway** | Functions exposed directly | 3–5 users don't need throttling, caching, or API versioning |
| **No queue between extract and classify** | Sequential steps in one function | Simpler; at MVP scale (2 PDFs/week), parallelism isn't needed |

---

## 10. Deployment Architecture

```
GitHub Repository
       │
       │  push to main
       ▼
GitHub Actions CI/CD
       │
       ├── Build React SPA ──────────▶ Deploy to Azure Static Web Apps
       │
       ├── Build Functions ──────────▶ Deploy to Azure Functions
       │
       └── Run DB migrations ────────▶ Apply to PostgreSQL
                                        (using a migration tool like
                                         Prisma Migrate or golang-migrate)

Infrastructure:
       │
       └── Bicep templates ──────────▶ Azure Resource Group
                                        ├── Static Web App
                                        ├── Function App + Storage Account
                                        ├── PostgreSQL Flexible Server
                                        │     (+ pgvector extension enabled)
                                        ├── OpenAI Service
                                        └── Key Vault
```

**Environments:** MVP needs only `production`. Add `staging` when the team grows.
