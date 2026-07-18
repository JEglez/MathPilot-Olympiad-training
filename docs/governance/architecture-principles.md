# MathPilot — Architecture Principles

> Durable architectural rules. Feature-agnostic. Apply to every component.

---

## 1. Layered Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  React SPA, UI components
├─────────────────────────────────────┤
│         Application Layer           │  Use cases, orchestration, DTOs
├─────────────────────────────────────┤
│           Domain Layer              │  Entities, value objects, domain logic
├─────────────────────────────────────┤
│        Infrastructure Layer         │  Database, AI services, blob storage
└─────────────────────────────────────┘
```

### Rules

- **Dependencies point inward.** Infrastructure depends on Domain, never the reverse.
- **Domain layer has zero external imports.** No database drivers, no HTTP
  clients, no framework code in domain entities.
- **Application layer orchestrates.** It calls domain logic and infrastructure
  adapters but contains no business rules itself.

## 2. Domain-Driven Design

### Bounded Contexts

| Context | Owns | Communicates Via |
|---------|------|------------------|
| **Taxonomy** | Topic, Subtopic, Technique, LearningObjective | Read-only queries |
| **Problem Corpus** | Problem, Solution, Competition, Translation | Events / queries |
| **Student Profile** | StudentProfile, KnowledgeGap, MasteryRecord | Commands / queries |
| **Training** | TrainingSession, PersonalTrainingCollection | Commands / events |
| **Ingestion** | IngestionJob, ClassificationResult, Embedding | Async events |

### Rules

- Entities are **only modified through their owning context's** commands.
- Cross-context communication uses **DTOs or domain events**, never shared
  mutable state.
- Each context may have its **own data model** optimised for its needs
  (read models, projections).

## 3. API Design

- All APIs are **RESTful** with consistent resource naming.
- Request/response schemas are defined in **shared TypeScript types** generated
  from a single source (Zod schemas or OpenAPI spec).
- Every endpoint validates input at the boundary using schema validation.
- Error responses follow **RFC 9457** (Problem Details for HTTP APIs).
- Pagination uses **cursor-based** pagination for list endpoints.

## 4. Data Architecture

- **PostgreSQL is the system of record** for all structured data.
- **pgvector** handles vector similarity search — no separate search service
  unless proven insufficient.
- **Blob storage** is for raw files (PDFs, images) only — never for structured data.
- **Migrations are forward-only**, versioned, and reviewed. No manual DDL in production.
- Every table has `created_at` and `updated_at` timestamps.
- Soft deletes (`deleted_at`) for user-facing content; hard deletes only for
  ephemeral data (jobs, logs).

## 5. AI Integration Architecture

- **AI calls are infrastructure concerns**, wrapped behind domain interfaces
  (e.g., `ProblemClassifier`, `EmbeddingGenerator`).
- **Prompts are versioned** alongside code. Prompt changes produce measurable
  diffs in classification accuracy.
- **AI responses are cached** with content-addressable keys to avoid duplicate
  LLM calls for identical inputs.
- **Retry with exponential backoff** on all AI service calls. Circuit breakers
  for prolonged outages.
- **Model identifiers are configuration**, not code. Swapping models requires
  no code changes.

## 6. Frontend Architecture

- **Component hierarchy:** Pages → Feature components → UI primitives.
- **State management:** Server state via React Query (TanStack Query); local UI
  state via React hooks. No global state library unless proven necessary.
- **LaTeX rendering** is a cross-cutting concern handled by a single shared
  component. No raw KaTeX calls in feature code.
- **Routing** is file-based or declarative. No programmatic route registration.
- **Accessibility:** WCAG 2.1 AA minimum. Every interactive element has a label.

## 7. Infrastructure Principles

- **Infrastructure as Code.** All Azure resources defined in Bicep/Terraform.
  No portal-created resources in production.
- **Environment parity.** Dev, staging, and production differ only in scale and
  secrets, never in architecture.
- **Secrets in Key Vault.** Application code reads from environment variables
  injected at deploy time — never from files or hardcoded values.
- **Observability from day one.** Structured logging, request tracing, and error
  reporting in every service.

## 8. Security Principles

- **Zero trust at every boundary.** Authenticate and authorise every request.
- **Principle of least privilege.** Services get only the permissions they need.
- **No secrets in code, config files, or logs.** Use managed identities where
  possible; Key Vault references otherwise.
- **Dependency scanning** runs on every PR. Known vulnerabilities block merge.
- **Input sanitisation** on all user-provided content, especially LaTeX strings
  and PDF uploads.

## 9. Performance Budgets

| Metric | Target |
|--------|--------|
| Search response (P95) | < 500ms |
| Page load (LCP) | < 2.5s |
| Bundle size (initial) | < 200KB gzipped |
| AI classification latency | < 30s per problem (async, non-blocking) |

## 11. Operational Scripts & One-Time Tools

Not all code in this repo is application code. Some tasks are **operational** —
they run once (or sporadically), are not invoked by users, and have no API surface.

### What counts as a script

- Data import / ingestion pipelines
- Database back-fills and one-time migrations
- Taxonomy seed and update tools
- Benchmark / accuracy evaluation runs
- Dataset preparation and normalisation

These live in **`scripts/<purpose>/`** (e.g., `scripts/ingestion/`), NOT in
`functions/src/` or `apps/`.

### Different rules apply to scripts

| Concern | Application code | Operational scripts |
|---------|-----------------|---------------------|
| Architecture | Layered DDD | **Flat — no layers** |
| Error handling | `Result<T,E>` | `throw` / `process.exit(1)` is fine |
| Branded IDs | Required | Not required |
| Type safety | Strict, no `any` | Strict at **external boundaries only** (Zod for API/DB input) |
| Tests | Co-located unit tests | Integration test or manual verification |
| Logging | Structured logger | `console.log` / structured JSON to stdout |

### Rules that still apply

- **No secrets in code.** Read from environment variables.
- **Idempotency.** Re-running a script must not corrupt data (use `ON CONFLICT DO NOTHING`, dedup checks).
- **Exit code 1 on failure.** Scripts signal failure so CI can detect it.
- **Document the run command** in a comment at the top of the file.

### Execution model

Operational scripts run via **GitHub Actions `workflow_dispatch`** (for
anything taking > 5 minutes or needing cloud credentials) or locally for
quick tasks. They are **not deployed** as Azure Functions or any always-on service.

### Shared code

Scripts may import from `db/migrations/` (SQL only, never TypeScript imports
from `functions/src/`). If a script genuinely needs domain logic (e.g., the
same dedup hash algorithm used at runtime), extract that logic to a
**shared utility** in `packages/shared/` rather than coupling to either layer.


- **Fitness functions** (automated checks) enforce architectural rules in CI.
- **ADRs** document every significant architectural choice in `docs/adr/`.
- **Strangler pattern** for replacing components — never big-bang rewrites.
- **Feature flags** for gradual rollout of architectural changes.
