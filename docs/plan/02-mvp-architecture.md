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
| Prefer consumption-based pricing | Azure Functions Consumption plan; AI Search Basic tier; no always-on servers |
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
┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────────┐
│  Azure Blob      │  │  PostgreSQL       │  │  Azure OpenAI            │
│  Storage         │  │  Flexible Server  │  │                          │
│                  │  │  (Burstable B1ms) │  │  • GPT-4o-mini (chat,    │
│  • PDF uploads   │  │                   │  │    extraction,           │
│  • Static assets │  │  • Problems       │  │    classification)       │
│                  │  │  • Topics         │  │  • text-embedding-3-small│
└──────────────────┘  │  • Techniques     │  │    (embeddings)          │
                      │  • Solutions      │  │                          │
                      │  • Competitions   │  └──────────────────────────┘
                      │  • Translations   │
                      │  • Join tables    │  ┌──────────────────────────┐
                      └───────┬───────────┘  │  Azure AI Search         │
                              │              │  (Basic tier)            │
                              │ sync         │                          │
                              └─────────────▶│  • Problem index         │
                                             │    (structured fields +  │
                                             │     vector embeddings)   │
                                             └──────────────────────────┘
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
| `ingest-pipeline` | Blob trigger | Extracts, classifies, embeds, stores problems | **Yes** (ingestion-time) |
| `browse-problems` | HTTP GET | Paginated queries against PostgreSQL | No |
| `search-problems` | HTTP GET | Queries AI Search (structured + semantic) | No |
| `chat-problems` | HTTP POST | RAG: retrieve from AI Search → generate with LLM | **Yes** (runtime — justified) |

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
- PostgreSQL is more natural for JSONB fields (hint sequences on solutions),
  array columns (FK arrays), and full-text search as a fallback

**Data sync to AI Search:** After the ingestion pipeline writes a problem to
PostgreSQL, it also pushes a flattened document to the AI Search index. This is
a simple write-after-write pattern, not a change-feed sync.

### 3.5 Azure AI Search (Basic Tier)

A single index `problems` with structured fields + vector field:

| Field | Type | Source |
|-------|------|--------|
| `id` | string (key) | Problem.id |
| `title` | searchable string | Problem.title |
| `statement` | searchable string | Problem.statement (plain text, no LaTeX) |
| `source_competition` | filterable string | Competition.abbreviation |
| `source_year` | filterable int | Problem.source_year |
| `competition_level` | filterable string | Problem.competition_level enum |
| `topics` | filterable string[] | Topic.code via join |
| `subtopics` | filterable string[] | Subtopic.code via join |
| `techniques` | filterable string[] | Technique.code via join |
| `proof_style` | filterable string | Problem.proof_style enum |
| `creativity_demand` | filterable string | Problem.creativity_demand enum |
| `technique_depth` | filterable string | Problem.technique_depth enum |
| `entry_barrier` | filterable string | Problem.entry_barrier enum |
| `language` | filterable string | Problem.language |
| `statement_vector` | vector (1536-dim) | text-embedding-3-small output |

**Search modes:**

| Mode | How It Works | Example |
|------|-------------|---------|
| Structured filter | Filter on faceted fields | `topics eq 'NT' AND competition_level eq 'state'` |
| Full-text | BM25 on title + statement | `"pigeonhole divisibility"` |
| Semantic (vector) | Cosine similarity on statement_vector | `"problems about partitioning integers into groups"` |
| Hybrid | Full-text + vector, RRF fusion | Default for search bar queries |

**Cost:** Basic tier = ~$75/month. Supports up to 2 GB indexes, 3 replicas.
For 500 problems this is vast overkill — but Basic is the minimum tier that
supports semantic ranking. If cost is prohibitive at launch, start with **Free
tier** (50 MB, no semantic ranking) and use structured + full-text only.

### 3.6 Azure OpenAI

