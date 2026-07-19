// Extension: mathpilot-planner
// Lightweight planning agent — hooks + plan review only.
// Governance docs live in docs/governance/*.md and are read via the
// built-in view tool. No embedded skill tools.
//
// Agent routing: this extension auto-detects planning/design/UI intent and
// injects the relevant governance context. For scaffold/boilerplate intent,
// it defers to the mathpilot-codegen agent (mathpilot_scaffold tool).

import { joinSession } from "@github/copilot-sdk/extension";

// ─── Planning template ─────────────────────────────────────────────────────

const PLANNING_TEMPLATE = `
## Planning Instructions

**First: classify this work.**

> Is this a **service** (user-facing, always-on, part of the main application)?
> Or an **operational script** (one-time/sporadic, no users, data import, backups, benchmarks)?
>
> - **Service** → apply all DDD rules below (layered architecture, Result<T,E>, branded IDs, etc.)
> - **Script** → use flat structure in \`scripts/<purpose>/\`, see architecture-principles.md §11

If it's a **service**, read the relevant governance docs with the view tool:

| Doc | Path |
|-----|------|
| Constitution | docs/governance/constitution.md |
| Architecture | docs/governance/architecture-principles.md |
| Coding Standards | docs/governance/coding-standards.md |
| Testing Standards | docs/governance/testing-standards.md |
| AI Guidelines | docs/governance/ai-guidelines.md |
| **UI/UX Constitution** | **docs/governance/ui-ux-constitution.md** |
| Domain Model | docs/domain-model.md |
| Taxonomy | docs/taxonomy.md |

Structure your plan as:
1. **Objective** — what and why
2. **Script or Service?** — explicitly state which category (architecture-principles.md §11)
3. **Constitution check** — read constitution.md, cite which tenets apply
4. **Architecture** — read architecture-principles.md, identify layers/contexts
5. **Implementation steps** — ordered tasks with file paths and layer assignments
6. **Type design** — branded IDs, discriminated unions, Zod schemas (service only)
7. **Error handling** — Result<T, E> types (service) or throw/exit (script)
8. **Testing strategy** — read testing-standards.md, plan tests/factories
9. **UI/UX compliance** — if any React/UI code: read ui-ux-constitution.md, list responsive rules that apply
10. **AI considerations** — if applicable: read ai-guidelines.md
11. **ADR needed?** — flag if Architecture Decision Record is required
12. **Performance & cost** — budget impact and optimization notes
13. **Scaffold with codegen?** — list mathpilot_scaffold calls needed (template + params) for each entity/component/handler
`;

// ─── Agent routing context ─────────────────────────────────────────────────

const AGENT_ROUTING_HINT = `
## MathPilot Custom Agents — Routing Guide

Two project agents are available. Invoke them proactively.

| Agent / Tool | Best for | Trigger phrases |
|---|---|---|
| **mathpilot_plan_review** (this tool) | Review a written plan for governance violations | "review this plan", "check compliance", "does this violate" |
| **mathpilot_scaffold** (codegen agent) | Generate boilerplate for a new entity/component/handler | "scaffold", "generate", "create a component", "new entity", "new handler" |
| **mathpilot_list_templates** (codegen agent) | See available scaffold templates | "what templates", "what can codegen make" |

### Recommended sequence for new features
1. Write your plan → call \`mathpilot_plan_review\` → fix violations
2. Call \`mathpilot_scaffold\` for each new file (entity, handler, component, use-case)
3. Fill in the generated TODO stubs with real logic
`;


