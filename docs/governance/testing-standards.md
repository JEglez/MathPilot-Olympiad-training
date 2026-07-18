# MathPilot — Testing Standards

> Every merged line of business logic must have a corresponding test.

---

## 1. Testing Philosophy

- **Tests are documentation.** A test suite should explain what the system does
  and what it guarantees.
- **Test behaviour, not implementation.** Refactoring internals should not break tests.
- **Fast feedback.** Unit tests run in < 10 seconds. The full suite runs in < 5 minutes.
- **Deterministic.** No flaky tests. Tests that depend on timing, order, or
  external services are quarantined and fixed immediately.

## 2. Test Pyramid

```
         ╱╲
        ╱  ╲        E2E Tests (critical paths only)
       ╱────╲       ~5% of tests
      ╱      ╲
     ╱────────╲     Integration Tests (API + DB)
    ╱          ╲    ~25% of tests
   ╱────────────╲
  ╱              ╲  Unit Tests (domain logic, utilities)
 ╱________________╲ ~70% of tests
```

## 3. Test Categories

### 3.1 Unit Tests

**Scope:** Pure domain logic, utility functions, type transformations.

- **Framework:** Vitest.
- **Location:** Co-located as `*.test.ts` next to source.
- **Rules:**
  - No I/O (network, filesystem, database).
  - No mocking frameworks for domain logic — use plain test doubles.
  - Test file mirrors source structure: `classify-problem.ts` →
    `classify-problem.test.ts`.

```typescript
// ✅ Testing domain logic purely
describe("calculateKnowledgeGap", () => {
  it("identifies missing techniques from required set", () => {
    const required = [techniqueA, techniqueB, techniqueC];
    const mastered = [techniqueA];
    const gaps = calculateKnowledgeGap(required, mastered);
    expect(gaps).toEqual([techniqueB, techniqueC]);
  });
});
```

### 3.2 Integration Tests

**Scope:** API endpoints, database queries, AI service adapters.

- **Framework:** Vitest + test containers or in-memory DB.
- **Location:** `__tests__/integration/` or co-located with `*.integration.test.ts`.
- **Rules:**
  - Use a real database (test containers) — no mocking SQL queries.
  - AI service calls use **recorded fixtures** (VCR pattern), not live calls.
  - Each test manages its own data setup and teardown.
  - Tests are isolated — no shared mutable state between tests.

### 3.3 End-to-End Tests

**Scope:** Critical user journeys through the full stack.

- **Framework:** Playwright.
- **Location:** `e2e/`.
- **Rules:**
  - Cover only the **happy paths** of core workflows (upload, search, browse, chat).
  - Use stable selectors (`data-testid`), never CSS classes or DOM structure.
  - Run against a deployed preview environment, not localhost.
  - Maximum 20 E2E tests. If you need more, the missing coverage belongs in
    integration tests.

### 3.4 AI/ML-Specific Tests

**Scope:** Prompt quality, classification accuracy, embedding consistency.

- **Framework:** Custom benchmark harness.
- **Location:** `benchmarks/`.
- **Rules:**
  - Maintain a **golden dataset** of manually classified problems (minimum 50).
  - Every prompt change runs against the golden dataset and reports accuracy
    metrics.
  - **Regression threshold:** new prompts must not reduce accuracy by more than
    2% on the golden dataset.
  - Embedding dimension and distance metric changes require re-indexing tests.

## 4. Test Quality Rules

### What to Test

- **Every public function** in the domain layer.
- **Every API endpoint** (happy path + error cases + validation).
- **Every state transition** in domain entities.
- **Edge cases:** empty inputs, maximum sizes, unicode/LaTeX content, concurrent
  modifications.

### What Not to Test

- Private implementation details.
- Third-party library internals (test your usage of them, not the library).
- Trivial getters/setters with no logic.
- Generated code (types, migrations).

### Test Naming

```
describe("<UnitUnderTest>", () => {
  it("<does expected thing> when <condition>", () => { ... });
});
```

Use plain English. The description should form a readable sentence.

## 5. Mocking & Test Doubles

- **Prefer fakes over mocks.** An in-memory repository is better than a mocked
  database call.
- **Mock at boundaries only.** AI services, external APIs, and the clock are
  acceptable mock targets.
- **Never mock what you own.** If you're mocking your own code, the design needs
  refactoring.
- **Type-safe mocks.** Test doubles must satisfy the same TypeScript interface as
  the real implementation.

## 6. Coverage

- **Target:** ≥ 80% line coverage on domain and application layers.
- **Hard floor:** ≥ 60% overall. PRs that reduce coverage below the floor are blocked.
- **Coverage is a guide, not a goal.** 100% coverage with shallow assertions is
  worse than 80% coverage with meaningful tests.
- **Exclude from coverage:** generated files, type definitions, barrel exports,
  configuration files.

## 7. CI Integration

- **All tests run on every PR.** No exceptions.
- **Unit tests** run first (fastest feedback).
- **Integration tests** run after unit tests pass.
- **E2E tests** run on merge to main (or on-demand for PRs touching UI).
- **Failing tests block merge.** No "skip" annotations without an issue link.
- **Test duration is tracked.** Tests exceeding time budgets are flagged for
  optimisation.

## 8. Test Data

- **Use factory functions** for creating test entities (e.g., `buildProblem()`,
  `buildTechnique()`).
- **Factories produce valid defaults** — override only what matters for the test.
- **No shared fixtures across test files.** Each test file is self-contained.
- **Mathematical content in tests** uses real olympiad problems, not lorem ipsum.
