// Extension: mathpilot-planner
// Planning agent that enforces MathPilot project rules and constitution.
// Injects project rules as context and provides a planning tool.

import { joinSession } from "@github/copilot-sdk/extension";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ─── Project rules compiled from all governance docs ───────────────────────

const PROJECT_RULES = `
## MathPilot — Project Rules & Constitution (Compiled Reference)

You are working on MathPilot, an AI-powered Math Olympiad training platform.
It uses a knowledge-graph architecture to classify problems by Topics, Subtopics,
Techniques, and Learning Objectives.

**Tech stack:** TypeScript (strict), React + Vite, Azure Functions,
PostgreSQL + pgvector, Azure OpenAI, Azure Static Web Apps.

### CONSTITUTION — Non-Negotiable Principles

1. **Domain Integrity Is Sacred**
   - No feature bypasses the domain model (Topics, Subtopics, Techniques, LearningObjectives, Problems).
   - Taxonomy changes require domain expert review. AI may propose; humans validate.
   - Mathematical content is NEVER fabricated. The system retrieves and classifies — never generates proofs or solutions.

2. **AI Assists, Humans Decide**
   - AI is used for classification, search, and recommendation — never for generating mathematical truth.
   - Every AI-produced classification is provisional (\`ai_proposed\`) until a trainer validates.
   - LLM outputs are logged, versioned, and auditable.
   - The system must function (degraded mode) when AI services are unavailable.

3. **Correctness Over Speed**
   - Mathematical accuracy is the #1 quality metric.
   - Type safety is mandatory. No \`any\`, no runtime type coercion on domain entities.
   - Every public API contract is validated at the boundary.

4. **Cost Discipline**
   - AI at ingestion, not at runtime. Pre-compute embeddings and classifications.
   - Consumption-based pricing by default. No always-on infra unless proven necessary.
   - Cheapest model that meets quality bar. Justify upgrades with benchmarks.

5. **Open by Default**
   - Code is open source. Secrets, credentials, and PII are never committed.
   - Documentation lives next to the code it describes.
   - Decisions are recorded in ADRs in \`docs/adr/\`.

### ARCHITECTURE RULES

- **Layered architecture**: Presentation → Application → Domain → Infrastructure.
  Dependencies point INWARD only.
- **Domain layer is pure**: Zero external imports. No DB drivers, HTTP clients, or framework code.
- **Application layer orchestrates**: Calls domain logic and infra adapters, contains no business rules.
- **Bounded Contexts**: Taxonomy, Problem Corpus, Student Profile, Training, Ingestion.
  Entities are only modified through their owning context's commands.
  Cross-context communication uses DTOs or domain events, never shared mutable state.
- **API Design**: RESTful, Zod-validated at boundaries, RFC 9457 error responses, cursor-based pagination.
- **Data**: PostgreSQL is system of record. pgvector for similarity search.
  Migrations are forward-only, versioned, reviewed.
  Every table has \`created_at\` and \`updated_at\`. Soft deletes for user-facing content.
- **AI Integration**: AI calls wrapped behind domain interfaces (\`ProblemClassifier\`, \`EmbeddingGenerator\`).
  Prompts versioned in code. Responses cached with content-addressable keys.
  Retry with exponential backoff + circuit breakers.
  Model identifiers are configuration, not code.
- **Frontend**: Component hierarchy: Pages → Feature components → UI primitives.
  Server state via TanStack Query. LaTeX via shared \`MathRenderer\` component.
  WCAG 2.1 AA minimum.
- **Infra as Code**: All Azure resources in Bicep/Terraform. Secrets in Key Vault.
  Structured logging and request tracing from day one.

### TYPESCRIPT RULES

- **No \`any\`** — use \`unknown\` with type guards.
- **No type assertions (\`as\`)** unless interfacing with untyped third-party code (with comment).
- **No \`@ts-ignore\`** — fix the type error or file an issue.
- **No non-null assertions (\`!\`)** — handle the null case.
- **Use discriminated unions** for domain states and error types.
- **Use branded types** for domain identifiers (\`ProblemId\`, \`TopicId\`).
- **Named exports only.** No default exports.
- **\`async/await\` only.** No \`.then()\` chains.
- **Max 3 positional parameters.** Use options object for more.
- **Max ~40 line functions.** Extract when longer.
- **Pure functions preferred.** Side effects at the edges.
- **Early returns** over nested conditionals.
- **Comments explain WHY, not WHAT.** No commented-out code.
- **TODO format:** \`// TODO(#issue): description\`
- **Pin exact versions** in \`package.json\`.

### ERROR HANDLING

- Domain errors: Typed discriminated unions returned as \`Result<T, E>\`.
- Infrastructure errors: Caught at boundary, mapped to domain errors.
- Never swallow errors. Every catch block logs or propagates.

### NAMING CONVENTIONS

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase files | \`ProblemCard.tsx\` |
| Utilities | kebab-case files | \`format-latex.ts\` |
| Functions/variables | camelCase | \`classifyProblem\` |
| Types/Interfaces | PascalCase | \`StudentProfile\` |
| Constants | UPPER_SNAKE | \`MAX_RETRY_COUNT\` |
| DB columns | snake_case | \`created_at\` |
| API paths | kebab-case | \`/api/training-sessions\` |
| Env vars | UPPER_SNAKE, prefixed | \`MATHPILOT_DB_URL\` |

### CODE ORGANIZATION

\`\`\`
src/
├── domain/           # Pure entities, value objects, types
│   ├── taxonomy/     # Topic, Subtopic, Technique, LearningObjective
│   ├── problem/      # Problem, Solution, Competition
│   ├── student/      # StudentProfile, KnowledgeGap
│   └── training/     # TrainingSession, PersonalTrainingCollection
├── application/      # Use cases, orchestration
├── infrastructure/   # Database, AI services, blob storage
├── api/              # HTTP handlers, request/response DTOs
└── ui/               # React components
    ├── components/   # Shared UI primitives
    ├── features/     # Feature-scoped components
    ├── hooks/        # Custom React hooks
    └── pages/        # Route-level components
\`\`\`

### TESTING STANDARDS

- **Vitest** for unit/integration tests. **Playwright** for E2E.
- Co-locate tests next to source (\`*.test.ts\`).
- Test behaviour, not implementation.
- Use factory functions (\`buildProblem()\`, \`buildTechnique()\`) for test data.
- Mock at boundaries only. Prefer in-memory fakes over mocking frameworks.
- AI tests use recorded fixtures (VCR pattern).
- Coverage: ≥80% domain/application, ≥60% overall floor.
- Golden evaluation set (≥50 examples) for prompt changes.
- Prompt changes must not reduce accuracy by >2%.

### AI-SPECIFIC RULES

- AI is infrastructure, not product. Wrapped behind domain interfaces.
- NEVER generate mathematical proofs or solutions.
- Prompts live in version-controlled files (\`src/infrastructure/ai/prompts/\`).
- Constrain output format (JSON mode + Zod parsing).
- Temperature 0 for classification/extraction.
- System prompts immutable per version; user input in user messages only.
- Embeddings pre-computed in pgvector, not at query time.
- Rate limiting, circuit breakers, and cost logging on all AI calls.

### GIT PRACTICES

- Conventional commits: \`feat:\`, \`fix:\`, \`refactor:\`, \`docs:\`, \`test:\`, \`chore:\`, \`perf:\`.
- Atomic commits. Each compiles and passes tests.
- Branch naming: \`feat/short-description\`, \`fix/issue-number-description\`.
- Squash-merge to main.

### PERFORMANCE BUDGETS

| Metric | Target |
|--------|--------|
| Search response (P95) | < 500ms |
| Page load (LCP) | < 2.5s |
| Bundle size (initial) | < 200KB gzipped |
| AI classification latency | < 30s (async, non-blocking) |

### DECISION-MAKING

| Decision Type | Authority | Artefact |
|---------------|-----------|----------|
| Domain model changes | Domain expert + 1 engineer | ADR + migration |
| Architecture changes | 2 engineers | ADR |
| Dependency additions | 1 engineer + CI check | PR review |
| AI model/prompt changes | 1 engineer + accuracy benchmark | PR + benchmark results |
| Security-sensitive changes | 2 engineers | PR + threat note |

### WHAT NOT TO DO

- Do not generate mathematical proofs or solutions.
- Do not hardcode AI model identifiers.
- Do not add dependencies without justification.
- Do not put business logic in API handlers.
- Do not create global mutable state.
- Do not use \`console.log\` for production logging.
`;

