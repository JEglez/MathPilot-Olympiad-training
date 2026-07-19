# Copilot Instructions — MathPilot

> Instructions for GitHub Copilot when working in this repository.

## Project Context

MathPilot is an AI-powered Math Olympiad training platform. It uses a
knowledge-graph architecture to classify problems by Topics, Subtopics,
Techniques, and Learning Objectives — enabling intelligent search,
recommendations, and gap analysis for olympiad students and trainers.

**Tech stack:** TypeScript (strict), React + Vite, Azure Functions,
PostgreSQL + pgvector, Azure OpenAI, Azure Static Web Apps.

## Governance Documents

Read these docs before making design or implementation decisions. Use
the `view` tool to read any document you need — do NOT guess at rules.

| Document | Path | When to read |
|----------|------|-------------|
| **Constitution** | `docs/governance/constitution.md` | Before ANY planning or design decision |
| **Architecture** | `docs/governance/architecture-principles.md` | When deciding where code belongs or designing components |
| **Coding Standards** | `docs/governance/coding-standards.md` | When writing or reviewing TypeScript code |
| **Testing Standards** | `docs/governance/testing-standards.md` | When planning or writing tests |
| **AI Guidelines** | `docs/governance/ai-guidelines.md` | When working with any AI/LLM/embedding feature |
| **UI/UX Constitution** | `docs/governance/ui-ux-constitution.md` | When writing or reviewing ANY React/CSS/UI code |
| **Domain Model** | `docs/domain-model.md` | When designing entities or database schemas |
| **Taxonomy** | `docs/taxonomy.md` | When working with problem classification |

## Key Rules (Quick Reference)

These are the most critical rules. For full details, read the governance docs.

### Architecture
- **Domain layer is pure.** Zero external dependencies in `src/domain/`.
- **Dependencies point inward.** Infrastructure → Application → Domain.
- **Validate at boundaries.** Zod schemas for all external input.
- **AI services are adapters.** Wrap behind domain interfaces.

### TypeScript
- No `any`, no `as` assertions, no `@ts-ignore`, no `!` non-null assertions.
- Use discriminated unions for states, branded types for IDs.
- Named exports only. `async/await` only. Max 3 positional params.

### Domain
- Mathematical content is NEVER AI-generated. Classify and retrieve only.
- Taxonomy codes: `DOMAIN-SUBTOPIC` format (e.g., `NT-DIV`, `ALG-FEQ`).
- AI classifications are always `ai_proposed` until trainer-validated.

### Testing
- Co-locate tests. Test behaviour, not implementation.
- Factory functions for test data. Mock at boundaries only.

### Error Handling
- Domain errors: `Result<T, E>` with typed discriminated unions.
- Never swallow errors.

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Atomic commits. Squash-merge to main.

### Naming

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

### What NOT To Do

- Do not generate mathematical proofs or solutions.
- Do not hardcode AI model identifiers — use configuration.
- Do not add dependencies without justification.
- Do not put business logic in API handlers — delegate to application layer.
- Do not create global mutable state.
- Do not use `console.log` for production logging — use structured logger.

---

## Custom Agents

This repo has two Copilot agents. **Use them proactively** — do not generate
boilerplate manually or design ad-hoc when an agent is better suited.

### Agent routing table

| Agent | Tool | Best for | Auto-detected triggers |
|-------|------|----------|----------------------|
| **mathpilot-planner** | `mathpilot_plan_review` | Design decisions, new features, architecture reviews, governance compliance checks | "plan", "design", "architect", "implement feature", "set up", "add feature", "how should I" |
| **mathpilot-codegen** | `mathpilot_scaffold` | Scaffold new entities, components, handlers, use-cases, migrations, scripts | "scaffold", "generate", "create a component", "new entity", "new handler", "new migration" |
| **mathpilot-codegen** | `mathpilot_list_templates` | List available scaffold templates | "what templates", "what can codegen do" |

### Auto-identification rules

Both extensions run `onUserPromptSubmitted` hooks that **automatically inject**
the right governance context based on keywords in your prompt. You do not need
to explicitly invoke an agent — simply describe your intent:

- **"scaffold a ProblemCard component"** → codegen injects UI/UX rules + suggests `mathpilot_scaffold`
- **"plan a new training session feature"** → planner injects planning template + governance docs
- **"create a responsive search page"** → both hooks fire: planning template + UI/UX constitution
- **"generate a domain entity for Technique"** → codegen injects scaffold guidance + architecture rules

### Recommended workflow for new features

```
1. Write your plan (objectives, layers, files)
   → Call mathpilot_plan_review to check for violations

2. For each new file needed:
   → Call mathpilot_scaffold with the appropriate template
   → Available: domain-entity, api-handler, application-use-case,
                infrastructure-adapter, react-component, migration,
                test-factory, script

3. Fill in the generated TODO stubs with real logic

4. For UI work: read docs/governance/ui-ux-constitution.md §11
   (CodeGen Rules) before writing any component code
```

### UI/UX Rules (quick ref — full doc: `docs/governance/ui-ux-constitution.md`)

- Page padding: **`px-4 sm:px-6`** — never bare `px-6`
- Touch targets: **`min-h-[44px]`** on all buttons/links
- Sidebars: mobile hamburger toggle + overlay drawer required
- Grids: **must collapse to `grid-cols-1`** at `md:` breakpoint
- No `<div onClick>` — use **`<button type="button">`**
- LaTeX: always via **`renderLatexToHtml()`** — no direct KaTeX calls
- No hardcoded hex colours — use **CSS token variables** or Tailwind theme classes
- Every `.tsx` component needs a co-located **`.module.css`** with a `@media` block
