# functions/src — Main Application Code (Future)

This directory contains infrastructure and domain utilities for the **MathPilot
main application** (Azure Functions API + React SPA).

## Directory structure

```
functions/src/
  shared/           ← Pure cross-cutting utilities (no DB/HTTP/AI deps)
  domain/           ← Pure domain logic (entities, rules, value objects)
  infrastructure/   ← DB, AI, blob adapters
  application/      ← Use cases (to be added per feature)
  api/              ← Azure Functions HTTP handlers (to be added per feature)
```

`shared/` has **no layer affinity** — any layer and any operational script
may import from it. See `docs/governance/architecture-principles.md §1`.

## What's here now (pre-app)

| Path | Purpose | Reused by |
|------|---------|-----------|
| `shared/latex.ts` | LaTeX normalise/strip | Any LaTeX input (UI, PDF, .tex upload) |
| `shared/competition.ts` | Competition name resolver | Problem import from any source |
| `shared/dedup.ts` | SHA-256 dedup hash | Trainer "add problem" feature |
| `domain/shared/result.ts` | `Result<T,E>` type + helpers | Domain boundaries |
| `domain/shared/branded.ts` | Branded ID types | All domain entities |
| `domain/taxonomy/types.ts` | Taxonomy interfaces | Search, recommendations |
| `infrastructure/ai/classifier.ts` | OpenAI classification (sync + Batch API) | Re-classification, trainer review |
| `infrastructure/ai/embedder.ts` | text-embedding-3-small batched | Any new problem write |
| `infrastructure/ai/prompts/classify-problem.ts` | Versioned classification prompt v1 | Classification feature |
| `infrastructure/database/problem-repository.ts` | PostgreSQL problem insert | Problem write path |
