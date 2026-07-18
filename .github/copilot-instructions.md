# Copilot Instructions — MathPilot

> Instructions for GitHub Copilot when working in this repository.

## Project Context

MathPilot is an AI-powered Math Olympiad training platform. It uses a
knowledge-graph architecture to classify problems by Topics, Subtopics,
Techniques, and Learning Objectives — enabling intelligent search,
recommendations, and gap analysis for olympiad students and trainers.

**Tech stack:** TypeScript (strict), React + Vite, Azure Functions,
PostgreSQL + pgvector, Azure OpenAI, Azure Static Web Apps.

## Architecture Rules — Always Follow

- **Domain layer is pure.** Entities in `src/domain/` have zero external
  dependencies. No database imports, no HTTP clients, no framework code.
- **Dependencies point inward.** Infrastructure → Application → Domain.
  Never reference infrastructure from domain code.
- **Validate at boundaries.** Use Zod schemas to validate all external input
  (API requests, AI responses, file uploads) before it enters the domain.
- **AI services are adapters.** Wrap all LLM/embedding calls behind domain
  interfaces (`ProblemClassifier`, `EmbeddingGenerator`). Never call
  Azure OpenAI directly from application or domain code.

## TypeScript Rules

- **No `any`.** Use `unknown` with type guards.
- **No type assertions (`as`)** unless interfacing with untyped third-party
  code. Add a comment explaining why.
- **No `@ts-ignore`.** Fix the type error or file an issue.
- **No non-null assertions (`!`).** Handle the null case.
- **Use discriminated unions** for domain states and error types.
- **Use branded types** for domain identifiers (`ProblemId`, `TopicId`).
- **Named exports only.** No default exports.

## Code Style

- **Pure functions preferred.** Push side effects to the edges.
- **Early returns** over nested conditionals.
- **Max 3 positional parameters.** Use an options object for more.
- **Async/await only.** No `.then()` chains.
- **Comments explain _why_, not _what_.** Code should be self-documenting.
- **No commented-out code.** Use git history.
- **TODO format:** `// TODO(#issue): description`

## React Patterns

- **Server state:** TanStack Query (React Query). No manual fetch + useState.
- **Local state:** React hooks only. No global state library unless justified.
- **Components:** Functional components with TypeScript props interfaces.
- **LaTeX:** Use the shared `MathRenderer` component. No direct KaTeX calls.
- **Test IDs:** Use `data-testid` attributes for E2E tests.
- **Accessibility:** Every interactive element must have an accessible label.

## Testing

- **Co-locate tests:** `Component.test.tsx` next to `Component.tsx`.
- **Test behaviour, not implementation.** Refactoring should not break tests.
- **Use factory functions** for test data (`buildProblem()`, `buildTechnique()`).
- **Mock at boundaries only.** Prefer in-memory fakes over mocking frameworks.
- **AI fixtures:** Use recorded responses (VCR pattern) for AI service tests.

## Domain-Specific Rules

- **Mathematical content is never AI-generated.** The system classifies and
  retrieves — it does not generate proofs or solutions.
- **Taxonomy codes follow the established format:** `DOMAIN-SUBTOPIC`
  (e.g., `NT-DIV`, `ALG-FEQ`, `GEO-S-ANG`).
- **Difficulty is multi-dimensional.** Never reduce it to a single scalar.
  Use the complexity dimensions defined in the domain model.
- **AI classifications are always provisional.** Mark them as `ai_proposed`
  until a trainer validates.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase files | `ProblemCard.tsx` |
| Utilities | kebab-case files | `format-latex.ts` |
| Functions/variables | camelCase | `classifyProblem` |
| Types/Interfaces | PascalCase | `StudentProfile` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| DB columns | snake_case | `created_at` |
| API paths | kebab-case | `/api/training-sessions` |
| Env vars | UPPER_SNAKE, prefixed | `MATHPILOT_DB_URL` |

## Error Handling

- **Domain errors:** Typed discriminated unions returned as `Result<T, E>`.
- **Infrastructure errors:** Caught at boundary, mapped to domain errors.
- **Never swallow errors.** Every catch block logs or propagates.

## Git

- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
  `chore:`.
- **Atomic commits.** Each commit compiles and passes tests.
- **Squash-merge** feature branches to main.

## What NOT To Do

- Do not generate mathematical proofs or solutions.
- Do not hardcode AI model identifiers — use configuration.
- Do not add dependencies without justification.
- Do not put business logic in API handlers — delegate to application layer.
- Do not create global mutable state.
- Do not use `console.log` for production logging — use structured logger.