// ─── Planning-specific instructions ────────────────────────────────────────

const PLANNING_CONTEXT = `
## Planning Agent Instructions

When creating implementation plans, you MUST:

1. **Validate against constitution**: Every planned feature must align with the
   5 core tenets (Domain Integrity, AI Assists/Humans Decide, Correctness Over Speed,
   Cost Discipline, Open by Default).

2. **Respect layered architecture**: Plan code placement in the correct layer
   (domain, application, infrastructure, api, ui). Never plan domain code with
   external dependencies.

3. **Plan for type safety**: Include branded types for IDs, discriminated unions
   for states, Zod schemas for boundaries. No \`any\`.

4. **Include testing in every plan**: Unit tests for domain logic, integration
   tests for APIs/DB, E2E only for critical paths. Specify factory functions
   and test doubles needed.

5. **Plan AI features correctly**: AI classifies/retrieves, never generates math.
   Wrap behind domain interfaces. Include prompt versioning, caching, and
   graceful degradation in the plan.

6. **Follow naming conventions**: PascalCase components, kebab-case utilities,
   camelCase functions, UPPER_SNAKE constants, snake_case DB columns.

7. **Specify error handling**: Plan Result<T, E> types for domain operations,
   boundary error mapping, and structured logging.

8. **Include ADRs**: Any architecture or domain model change requires a planned
   ADR in \`docs/adr/\`.

9. **Cost awareness**: Prefer consumption-based pricing, pre-computed AI results,
   and cheapest-sufficient models.

10. **Taxonomy codes**: Follow format \`DOMAIN-SUBTOPIC\` (e.g., \`NT-DIV\`, \`ALG-FEQ\`).
    AI classifications are always \`ai_proposed\` until trainer-validated.
`;