| Model | Used For | When | Est. Cost (500 problems) |
|-------|----------|------|--------------------------|
| `gpt-4o-mini` | PDF extraction (parse problems from PDF text) | Ingestion | ~$0.50 |
| `gpt-4o-mini` | Classification (assign topics, techniques, dims) | Ingestion | ~$0.30 |
| `gpt-4o-mini` | Chat responses (RAG over retrieved problems) | Runtime | ~$0.01/query |
| `text-embedding-3-small` | Generate statement embeddings | Ingestion | ~$0.01 |

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
Blob Storage          Ingest Pipeline          Azure OpenAI           PostgreSQL       AI Search
     │                     │                       │                     │                │
     │  blob trigger       │                       │                     │                │
     │  (new PDF)          │                       │                     │                │
     │────────────────────▶│                       │                     │                │
     │                     │                       │                     │                │
     │                     │  UPDATE ingestion_job │                     │                │
     │                     │  status: 'extracting' │                     │                │
     │                     │────────────────────────────────────────────▶│                │
     │                     │                       │                     │                │
     │                     │  ── STEP 1: EXTRACT ──│                     │                │
     │                     │                       │                     │                │
     │                     │  Extract PDF text     │                     │                │
     │                     │  (pdf-parse library)  │                     │                │
     │                     │                       │                     │                │
     │                     │  Send text chunks to  │                     │                │
     │                     │  GPT-4o-mini:         │                     │                │
     │                     │  "Split into separate │                     │                │
     │                     │   olympiad problems.  │                     │                │
     │                     │   Return JSON array." │                     │                │
     │                     │──────────────────────▶│                     │                │
     │                     │                       │                     │                │
     │                     │  [{ title, statement, │                     │                │
     │                     │    source, year }]    │                     │                │
     │                     │◀──────────────────────│                     │                │
     │                     │                       │                     │                │
     │                     │  ── STEP 2: CLASSIFY ─│ (per problem)       │                │
     │                     │                       │                     │                │
     │                     │  Send problem +       │                     │                │
     │                     │  taxonomy reference   │                     │                │
     │                     │  to GPT-4o-mini:      │                     │                │
     │                     │  "Classify using these│                     │                │
     │                     │   codes. Return JSON."│                     │                │
     │                     │──────────────────────▶│                     │                │
     │                     │                       │                     │                │
     │                     │  { topics, subtopics, │                     │                │
     │                     │    techniques,        │                     │                │
     │                     │    competition_level,  │                     │                │
     │                     │    proof_style, ... }  │                     │                │
     │                     │◀──────────────────────│                     │                │
     │                     │                       │                     │                │
     │                     │  ── STEP 3: EMBED ────│                     │                │
     │                     │                       │                     │                │
     │                     │  Send statement to    │                     │                │
     │                     │  text-embedding-3-small│                    │                │
     │                     │──────────────────────▶│                     │                │
     │                     │  [0.012, -0.034, ...] │                     │                │
     │                     │◀──────────────────────│                     │                │
     │                     │                       │                     │                │
     │                     │  ── STEP 4: STORE ────│                     │                │
     │                     │                       │                     │                │
     │                     │  INSERT problem +     │                     │                │
     │                     │  join table rows      │                     │                │
     │                     │────────────────────────────────────────────▶│                │
     │                     │                       │                     │                │
     │                     │  PUSH flattened doc   │                     │                │
     │                     │  to AI Search index   │                     │                │
     │                     │─────────────────────────────────────────────────────────────▶│
     │                     │                       │                     │                │
     │                     │  UPDATE ingestion_job │                     │                │
     │                     │  status: 'completed'  │                     │                │
     │                     │  problems_extracted: N│                     │                │
     │                     │────────────────────────────────────────────▶│                │
