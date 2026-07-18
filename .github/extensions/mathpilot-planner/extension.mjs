// Extension: mathpilot-planner
// Lightweight planning agent — hooks + plan review only.
// Governance docs live in docs/governance/*.md and are read via the
// built-in view tool. No embedded skill tools.

import { joinSession } from "@github/copilot-sdk/extension";

// ─── Planning template ─────────────────────────────────────────────────────

const PLANNING_TEMPLATE = `
## Planning Instructions

Before making decisions, read the relevant governance docs with the view tool:

| Doc | Path |
|-----|------|
| Constitution | docs/governance/constitution.md |
| Architecture | docs/governance/architecture-principles.md |
| Coding Standards | docs/governance/coding-standards.md |
| Testing Standards | docs/governance/testing-standards.md |
| AI Guidelines | docs/governance/ai-guidelines.md |
| Domain Model | docs/domain-model.md |
| Taxonomy | docs/taxonomy.md |

Structure your plan as:
1. **Objective** — what and why
2. **Constitution check** — read constitution.md, cite which tenets apply
3. **Architecture** — read architecture-principles.md, identify layers/contexts
4. **Implementation steps** — ordered tasks with file paths and layer assignments
5. **Type design** — branded IDs, discriminated unions, Zod schemas
6. **Error handling** — Result<T, E> types and boundary error mapping
7. **Testing strategy** — read testing-standards.md, plan tests/factories
8. **AI considerations** — if applicable: read ai-guidelines.md
9. **ADR needed?** — flag if Architecture Decision Record is required
10. **Performance & cost** — budget impact and optimization notes
`;

// ─── Extension entry point ─────────────────────────────────────────────────

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("MathPilot Planner loaded — governance docs in docs/governance/");
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
                            "RULE CHECK: Domain layer file — ZERO external dependencies allowed. " +
                            "Read docs/governance/architecture-principles.md §1 if unsure.",
                    };
                }

                if (path.includes("/api/") || path.includes("\\api\\")) {
                    return {
                        additionalContext:
                            "RULE CHECK: API handler — no business logic, delegate to application layer. " +
                            "Read docs/governance/architecture-principles.md §1, §3 if unsure.",
                    };
                }

                if (
                    (path.includes("/ai/") || path.includes("\\ai\\")) &&
                    (path.includes("/infrastructure/") || path.includes("\\infrastructure\\"))
                ) {
                    return {
                        additionalContext:
                            "RULE CHECK: AI adapter — wrap behind domain interface, config-based model IDs. " +
                            "Read docs/governance/ai-guidelines.md if unsure.",
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
                "Review an implementation plan against MathPilot project rules. " +
                "Returns a compliance report with violations and warnings referencing " +
                "the specific governance doc for each finding.",
            parameters: {
                type: "object",
                properties: {
                    plan: {
                        type: "string",
                        description: "The implementation plan text to review",
                    },
                },
                required: ["plan"],
            },
            handler: async (args) => {
                const plan = args.plan.toLowerCase();
                const violations = [];
                const warnings = [];

                if (plan.includes("generate proof") || plan.includes("generate solution") || plan.includes("create proof")) {
                    violations.push("CONSTITUTION [§2.1]: Generating math proofs/solutions is prohibited.");
                }
                if (plan.includes("any") && (plan.includes("type:") || plan.includes("as any"))) {
                    violations.push("CODING [§2]: No 'any' type — use 'unknown' with type guards.");
                }
                if (plan.includes("hardcod") && plan.includes("model")) {
                    violations.push("AI [§3]: Model identifiers must be configuration, not hardcoded.");
                }
                if (plan.includes("domain") && (plan.includes("database") || plan.includes("http") || plan.includes("axios"))) {
                    violations.push("ARCHITECTURE [§1]: Domain layer must have zero external dependencies.");
                }
                if (plan.includes("business logic") && plan.includes("api handler")) {
                    violations.push("ARCHITECTURE [§1]: No business logic in API handlers.");
                }
                if (plan.includes("console.log") && !plan.includes("test")) {
                    warnings.push("CODING [§8]: Use structured logger, not console.log.");
                }
                if ((plan.includes("global state") || plan.includes("global variable")) && !plan.includes("no global")) {
                    warnings.push("CONSTITUTION: No global mutable state.");
                }
                if (!plan.includes("test") && !plan.includes("spec")) {
                    warnings.push("TESTING: Plan does not mention tests.");
                }
                if (plan.includes("openai") && !plan.includes("interface") && !plan.includes("adapter")) {
                    warnings.push("AI [§1.1]: Wrap OpenAI behind domain interfaces.");
                }
                if (plan.includes("embedding") && plan.includes("runtime") && !plan.includes("pre-comput")) {
                    warnings.push("AI [§4.2]: Embeddings should be pre-computed.");
                }
                if (plan.includes("throw") && !plan.includes("result<") && !plan.includes("result type")) {
                    warnings.push("CODING [§6]: Prefer Result<T, E> over thrown exceptions.");
                }

                let report = "# Plan Compliance Report\n\n";
                if (violations.length === 0 && warnings.length === 0) {
                    report += "✅ **PASSED** — No violations detected.\n";
                } else {
                    if (violations.length > 0) {
                        report += `❌ **${violations.length} violation(s):**\n`;
                        violations.forEach((v, i) => { report += `${i + 1}. ${v}\n`; });
                        report += "\n";
                    }
                    if (warnings.length > 0) {
                        report += `⚠️ **${warnings.length} warning(s):**\n`;
                        warnings.forEach((w, i) => { report += `${i + 1}. ${w}\n`; });
                    }
                }
                return report;
            },
        },
    ],
});