// ─── Extension entry point ─────────────────────────────────────────────────

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("MathPilot Planner loaded — governance docs in docs/governance/ (incl. ui-ux-constitution.md)");
        },

        onUserPromptSubmitted: async (input) => {
            const prompt = input.prompt.toLowerCase();
            const parts = [];

            // ── Planning / design intent ───────────────────────────────────
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
                parts.push(PLANNING_TEMPLATE);
            }

            // ── UI / responsive / component intent ─────────────────────────
            const isUIRequest =
                prompt.includes("component") ||
                prompt.includes("responsive") ||
                prompt.includes("mobile") ||
                prompt.includes("layout") ||
                prompt.includes("page") ||
                prompt.includes("ui ") ||
                prompt.includes(" ui") ||
                prompt.includes("sidebar") ||
                prompt.includes("nav") ||
                prompt.includes("button") ||
                prompt.includes("form") ||
                prompt.includes(".tsx") ||
                prompt.includes(".module.css");

            if (isUIRequest) {
                parts.push(
                    "> **UI/UX Constitution:** This prompt involves UI/frontend work. " +
                    "Read `docs/governance/ui-ux-constitution.md` before editing or creating " +
                    "any `.tsx` or `.module.css` file. Key rules: `px-4 sm:px-6` padding, " +
                    "44px touch targets, mobile-first responsive layout, no hardcoded colours."
                );
            }

            // ── Scaffold / codegen intent — defer to codegen agent ─────────
            const isScaffoldRequest =
                (prompt.includes("scaffold") || prompt.includes("generate boilerplate") || prompt.includes("new entity") || prompt.includes("new handler")) &&
                !prompt.includes("plan");

            if (isScaffoldRequest) {
                parts.push(AGENT_ROUTING_HINT);
            }

            return parts.length > 0
                ? { additionalContext: parts.join("\n\n---\n\n") }
                : undefined;
        },

        onPreToolUse: async (input) => {
            if (input.toolName === "create" || input.toolName === "edit") {
                const path = String(input.toolArgs?.path || "");

                // Scripts are exempt from DDD layer enforcement (architecture-principles.md §11)
                const isScript = path.includes("/scripts/") || path.includes("\\scripts\\");
                if (isScript) {
                    return {
                        additionalContext:
                            "SCRIPT MODE: This file is in scripts/ — flat structure applies. " +
                            "DDD layers, Result<T,E>, and branded IDs are NOT required. " +
                            "Still required: env vars for secrets, Zod for external data, idempotency, exit code 1 on failure. " +
                            "See docs/governance/architecture-principles.md §11.",
                    };
                }

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
                if (plan.includes("throw") && !plan.includes("result<") && !plan.includes("result type") && !plan.includes("script")) {
                    warnings.push("CODING [§6]: Prefer Result<T, E> over thrown exceptions (unless this is an operational script — see architecture-principles.md §11).");
                }

                // UI/UX constitution checks
                if ((plan.includes("px-6") || plan.includes("padding: 24") || plan.includes("padding: 1.5rem")) && !plan.includes("sm:px-6") && !plan.includes("responsive")) {
                    violations.push("UI/UX [§3.2]: Page padding must be responsive: `px-4 sm:px-6` — never bare `px-6`.");
                }
                if (plan.includes("fixed") && plan.includes("sidebar") && !plan.includes("mobile") && !plan.includes("hamburger") && !plan.includes("toggle")) {
                    violations.push("UI/UX [§3.3]: Fixed sidebar requires a mobile hamburger toggle and overlay drawer.");
                }
                if (plan.includes("div onclick") || plan.includes("<div") && plan.includes("onclick")) {
                    violations.push("UI/UX [§4.2]: Use <button type=\"button\"> for interactive elements — never <div onClick>.");
                }
                if ((plan.includes("inline style") || plan.includes("style={{")) && !plan.includes("dynamic")) {
                    warnings.push("UI/UX [§5.2]: Prefer CSS tokens and Tailwind classes over inline styles. Inline styles are only allowed for dynamic values.");
                }
                if (plan.includes("katex") && !plan.includes("renderlatextohtml") && !plan.includes("render-latex")) {
                    violations.push("UI/UX [§8]: LaTeX must be rendered via renderLatexToHtml() — no direct KaTeX calls in feature code.");
                }
                if (plan.includes("grid") && !plan.includes("grid-cols-1") && !plan.includes("mobile") && !plan.includes("responsive")) {
                    warnings.push("UI/UX [§3.2]: Multi-column grids must collapse to grid-cols-1 at md: breakpoint.");
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