// ─── Helper: read a project doc if it exists ───────────────────────────────

async function readProjectDoc(workingDirectory, filename) {
    try {
        const content = await readFile(join(workingDirectory, filename), "utf-8");
        return content;
    } catch {
        return null;
    }
}

// ─── Extension entry point ─────────────────────────────────────────────────

const session = await joinSession({
    hooks: {
        onSessionStart: async (input) => {
            await session.log("MathPilot Planner loaded — project rules active");
            return {
                additionalContext: PROJECT_RULES + PLANNING_CONTEXT,
            };
        },

        onUserPromptSubmitted: async (input) => {
            const prompt = input.prompt.toLowerCase();
            const isPlanningRequest =
                prompt.includes("plan") ||
                prompt.includes("design") ||
                prompt.includes("architect") ||
                prompt.includes("implement") ||
                prompt.includes("create") ||
                prompt.includes("build") ||
                prompt.includes("add feature") ||
                prompt.includes("scaffold") ||
                prompt.includes("set up") ||
                prompt.includes("setup");

            if (isPlanningRequest) {
                return {
                    additionalContext:
                        PROJECT_RULES +
                        PLANNING_CONTEXT +
                        "\n\nThis is a planning request. Structure your plan with:\n" +
                        "1. **Objective** — what we're building and why\n" +
                        "2. **Constitution check** — which tenets apply and how we'll honor them\n" +
                        "3. **Architecture** — which layers/bounded contexts are involved\n" +
                        "4. **Implementation steps** — ordered tasks with file paths and layer assignments\n" +
                        "5. **Type design** — key types, branded IDs, discriminated unions, Zod schemas\n" +
                        "6. **Error handling** — Result types and boundary error mapping\n" +
                        "7. **Testing strategy** — unit/integration/E2E tests, factories, fixtures\n" +
                        "8. **AI considerations** — if applicable: interfaces, prompts, caching, degradation\n" +
                        "9. **ADR needed?** — flag if an Architecture Decision Record is required\n" +
                        "10. **Performance & cost** — budget impact and optimization notes\n",
                };
            }

            return undefined;
        },

        onPreToolUse: async (input) => {
            // Warn if creating files in wrong layers
            if (input.toolName === "create" || input.toolName === "edit") {
                const path = String(input.toolArgs?.path || "");

                // Domain files must not import infrastructure
                if (path.includes("/domain/") || path.includes("\\domain\\")) {
                    return {
                        additionalContext:
                            "RULE CHECK: This file is in the domain layer. " +
                            "Domain code must have ZERO external dependencies — no database drivers, " +
                            "no HTTP clients, no framework code. Only pure TypeScript with no imports " +
                            "from infrastructure/ or application/ layers.",
                    };
                }

                // API handlers should delegate to application layer
                if (path.includes("/api/") || path.includes("\\api\\")) {
                    return {
                        additionalContext:
                            "RULE CHECK: This is an API handler. " +
                            "Do NOT put business logic here — delegate to the application layer. " +
                            "Validate input with Zod schemas at the boundary. " +
                            "Use RFC 9457 Problem Details for error responses.",
                    };
                }

                // AI service files should be infrastructure adapters
                if (
                    (path.includes("/ai/") || path.includes("\\ai\\")) &&
                    (path.includes("/infrastructure/") || path.includes("\\infrastructure\\"))
                ) {
                    return {
                        additionalContext:
                            "RULE CHECK: This is an AI infrastructure adapter. " +
                            "Implement a domain interface (ProblemClassifier, EmbeddingGenerator, etc.). " +
                            "Model identifiers must come from configuration, not hardcoded. " +
                            "Include retry with exponential backoff and circuit breaker. " +
                            "Log token usage for cost tracking. Cache with content-addressable keys.",
                    };
                }
            }

            return undefined;
        },
    },

    tools: [
        {
            name: "mathpilot_plan_review",
            description:
                "Review an implementation plan against MathPilot's constitution, architecture principles, " +
                "coding standards, testing standards, and AI guidelines. Returns a compliance report " +
                "identifying violations and suggesting corrections.",
            parameters: {
                type: "object",
                properties: {
                    plan: {
                        type: "string",
                        description: "The implementation plan text to review for compliance",
                    },
                },
                required: ["plan"],
            },
            handler: async (args) => {
                const plan = args.plan.toLowerCase();
                const violations = [];
                const warnings = [];

                // Constitution checks
                if (plan.includes("generate proof") || plan.includes("generate solution") || plan.includes("create proof")) {
                    violations.push(
                        "CONSTITUTION VIOLATION [§2.1]: Plan includes generating mathematical proofs/solutions. " +
                        "The system retrieves and classifies — it NEVER generates mathematical truth."
                    );
                }

                if (plan.includes("any") && (plan.includes("type:") || plan.includes("as any"))) {
                    violations.push(
                        "CODING STANDARD VIOLATION: Plan uses 'any' type. Use 'unknown' with type guards instead."
                    );
                }

                if (plan.includes("console.log") && !plan.includes("test")) {
                    warnings.push(
                        "WARNING: Plan uses console.log. Use structured logger for production code."
                    );
                }

                if (plan.includes("hardcod") && plan.includes("model")) {
                    violations.push(
                        "AI GUIDELINE VIOLATION [§3]: Model identifiers must be environment configuration, not hardcoded."
                    );
                }

                if ((plan.includes("global state") || plan.includes("global variable")) && !plan.includes("no global")) {
                    warnings.push(
                        "WARNING: Plan may introduce global mutable state. This is prohibited."
                    );
                }

                // Architecture checks
                if (plan.includes("domain") && (plan.includes("import") || plan.includes("require")) &&
                    (plan.includes("database") || plan.includes("http") || plan.includes("fetch") || plan.includes("axios"))) {
                    violations.push(
                        "ARCHITECTURE VIOLATION: Domain layer must have zero external dependencies. " +
                        "Database and HTTP imports belong in infrastructure layer."
                    );
                }

                if (plan.includes("business logic") && plan.includes("api handler")) {
                    violations.push(
                        "ARCHITECTURE VIOLATION: Business logic must not live in API handlers. " +
                        "Delegate to the application layer."
                    );
                }

                // Testing checks
                if (!plan.includes("test") && !plan.includes("spec")) {
                    warnings.push(
                        "WARNING: Plan does not mention tests. Every feature needs unit tests (domain), " +
                        "integration tests (API/DB), and possibly E2E tests (critical paths)."
                    );
                }

                // AI checks
                if (plan.includes("openai") && !plan.includes("interface") && !plan.includes("adapter")) {
                    warnings.push(
                        "WARNING: Direct OpenAI references without domain interface abstraction. " +
                        "AI calls must be wrapped behind domain interfaces (ProblemClassifier, EmbeddingGenerator)."
                    );
                }

                if (plan.includes("embedding") && plan.includes("runtime") && !plan.includes("pre-comput")) {
                    warnings.push(
                        "WARNING: Plan may compute embeddings at runtime. Embeddings should be " +
                        "pre-computed and stored in pgvector."
                    );
                }

                // Error handling checks
                if (plan.includes("throw") && !plan.includes("result<") && !plan.includes("result type")) {
                    warnings.push(
                        "WARNING: Plan uses thrown exceptions for domain errors. " +
                        "Prefer Result<T, E> pattern with typed discriminated unions."
                    );
                }

                // Build report
                let report = "# MathPilot Plan Compliance Report\n\n";

                if (violations.length === 0 && warnings.length === 0) {
                    report += "✅ **PASSED** — No violations or warnings detected.\n\n";
                    report += "The plan appears to comply with all project rules. " +
                        "Verify manually that:\n" +
                        "- Correct bounded context ownership is respected\n" +
                        "- Taxonomy codes follow DOMAIN-SUBTOPIC format\n" +
                        "- AI classifications are marked as ai_proposed\n" +
                        "- ADRs are created for architecture decisions\n";
                } else {
                    if (violations.length > 0) {
                        report += `❌ **${violations.length} VIOLATION(S) FOUND:**\n\n`;
                        violations.forEach((v, i) => { report += `${i + 1}. ${v}\n\n`; });
                    }
                    if (warnings.length > 0) {
                        report += `⚠️ **${warnings.length} WARNING(S):**\n\n`;
                        warnings.forEach((w, i) => { report += `${i + 1}. ${w}\n\n`; });
                    }
                    report += "\n---\nPlease address violations before proceeding. Warnings should be reviewed.";
                }

                return report;
            },
        },

        {
            name: "mathpilot_get_project_rules",
            description:
                "Returns the complete compiled MathPilot project rules including constitution, " +
                "architecture principles, coding standards, testing standards, AI guidelines, " +
                "and naming conventions. Use this to reference rules during planning or review.",
            parameters: {
                type: "object",
                properties: {
                    section: {
                        type: "string",
                        description:
                            "Optional: filter to a specific section. Values: 'constitution', " +
                            "'architecture', 'typescript', 'testing', 'ai', 'naming', 'errors', 'git', 'all'. " +
                            "Defaults to 'all'.",
                    },
                },
            },
            handler: async (args) => {
                const section = (args.section || "all").toLowerCase();

                if (section === "all") return PROJECT_RULES;

                const sections = {
                    constitution: "### CONSTITUTION",
                    architecture: "### ARCHITECTURE RULES",
                    typescript: "### TYPESCRIPT RULES",
                    testing: "### TESTING STANDARDS",
                    ai: "### AI-SPECIFIC RULES",
                    naming: "### NAMING CONVENTIONS",
                    errors: "### ERROR HANDLING",
                    git: "### GIT PRACTICES",
                };

                const header = sections[section];
                if (!header) {
                    return `Unknown section '${section}'. Valid values: ${Object.keys(sections).join(", ")}, all`;
                }

                const startIdx = PROJECT_RULES.indexOf(header);
                if (startIdx === -1) return `Section '${section}' not found in rules.`;

                // Find the next ### header or end of string
                const nextHeader = PROJECT_RULES.indexOf("\n### ", startIdx + header.length);
                const endIdx = nextHeader === -1 ? PROJECT_RULES.length : nextHeader;

                return PROJECT_RULES.slice(startIdx, endIdx).trim();
            },
        },

        {
            name: "mathpilot_read_governance_doc",
            description:
                "Read a specific MathPilot governance document from the repository. " +
                "Available docs: constitution, architecture-principles, coding-standards, " +
                "testing-standards, ai-guidelines, domain-model, taxonomy.",
            parameters: {
                type: "object",
                properties: {
                    doc: {
                        type: "string",
                        description:
                            "Document to read: 'constitution', 'architecture', 'coding', " +
                            "'testing', 'ai', 'domain-model', 'taxonomy'",
                    },
                },
                required: ["doc"],
            },
            handler: async (args) => {
                const docMap = {
                    constitution: "constitution.md",
                    architecture: "architecture-principles.md",
                    coding: "coding-standards.md",
                    testing: "testing-standards.md",
                    ai: "ai-guidelines.md",
                    "domain-model": "docs/domain-model.md",
                    taxonomy: "docs/taxonomy.md",
                };

                const filename = docMap[args.doc];
                if (!filename) {
                    return `Unknown doc '${args.doc}'. Valid: ${Object.keys(docMap).join(", ")}`;
                }

                const content = await readProjectDoc(process.cwd(), filename);
                if (!content) {
                    return `Could not read '${filename}'. File may not exist yet.`;
                }

                return content;
            },
        },
    ],
});