```

**Problem status after ingestion:** `draft` (as per domain model lifecycle).
All AI-classified problems require human review before becoming `published`.

### 4.3 Search Problems

```
Trainer               React SPA              Search API            AI Search
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
  │                       │                       │  • filters: topics │
  │                       │                       │    eq 'NT', level  │
  │                       │                       │    eq 'state'      │
  │                       │                       │  • text: pigeonhole│
  │                       │                       │  • vector: embed(q)│
  │                       │                       │  (embedding cached │
  │                       │                       │   or computed once)│
  │                       │                       │───────────────────▶│
  │                       │                       │                    │
  │                       │                       │  Ranked results    │
  │                       │                       │  (RRF fusion)      │
  │                       │                       │◀───────────────────│
  │                       │                       │                    │
  │                       │                       │  Enrich from       │
  │                       │                       │  PostgreSQL:       │
  │                       │                       │  full LaTeX,       │
  │                       │                       │  solutions,        │
  │                       │                       │  technique names   │
  │                       │                       │                    │
  │                       │  200 [problem cards]  │                    │
  │                       │◀──────────────────────│                    │
  │  renders result cards │                       │                    │
  │◀──────────────────────│                       │                    │
```

**Note on embedding the query:** The search API embeds the query text using
`text-embedding-3-small` for the vector component. This is the one runtime
embedding call. At ~$0.00002 per query, it's negligible.

### 4.4 Chat Over Problems

```
Trainer               React SPA               Chat API           AI Search      Azure OpenAI
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
  │                       │                       │  for "inversion   │               │
  │                       │                       │  power of a point"│               │
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
| Ingestion pipeline — embed + store | Low | 2–3 days | Embedding API call, PostgreSQL + AI Search writes |
| Browse API | Low | 2–3 days | Parameterised SQL queries with pagination |
| Search API | Medium | 1 week | Hybrid search construction, query embedding, result enrichment |
| Chat API (RAG) | Medium | 1 week | System prompt design, citation extraction, response streaming |
| PostgreSQL schema + migrations | Medium | 1 week | Domain model tables, indexes, seed data |
| AI Search index setup | Low | 2–3 days | Index definition, field mappings |
| Infrastructure (Bicep/Terraform) | Medium | 1 week | All Azure resources, RBAC, connection strings |
| **Total estimated MVP effort** | | **10–14 weeks** | Solo developer; less with a team |

---

## 6. Cost Estimate (MVP at Steady State)

Assumptions: 500 problems indexed, 3–5 active users, ~50 queries/day, ~10 chat
messages/day, ~2 PDF uploads/week.

| Resource | SKU | Monthly Cost |
|----------|-----|-------------|
| Azure Static Web Apps | Free | $0 |
| Azure Functions | Consumption | ~$0 (well within free grant: 1M executions/month) |
| Azure Blob Storage | Hot, LRS | ~$0.10 |
| PostgreSQL Flexible Server | Burstable B1ms | ~$13 |
| Azure AI Search | Basic | ~$75 |
| Azure OpenAI (runtime: chat + search embeddings) | Pay-per-token | ~$2/month |
| Azure OpenAI (ingestion: one-time for 500 problems) | Pay-per-token | ~$1 total |
| **Total monthly** | | **~$90/month** |

**Cost reduction options if $90/month is too much:**

| Option | Savings | Trade-off |
|--------|---------|-----------|
| Use AI Search **Free tier** instead of Basic | −$75/month | Lose semantic/vector search; structured + full-text only. 50 MB index limit. |
| Use **SQLite on Functions** instead of PostgreSQL | −$13/month | No managed database; data lives in blob-backed SQLite. Harder to query ad-hoc. |
| Skip vector search entirely | −$0 resource, −complexity | Rely on structured filters + BM25 full-text. Still effective for taxonomy-tagged problems. |

**$15/month floor:** Static Web Apps (free) + Functions (free) + Blob ($0.10) +
PostgreSQL B1ms ($13) + OpenAI runtime (~$2). This gives browse + structured search +
chat without vector/semantic search.

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
| **Write-after-write vs change feed** | Direct write to both PostgreSQL and AI Search | Simpler than CDC; acceptable for low-volume ingestion |
| **GPT-4o-mini everywhere** | Same model for extraction, classification, chat | Simplifies deployment; one model, one endpoint. Upgrade selectively if quality demands it |
| **PostgreSQL over Azure SQL** | PostgreSQL Flexible Server | JSONB support, array columns, lower cost for the size needed |
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
                                        ├── AI Search Service
                                        ├── OpenAI Service
                                        └── Key Vault
```

**Environments:** MVP needs only `production`. Add `staging` when the team grows.
