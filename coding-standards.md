# MathPilot — Coding Standards

> Applies to all TypeScript/React code. Enforced by linters and PR review.

---

## 1. Language & Runtime

- **TypeScript strict mode** (`"strict": true`). No exceptions.
- **Target:** ESNext. Use modern syntax — optional chaining, nullish coalescing,
  `using` declarations when available.
- **Node.js LTS** for backend. Keep runtime versions pinned in `.nvmrc` or
  `package.json#engines`.

## 2. Type Safety

### Hard Rules

- **No `any`.** Use `unknown` and narrow with type guards.
- **No type assertions (`as`)** unless interfacing with untyped third-party code,
  and only with a comment explaining why.
- **No `@ts-ignore` or `@ts-expect-error`** without a linked issue for removal.
- **No non-null assertions (`!`)** — handle the null case explicitly.

### Patterns

```typescript
// ✅ Discriminated unions for domain states
type ClassificationResult =
  | { status: "pending" }
  | { status: "classified"; topics: Topic[]; confidence: number }
  | { status: "failed"; error: string };

// ✅ Branded types for domain identifiers
type ProblemId = string & { readonly __brand: "ProblemId" };
type TopicId = string & { readonly __brand: "TopicId" };

// ✅ Zod schemas for runtime validation at boundaries
const CreateProblemSchema = z.object({
  statement: z.string().min(1),
  sourceCompetition: z.string().optional(),
  year: z.number().int().min(1900).max(2100),
});
```

## 3. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | PascalCase | `ProblemCard.tsx` |
| Files (utilities) | kebab-case | `format-latex.ts` |
| Files (tests) | `*.test.ts(x)` | `ProblemCard.test.tsx` |
| Interfaces/Types | PascalCase | `StudentProfile` |
| Functions/variables | camelCase | `classifyProblem()` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Enums | PascalCase members | `CognitiveLoad.Advanced` |
| Database columns | snake_case | `created_at` |
| API endpoints | kebab-case | `/api/training-sessions` |
| Environment vars | UPPER_SNAKE, prefixed | `MATHPILOT_DB_URL` |

## 4. Code Organisation

```
src/
├── domain/           # Pure domain entities, value objects, types
│   ├── taxonomy/     # Topic, Subtopic, Technique, LearningObjective
│   ├── problem/      # Problem, Solution, Competition
│   ├── student/      # StudentProfile, KnowledgeGap
│   └── training/     # TrainingSession, PersonalTrainingCollection
├── application/      # Use cases, orchestration
├── infrastructure/   # Database, AI services, blob storage
├── api/              # HTTP handlers, request/response DTOs
└── ui/               # React components (frontend only)
    ├── components/   # Shared UI primitives
    ├── features/     # Feature-scoped components
    ├── hooks/        # Custom React hooks
    └── pages/        # Route-level components
```

### Rules

- **One export per file** for domain entities and components. Utility modules
  may export multiple related functions.
- **Index files (`index.ts`)** are barrels for public API of a module — keep
  them minimal (re-exports only, no logic).
- **Co-locate tests** next to the code they test.
- **Co-locate styles** next to the component (CSS Modules or Tailwind).

## 5. Function Design

- **Max function length:** ~40 lines. Extract when longer.
- **Max parameters:** 3 positional. Use an options object for more.
- **Pure functions preferred.** Side effects are explicit and pushed to the edges.
- **Early returns** over nested conditionals.
- **No default exports.** Named exports enable better refactoring and tree-shaking.

## 6. Error Handling

- **Domain errors** are typed discriminated unions, not thrown exceptions.
- **Infrastructure errors** (network, database) are caught at the boundary and
  mapped to domain error types.
- **Never swallow errors.** Every `catch` must log or propagate.
- **Use `Result<T, E>` pattern** for operations that can fail predictably.

```typescript
// ✅ Explicit error modelling
type ClassifyError =
  | { kind: "ai_unavailable"; retryAfter: number }
  | { kind: "invalid_input"; field: string; message: string }
  | { kind: "confidence_too_low"; score: number };

async function classifyProblem(
  input: ClassifyInput,
): Promise<Result<Classification, ClassifyError>> { ... }
```

## 7. Async Code

- **`async/await` only.** No raw `.then()` chains.
- **Always handle rejections.** Unhandled promise rejections are bugs.
- **Use `Promise.all`** for independent concurrent operations.
- **Set timeouts** on all external calls (database, AI, HTTP).

## 8. Comments & Documentation

- **Code should be self-documenting.** Comments explain *why*, not *what*.
- **JSDoc on public API surfaces** (exported functions, component props).
- **TODO comments** must include an issue reference: `// TODO(#123): ...`
- **No commented-out code.** Use version control.

## 9. Dependencies

- **Evaluate before adding.** Prefer the standard library. Justify new
  dependencies in the PR description.
- **Pin exact versions** in `package.json` (no `^` or `~`).
- **Audit regularly.** `npm audit` runs in CI; critical vulnerabilities block merge.
- **No duplicate functionality.** One library per concern (one date lib, one
  validation lib, one HTTP client).

## 10. Git Practices

- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
  `chore:`, `perf:`.
- **Atomic commits.** Each commit compiles and passes tests independently.
- **Branch naming:** `feat/short-description`, `fix/issue-number-description`.
- **Squash-merge to main.** Feature branches are disposable.
- **No force-push to shared branches.**
