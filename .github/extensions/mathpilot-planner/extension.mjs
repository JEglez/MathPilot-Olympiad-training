// Extension: mathpilot-planner
// Planning agent with governance skills. Each governance doc is a dedicated
// tool (skill) that reads the source .md file from the repo at runtime.

import { joinSession } from "@github/copilot-sdk/extension";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ─── Governance doc registry ───────────────────────────────────────────────

const GOVERNANCE_DOCS = {
    constitution: {
        file: "constitution.md",
        name: "mathpilot_constitution",
        description:
            "MathPilot project constitution — the non-negotiable principles that govern every " +
            "decision. Covers: Domain Integrity, AI Assists/Humans Decide, Correctness Over Speed, " +
            "Cost Discipline, Open by Default. Invoke BEFORE any planning or design decision.",
    },
    architecture: {
        file: "architecture-principles.md",
        name: "mathpilot_architecture_principles",
        description:
            "MathPilot architecture principles — layered architecture rules, bounded contexts " +
            "(Taxonomy, Problem Corpus, Student Profile, Training, Ingestion), API design, data " +
            "architecture, AI integration patterns, frontend rules, infra-as-code, security, and " +
            "performance budgets. Invoke when designing components or deciding where code belongs.",
    },
    coding: {
        file: "coding-standards.md",
        name: "mathpilot_coding_standards",
        description:
            "MathPilot coding standards — TypeScript strict-mode rules, type safety (no any, " +
            "branded types, discriminated unions), naming conventions, code organisation, function " +
            "design, error handling (Result<T,E>), async patterns, comments, dependencies, and " +
            "git practices. Invoke when writing or reviewing TypeScript code.",
    },
    testing: {
        file: "testing-standards.md",
        name: "mathpilot_testing_standards",
        description:
            "MathPilot testing standards — test pyramid, Vitest for unit/integration, Playwright " +
            "for E2E, factory functions (buildProblem, buildTechnique), mocking rules (boundaries " +
            "only, prefer fakes), AI fixture VCR pattern, coverage targets (≥80% domain, ≥60% " +
            "overall), golden evaluation sets for prompts. Invoke when planning or writing tests.",
    },
    ai: {
        file: "ai-guidelines.md",
        name: "mathpilot_ai_guidelines",
        description:
            "MathPilot AI guidelines — AI-as-infrastructure principles, prompt engineering rules " +
            "(versioned files, JSON mode, temperature 0, golden eval sets), model selection, data " +
            "pipeline (async ingestion, pre-computed embeddings, caching), safety/ethics, and " +
            "operational rules (rate limiting, circuit breakers, cost logging). Invoke when " +
            "working with any AI/LLM/embedding feature.",
    },
    "domain-model": {
        file: "docs/domain-model.md",
        name: "mathpilot_domain_model",
        description:
            "MathPilot domain model — entity definitions for Topic, Subtopic, Technique, " +
            "LearningObjective, Problem, Solution, Competition, StudentProfile, KnowledgeGap, " +
            "TrainingSession, and their relationships. Invoke when designing entities, writing " +
            "domain logic, or planning database schemas.",
    },
    taxonomy: {
        file: "docs/taxonomy.md",
        name: "mathpilot_taxonomy",
        description:
            "MathPilot taxonomy — the complete olympiad mathematics taxonomy tree with domains " +
            "(Number Theory, Algebra, Combinatorics, Geometry, Game Theory), subtopics, taxonomy " +
            "codes (DOMAIN-SUBTOPIC format like NT-DIV, ALG-FEQ), and classification rules. " +
            "Invoke when working with problem classification or taxonomy features.",
    },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

async function readDoc(workingDir, key) {
    const entry = GOVERNANCE_DOCS[key];
    if (!entry) return null;
    try {
        return await readFile(join(workingDir, entry.file), "utf-8");
    } catch {
        return null;
    }
}

function buildDocTool(key, entry) {
    return {
        name: entry.name,
        description: entry.description,
        parameters: { type: "object", properties: {} },
        handler: async () => {
            const content = await readDoc(process.cwd(), key);
            if (!content) {
                return `Could not read '${entry.file}'. File may not exist yet in the repo.`;
            }
            return `--- Source: ${entry.file} ---\n${content}`;
        },
    };
}

// ─── Build skill tools from registry ───────────────────────────────────────

const governanceSkills = Object.entries(GOVERNANCE_DOCS).map(
    ([key, entry]) => buildDocTool(key, entry)
);

// ─── Planning-specific instructions (not in any repo file) ─────────────────

const PLANNING_TEMPLATE = `
## Planning Agent Instructions

You have access to MathPilot governance skills. Use them to look up the actual
rules before making decisions:

- **mathpilot_constitution** — invoke FIRST for any planning/design decision
- **mathpilot_architecture_principles** — for component placement and layer rules
- **mathpilot_coding_standards** — for TypeScript patterns, naming, error handling
- **mathpilot_testing_standards** — for test strategy, factories, coverage targets
- **mathpilot_ai_guidelines** — for any AI/LLM/embedding feature
- **mathpilot_domain_model** — for entity design and relationships
- **mathpilot_taxonomy** — for classification codes and taxonomy structure

When creating implementation plans, structure them as:
1. **Objective** — what we're building and why
2. **Constitution check** — invoke mathpilot_constitution, cite which tenets apply
3. **Architecture** — invoke mathpilot_architecture_principles, identify layers/contexts
4. **Implementation steps** — ordered tasks with file paths and layer assignments
5. **Type design** — key types, branded IDs, discriminated unions, Zod schemas
6. **Error handling** — Result types and boundary error mapping
7. **Testing strategy** — invoke mathpilot_testing_standards, plan tests/factories
8. **AI considerations** — if applicable: invoke mathpilot_ai_guidelines
9. **ADR needed?** — flag if an Architecture Decision Record is required
10. **Performance & cost** — budget impact and optimization notes
`;

// ─── Extension entry point ─────────────────────────────────────────────────

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("MathPilot governance skills loaded (7 doc skills + plan review)");
            return {
                additionalContext:
                    "MathPilot governance skills are available. Use mathpilot_constitution, " +
                    "mathpilot_architecture_principles, mathpilot_coding_standards, " +
                    "mathpilot_testing_standards, mathpilot_ai_guidelines, mathpilot_domain_model, " +
                    "and mathpilot_taxonomy to look up project rules on demand. " +
                    "Use mathpilot_plan_review to validate plans against all rules.",
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
                return { additionalContext: PLANNING_TEMPLATE };
            }

            return undefined;
        },

        onPreToolUse: async (input) => {
            if (input.toolName === "create" || input.toolName === "edit") {
                const path = String(input.toolArgs?.path || "");

                if (path.includes("/domain/") || path.includes("\\domain\\")) {
                    return {
                        additionalContext:
                            "RULE CHECK: Domain layer file. Invoke mathpilot_architecture_principles " +
                            "if unsure — domain code must have ZERO external dependencies.",
                    };
                }

                if (path.includes("/api/") || path.includes("\\api\\")) {
                    return {
                        additionalContext:
                            "RULE CHECK: API handler file. Invoke mathpilot_architecture_principles " +
                            "if unsure — no business logic here, delegate to application layer.",
                    };
                }

                if (
                    (path.includes("/ai/") || path.includes("\\ai\\")) &&
                    (path.includes("/infrastructure/") || path.includes("\\infrastructure\\"))
                ) {
                    return {
                        additionalContext:
                            "RULE CHECK: AI adapter file. Invoke mathpilot_ai_guidelines " +
                            "if unsure — wrap behind domain interfaces, config-based model IDs.",
                    };
                }
            }

            return undefined;
        },
    },

    tools: [
        ...governanceSkills,
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
            handler: async (args, invocation) => {
                const plan = args.plan.toLowerCase();
                const violations = [];
                const warnings = [];

                // Constitution checks
                if (plan.includes("generate proof") || plan.includes("generate solution") || plan.includes("create proof")) {
                    violations.push(
                        "CONSTITUTION VIOLATION [constitution.md §2.1]: Plan includes generating mathematical " +
                        "proofs/solutions. The system retrieves and classifies — never generates mathematical truth."
                    );
                }

                if (plan.includes("any") && (plan.includes("type:") || plan.includes("as any"))) {
                    violations.push(
                        "CODING STANDARD VIOLATION [coding-standards.md §2]: Plan uses 'any' type. " +
                        "Use 'unknown' with type guards instead."
                    );
                }

                if (plan.includes("console.log") && !plan.includes("test")) {
                    warnings.push(
                        "WARNING [coding-standards.md §8]: Plan uses console.log. Use structured logger."
                    );
                }

                if (plan.includes("hardcod") && plan.includes("model")) {
                    violations.push(
                        "AI GUIDELINE VIOLATION [ai-guidelines.md §3]: Model identifiers must be " +
                        "environment configuration, not hardcoded."
                    );
                }

                if ((plan.includes("global state") || plan.includes("global variable")) && !plan.includes("no global")) {
                    warnings.push(
                        "WARNING [constitution.md]: Plan may introduce global mutable state. This is prohibited."
                    );
                }

                // Architecture checks
                if (plan.includes("domain") && (plan.includes("import") || plan.includes("require")) &&
                    (plan.includes("database") || plan.includes("http") || plan.includes("fetch") || plan.includes("axios"))) {
                    violations.push(
                        "ARCHITECTURE VIOLATION [architecture-principles.md §1]: Domain layer must have " +
                        "zero external dependencies. Database/HTTP imports belong in infrastructure."
                    );
                }

                if (plan.includes("business logic") && plan.includes("api handler")) {
                    violations.push(
                        "ARCHITECTURE VIOLATION [architecture-principles.md §1]: Business logic must " +
                        "not live in API handlers. Delegate to the application layer."
                    );
                }

                // Testing checks
                if (!plan.includes("test") && !plan.includes("spec")) {
                    warnings.push(
                        "WARNING [testing-standards.md]: Plan does not mention tests. Every feature " +
                        "needs unit tests (domain), integration tests (API/DB), and possibly E2E."
                    );
                }

                // AI checks
                if (plan.includes("openai") && !plan.includes("interface") && !plan.includes("adapter")) {
                    warnings.push(
                        "WARNING [ai-guidelines.md §1.1]: Direct OpenAI references without domain " +
                        "interface abstraction. AI calls must be wrapped behind domain interfaces."
                    );
                }

                if (plan.includes("embedding") && plan.includes("runtime") && !plan.includes("pre-comput")) {
                    warnings.push(
                        "WARNING [ai-guidelines.md §4.2]: Plan may compute embeddings at runtime. " +
                        "Embeddings should be pre-computed and stored in pgvector."
                    );
                }

                if (plan.includes("throw") && !plan.includes("result<") && !plan.includes("result type")) {
                    warnings.push(
                        "WARNING [coding-standards.md §6]: Plan uses thrown exceptions for domain errors. " +
                        "Prefer Result<T, E> pattern with typed discriminated unions."
                    );
                }

                // Build report
                let report = "# MathPilot Plan Compliance Report\n\n";

                if (violations.length === 0 && warnings.length === 0) {
                    report += "✅ **PASSED** — No violations or warnings detected.\n\n";
                    report += "Verify manually that:\n" +
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
    ],
});

