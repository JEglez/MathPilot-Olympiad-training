# functions/src — Main Application Code (Future)

This directory contains infrastructure and domain utilities for the **MathPilot
main application** (Azure Functions API + React SPA).

## What's here now (pre-app)

These files were written during the ingestion pipeline phase and preserved because
they will be directly reused by the main application:

| Path | Purpose | Reused by |
|------|---------|-----------|
| `domain/shared/result.ts` | `Result<T,E>` type + helpers | All layers |
| `domain/shared/branded.ts` | Branded ID types | All domain entities |
| `domain/taxonomy/types.ts` | Taxonomy interfaces | Search, recommendations |
| `domain/ingestion/dedup.ts` | SHA-256 dedup hash | Trainer "add problem" feature |
| `infrastructure/normalise/latex.ts` | LaTeX normalise/strip | Any LaTeX input (UI, PDF, .tex upload) |
| `infrastructure/normalise/competition.ts` | Competition name resolver | Problem import from any source |
| `infrastructure/ai/classifier.ts` | OpenAI classification (sync + Batch API) | Re-classification, trainer review |
| `infrastructure/ai/embedder.ts` | text-embedding-3-small batched | Any new problem write |
| `infrastructure/ai/prompts/classify-problem.ts` | Versioned classification prompt v1 | Classification feature |
| `infrastructure/database/problem-repository.ts` | PostgreSQL problem insert | Problem write path |

## What belongs here when the main app is built

Per `docs/governance/architecture-principles.md`:

```
functions/src/
  api/              ← Azure Functions HTTP handlers (GET/POST/etc.)
  application/      ← Use cases (search, recommend, classify)
  domain/           ← Pure domain logic (entities, rules, value objects)
  infrastructure/   ← DB, AI, blob adapters
```

The files above already follow this layering — they just lack the API and
application layers, which get added as features are built.
