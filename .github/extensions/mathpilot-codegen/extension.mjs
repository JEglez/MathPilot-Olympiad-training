// Extension: mathpilot-codegen
// Code generation agent that scaffolds compliant boilerplate following all
// MathPilot project standards. Reads governance docs for up-to-date rules.
//
// Agent routing: this extension auto-detects scaffold intent in every prompt
// and injects the appropriate template guidance. For planning/design intent,
// it defers to the mathpilot-planner agent (mathpilot_plan_review tool).

import { joinSession } from "@github/copilot-sdk/extension";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

// ─── UI/UX quick-reference (from docs/governance/ui-ux-constitution.md) ──────

const UI_UX_RULES = `
## UI/UX Constitution — Quick Reference (full doc: docs/governance/ui-ux-constitution.md)

### Responsive padding (MANDATORY)
- Page padding: px-4 sm:px-6  ← NEVER bare px-6
- Touch targets: min-h-[44px] on all buttons/links

### Tokens — never hardcode these
- Background: #F8F9FC  → use bg-[--color-background] or bg-[#F8F9FC] only as dynamic inline style
- Border: #E2E8F0      → use border-[--color-border]
- Amber accent: #F59E0B → --color-ring / --color-teal
- Primary dark: #0F172A → --color-primary

### Responsive sidebar pattern
- Desktop: fixed left sidebar, ml-56 on main content
- Mobile: hamburger button → slide-in drawer + overlay backdrop
- Mobile top bar height: 52px  →  sticky content below it uses top-[52px] md:top-0

### Grid collapse rule
- Every multi-column grid must have: @media (max-width: 768px) { grid-template-columns: 1fr }

### react-component scaffold must produce
1. ComponentName.tsx  +  ComponentName.module.css (both files, always)
2. Mobile media query block in the .module.css
3. data-testid on the root element
4. aria-label on icon-only buttons
5. Named readonly props interface
6. cn() for conditional classes (import from ../lib/utils)
7. <button type="button"> for interactive divs — NEVER <div onClick>

### LaTeX
- Always use renderLatexToHtml() from utils/render-latex — never raw KaTeX
- Math containers need overflow-x: auto

### Accessibility
- Focus ring: focus-visible:ring-2 focus-visible:ring-[#F59E0B]
- Semantic HTML: <nav>, <main>, <aside>, <section>, <button>, <a>
- WCAG 2.2 AA contrast minimum
`;

// ─── Agent routing context ────────────────────────────────────────────────────

const AGENT_ROUTING_HINT = `
## MathPilot Custom Agents — Routing Guide

Two project agents are available. Use them proactively instead of generating
boilerplate manually or designing ad-hoc:

| Agent / Tool | Best for | Example triggers |
|---|---|---|
| **mathpilot_scaffold** (this tool) | Boilerplate, scaffolding, new files | "scaffold", "generate", "create a component", "add a handler", "new entity", "new migration" |
| **mathpilot_plan_review** (planner) | Design, architecture, feature planning | "plan", "design", "architect", "implement feature", "set up", "add feature", "review plan" |
| **mathpilot_list_templates** (this tool) | List what scaffold templates exist | "what templates", "list scaffolds", "what can codegen do" |

### Typical workflow for a new feature
1. Call mathpilot_plan_review with your written plan → fix violations
2. Call mathpilot_scaffold for each entity / handler / component / use-case
3. Fill in the generated TODO stubs

### When to NOT use scaffold
- Editing existing files → use edit tool directly (but read the UI/UX constitution first for UI files)
- Writing tests for existing code → write manually, co-locate next to the file under test
`;

// ─── Template registry ─────────────────────────────────────────────────────

const TEMPLATES = {
    "domain-entity": {
        description:
            "Scaffold a pure domain entity with branded ID type, TypeScript interface, " +
            "factory function, and co-located unit test. Domain layer has ZERO external deps.",
        params: {
            name: "PascalCase entity name (e.g., Problem, Technique)",
            fields: "Comma-separated field:type pairs (e.g., 'name:string,code:string,description:string')",
            context: "Bounded context: taxonomy | problem | student | training",
        },
        required: ["name", "context"],
    },
    "api-handler": {
        description:
            "Scaffold an Azure Functions HTTP handler with Zod input validation, " +
            "RFC 9457 error responses, and delegation to application layer. " +
            "No business logic in the handler.",
        params: {
            name: "Handler name in kebab-case (e.g., search, problem-detail)",
            method: "HTTP method: GET | POST | PUT | DELETE",
            path: "API path (e.g., /api/problems/:id)",
        },
        required: ["name", "method", "path"],
    },
    "application-use-case": {
        description:
            "Scaffold an application layer use case that orchestrates domain logic " +
            "and infrastructure adapters. Returns Result<T, E> types.",
        params: {
            name: "Use case name in camelCase (e.g., classifyProblem, searchProblems)",
            context: "Bounded context: taxonomy | problem | student | training | ingestion",
        },
        required: ["name", "context"],
    },
    "infrastructure-adapter": {
        description:
            "Scaffold an infrastructure adapter that implements a domain interface. " +
            "For AI adapters: includes retry, circuit breaker, cost logging, config-based model IDs.",
        params: {
            name: "Adapter name in PascalCase (e.g., PostgresProblemRepository, OpenAIClassifier)",
            implements: "Domain interface name it implements (e.g., ProblemRepository, ProblemClassifier)",
            kind: "Adapter kind: database | ai | storage | external-api",
        },
        required: ["name", "implements", "kind"],
    },
    "react-component": {
        description:
            "Scaffold a React functional component with TypeScript props interface, " +
            "data-testid attributes, accessible labels, and co-located test file.",
        params: {
            name: "PascalCase component name (e.g., ProblemCard, FilterPanel)",
            type: "Component type: page | feature | primitive",
        },
        required: ["name"],
    },
    "migration": {
        description:
            "Scaffold a forward-only SQL migration file with created_at/updated_at " +
            "timestamps and proper naming convention.",
        params: {
            number: "Migration number (e.g., 007)",
            name: "Migration name in snake_case (e.g., create_user_profiles)",
        },
        required: ["number", "name"],
    },
    "script": {
        description:
            "Scaffold a flat operational script in scripts/<name>/ with GitHub Actions " +
            "workflow_dispatch trigger. No DDD layers — throw/process.exit, Zod at external " +
            "boundaries, idempotent, env vars for secrets. " +
            "See architecture-principles.md §11.",
        params: {
            name: "Script name in kebab-case (e.g., ingestion, taxonomy-update, benchmark)",
            purpose: "One-line description of what the script does",
            schedule: "Optional cron expression for recurring scripts (e.g., '0 2 * * 0' for weekly). Omit for one-time scripts.",
        },
        required: ["name", "purpose"],
    },
    "test-factory": {
        description: +
            "that produces valid defaults with optional overrides.",
        params: {
            entity: "PascalCase entity name (e.g., Problem, Technique, Topic)",
        },
        required: ["entity"],
    },
};

// ─── Code generators ───────────────────────────────────────────────────────

function generateDomainEntity(args) {
    const { name, context, fields } = args;
    const idType = `${name}Id`;
    const kebab = toKebab(name);
    const basePath = `src/domain/${context}`;

    const fieldDefs = parseFields(fields);
    const fieldLines = fieldDefs
        .map((f) => `  readonly ${f.name}: ${f.type};`)
        .join("\n");
    const factoryLines = fieldDefs
        .map((f) => `    ${f.name}: overrides?.${f.name} ?? ${defaultFor(f.type)},`)
        .join("\n");

    const entityFile = `// ${basePath}/${kebab}.ts
// Domain entity — pure, no external dependencies

// Branded type for type-safe identifiers
export type ${idType} = string & { readonly __brand: "${idType}" };

export function create${idType}(raw: string): ${idType} {
  return raw as ${idType};
}

export interface ${name} {
  readonly id: ${idType};
${fieldLines}
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
`;

    const testFile = `// ${basePath}/${kebab}.test.ts
import { describe, it, expect } from "vitest";
import { type ${name}, type ${idType}, create${idType} } from "./${kebab}";
import { build${name} } from "./factories";

describe("${name}", () => {
  it("creates a valid ${name} with defaults", () => {
    const entity = build${name}();
    expect(entity.id).toBeDefined();
    expect(typeof entity.id).toBe("string");
  });

  it("creates a ${name} with overrides", () => {
    const entity = build${name}({ ${fieldDefs.length > 0 ? `${fieldDefs[0].name}: ${exampleFor(fieldDefs[0].type)}` : ""} });
    ${fieldDefs.length > 0 ? `expect(entity.${fieldDefs[0].name}).toBe(${exampleFor(fieldDefs[0].type)});` : "expect(entity).toBeDefined();"}
  });
});
`;

    const factoryFile = `// ${basePath}/factories.ts
// Test data factory — produces valid defaults, override what matters
import { type ${name}, type ${idType}, create${idType} } from "./${kebab}";

let counter = 0;

export function build${name}(overrides?: Partial<Omit<${name}, "id">> & { id?: ${idType} }): ${name} {
  counter++;
  return {
    id: overrides?.id ?? create${idType}(\`test-${kebab}-\${counter}\`),
${factoryLines}
    createdAt: overrides?.createdAt ?? new Date(),
    updatedAt: overrides?.updatedAt ?? new Date(),
  };
}
`;

    return {
        files: [
            { path: `${basePath}/${kebab}.ts`, content: entityFile },
            { path: `${basePath}/${kebab}.test.ts`, content: testFile },
            { path: `${basePath}/factories.ts`, content: factoryFile },
        ],
        summary: `Domain entity \`${name}\` scaffolded in \`${basePath}/\` with branded ID type, interface, test, and factory.`,
    };
}

function generateApiHandler(args) {
    const { name, method, path: apiPath } = args;
    const pascal = toPascal(name);
    const filePath = `src/api/${name}.ts`;
    const testPath = `src/api/${name}.test.ts`;

    const content = `// ${filePath}
// API handler — validates input, delegates to application layer
// No business logic here (architecture-principles.md §1)

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";

// Zod schema for input validation at the boundary
const ${pascal}RequestSchema = z.object({
  // TODO(#issue): Define request schema fields
});

type ${pascal}Request = z.infer<typeof ${pascal}RequestSchema>;

// RFC 9457 Problem Details error response
function problemDetails(status: number, title: string, detail: string): HttpResponseInit {
  return {
    status,
    headers: { "Content-Type": "application/problem+json" },
    body: JSON.stringify({ type: "about:blank", title, status, detail }),
  };
}

export async function ${toCamel(name)}Handler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  ${method === "GET" ? `const rawParams = Object.fromEntries(request.query.entries());` : `const rawBody: unknown = await request.json().catch(() => undefined);
  if (rawBody === undefined) {
    return problemDetails(400, "Bad Request", "Invalid JSON body");
  }`}

  const parsed = ${pascal}RequestSchema.safeParse(${method === "GET" ? "rawParams" : "rawBody"});
  if (!parsed.success) {
    return problemDetails(400, "Validation Error", parsed.error.message);
  }

  // TODO(#issue): Delegate to application layer use case
  // const result = await someUseCase(parsed.data);
  // if (!result.ok) { return problemDetails(...); }

  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: null }),
  };
}

app.http("${name}", {
  methods: ["${method}"],
  route: "${apiPath.replace(/^\/api\//, "")}",
  handler: ${toCamel(name)}Handler,
});
`;

    const testContent = `// ${testPath}
import { describe, it, expect } from "vitest";

describe("${toCamel(name)}Handler", () => {
  it("returns 400 for invalid input", async () => {
    // TODO(#issue): Test with invalid request
  });

  it("returns 200 with valid input", async () => {
    // TODO(#issue): Test with valid request delegating to use case
  });
});
`;

    return {
        files: [
            { path: filePath, content },
            { path: testPath, content: testContent },
        ],
        summary: `API handler \`${method} ${apiPath}\` scaffolded in \`${filePath}\` with Zod validation and RFC 9457 errors.`,
    };
}

function generateUseCase(args) {
    const { name, context } = args;
    const kebab = toKebab(name);
    const filePath = `src/application/${context}/${kebab}.ts`;
    const testPath = `src/application/${context}/${kebab}.test.ts`;

    const content = `// ${filePath}
// Application layer use case — orchestrates domain logic and infra adapters
// Contains no business rules (those belong in domain layer)

// Result type for explicit error handling
export type ${toPascal(name)}Error =
  | { kind: "not_found"; id: string }
  | { kind: "validation_failed"; field: string; message: string }
  | { kind: "infrastructure_error"; message: string };

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface ${toPascal(name)}Input {
  // TODO(#issue): Define input fields
}

export interface ${toPascal(name)}Output {
  // TODO(#issue): Define output fields
}

export async function ${name}(
  input: ${toPascal(name)}Input,
  // Inject infrastructure dependencies via parameters
): Promise<Result<${toPascal(name)}Output, ${toPascal(name)}Error>> {
  // TODO(#issue): Implement orchestration logic
  // 1. Validate domain invariants
  // 2. Call infrastructure adapters
  // 3. Return Result

  return { ok: true, value: {} as ${toPascal(name)}Output };
}
`;

    const testContent = `// ${testPath}
import { describe, it, expect } from "vitest";
import { ${name} } from "./${kebab}";

describe("${name}", () => {
  it("returns ok result for valid input", async () => {
    // TODO(#issue): Test with in-memory fakes (not mocks)
    const result = await ${name}({} as never);
    expect(result.ok).toBe(true);
  });

  it("returns error for invalid input", async () => {
    // TODO(#issue): Test error paths
  });
});
`;

    return {
        files: [
            { path: filePath, content },
            { path: testPath, content: testContent },
        ],
        summary: `Use case \`${name}\` scaffolded in \`${filePath}\` with Result<T, E> error handling.`,
    };
}

function generateInfraAdapter(args) {
    const { name: adapterName, implements: iface, kind } = args;
    const kebab = toKebab(adapterName);
    const subdir = kind === "ai" ? "ai" : kind === "database" ? "database" : kind;
    const filePath = `src/infrastructure/${subdir}/${kebab}.ts`;
    const testPath = `src/infrastructure/${subdir}/${kebab}.test.ts`;

    const isAI = kind === "ai";
    const aiExtras = isAI
        ? `
  // Model ID from configuration, not hardcoded (ai-guidelines.md §3)
  private readonly modelId: string;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitOpenUntil: Date | null = null;
  private static readonly MAX_FAILURES = 3;
  private static readonly CIRCUIT_OPEN_MS = 60_000;

  constructor(config: { modelId: string }) {
    this.modelId = config.modelId;
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpenUntil) return false;
    if (new Date() > this.circuitOpenUntil) {
      this.circuitOpenUntil = null;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= ${adapterName}.MAX_FAILURES) {
      this.circuitOpenUntil = new Date(Date.now() + ${adapterName}.CIRCUIT_OPEN_MS);
    }
  }`
        : "";

    const content = `// ${filePath}
// Infrastructure adapter implementing domain interface
// Dependencies point inward: this layer depends on domain, never the reverse
${isAI ? "// AI adapter: config-based model IDs, retry, circuit breaker, cost logging" : ""}

// import { type ${iface} } from "../../domain/...";

export class ${adapterName} /* implements ${iface} */ {
${aiExtras}

  // TODO(#issue): Implement interface methods
}
`;

    const testContent = `// ${testPath}
import { describe, it, expect } from "vitest";
// import { ${adapterName} } from "./${kebab}";

describe("${adapterName}", () => {
  ${isAI ? `it("uses model ID from configuration", () => {
    // Verify model ID is not hardcoded
    // TODO(#issue): Test with recorded fixtures (VCR pattern)
  });

  it("opens circuit breaker after 3 consecutive failures", () => {
    // TODO(#issue): Test circuit breaker behavior
  });` : `it("implements the ${iface} interface", () => {
    // TODO(#issue): Test with real database (test containers) or in-memory fake
  });`}
});
`;

    return {
        files: [
            { path: filePath, content },
            { path: testPath, content: testContent },
        ],
        summary: `Infrastructure adapter \`${adapterName}\` implementing \`${iface}\` scaffolded in \`${filePath}\`${isAI ? " with circuit breaker and config-based model IDs" : ""}.`,
    };
}

function generateReactComponent(args) {
    const { name, type } = args;
    // Pages live in pages/, feature components in components/, primitives in components/ui/
    const subdir =
        type === "page" ? "pages" : type === "primitive" ? "components/ui" : "components";
    const filePath = `src/ui/${subdir}/${name}.tsx`;
    const cssPath  = `src/ui/${subdir}/${name}.module.css`;
    const testPath = `src/ui/${subdir}/${name}.test.tsx`;
    const kebab = toKebab(name);

    // Decide layout shape based on component type
    const isPage = type === "page";

    const content = `// ${filePath}
// ${type || "component"} — functional component following ui-ux-constitution.md
// Rules: responsive px-4 sm:px-6 padding, 44px touch targets, cn() for conditionals,
//        data-testid on root, named readonly props, no <div onClick>.

import styles from "./${name}.module.css";
import { cn } from "${isPage ? "../../lib/utils" : "../lib/utils"}";

export interface ${name}Props {
  // TODO(#issue): Define props
  readonly className?: string;
}

export function ${name}({ className }: ${name}Props) {
  return (
    <div
      className={cn(styles.root, className)}
      data-testid="${kebab}"
    >
      {/* TODO(#issue): Implement ${name} */}
    </div>
  );
}
`;

    // CSS module — always includes a responsive block
    const cssContent = isPage
        ? `/* ${cssPath} */
/* ui-ux-constitution.md §6 — CSS Modules rules */

.root {
  /* Page-level layout */
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* ── Topbar ─────────────────────────────────────────────── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  /* Mobile: account for the 52px App mobile nav bar          */
  /* top: 52px;  md:top: 0 — add if content sits under nav    */
  padding: 0.75rem 1rem;           /* px-4 py-3 */
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
}

/* ── Content area ─────────────────────────────────────────── */
.content {
  flex: 1;
  padding: 1rem 1rem;              /* px-4 py-4 */
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 639px) {       /* below sm: */
  .topbar {
    padding: 0.75rem 1rem;
  }

  .content {
    padding: 1rem 1rem;
  }
}

/* ── Tablet / Desktop ─────────────────────────────────────── */
@media (min-width: 640px) {       /* sm: */
  .topbar {
    padding: 0.75rem 1.5rem;       /* sm:px-6 */
  }

  .content {
    padding: 1.5rem 1.5rem;        /* sm:px-6 sm:py-6 */
  }
}
`
        : `/* ${cssPath} */
/* ui-ux-constitution.md §6 — CSS Modules rules */

.root {
  /* TODO(#issue): define layout */
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 768px) {       /* below md: */
  .root {
    /* TODO(#issue): override for mobile */
  }
}
`;

    const testContent = `// ${testPath}
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ${name} } from "./${name}";

describe("${name}", () => {
  it("renders root element with correct testid", () => {
    render(<${name} />);
    expect(screen.getByTestId("${kebab}")).toBeDefined();
  });

  it("forwards extra className", () => {
    render(<${name} className="extra" />);
    const el = screen.getByTestId("${kebab}");
    expect(el.className).toContain("extra");
  });
});
`;

    return {
        files: [
            { path: filePath,  content },
            { path: cssPath,   content: cssContent },
            { path: testPath,  content: testContent },
        ],
        summary:
            `React ${type || "component"} \`${name}\` scaffolded in \`${filePath}\` ` +
            `with responsive CSS module, data-testid, and co-located test.\n\n` +
            `📋 **UI/UX Constitution reminders:**\n` +
            `- Page padding: \`px-4 sm:px-6\` — already in generated CSS module\n` +
            `- Touch targets: add \`min-h-[44px]\` to all buttons you add\n` +
            `- Use \`cn()\` for conditional Tailwind classes\n` +
            `- Full rules: \`docs/governance/ui-ux-constitution.md\``,
    };
}

function generateMigration(args) {
    const { number, name: migName } = args;
    const padded = String(number).padStart(3, "0");
    const filePath = `db/migrations/${padded}_${migName}.sql`;

    const content = `-- Migration: ${padded}_${migName}
-- Forward-only migration (architecture-principles.md §4)

BEGIN;

-- TODO(#issue): Define tables/indexes

-- Every table must have created_at and updated_at timestamps
-- Use: created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- Use: updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

COMMIT;
`;

    return {
        files: [{ path: filePath, content }],
        summary: `Migration \`${padded}_${migName}.sql\` scaffolded in \`db/migrations/\`.`,
    };
}

function generateTestFactory(args) {
    const { entity } = args;
    const kebab = toKebab(entity);
    const idType = `${entity}Id`;
    const filePath = `src/domain/factories/${kebab}-factory.ts`;

    const content = `// ${filePath}
// Test data factory — produces valid defaults, override only what matters
// import { type ${entity}, type ${idType}, create${idType} } from "../.../${kebab}";

let counter = 0;

export function build${entity}(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  counter++;
  return {
    id: \`test-${kebab}-\${counter}\`,
    // TODO(#issue): Add default fields matching ${entity} interface
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
`;

    return {
        files: [{ path: filePath, content }],
        summary: `Test factory \`build${entity}()\` scaffolded in \`${filePath}\`.`,
    };
}

function generateScript(args) {
    const { name, purpose, schedule } = args;
    const pascal = toPascal(name);
    const scriptPath = `scripts/${name}/run.js`;
    const pkgPath = `scripts/${name}/package.json`;
    const workflowPath = `.github/workflows/${name}.yml`;

    const scheduleTrigger = schedule
        ? `\n  schedule:\n    - cron: '${schedule}'`
        : "";

    const scriptContent = `#!/usr/bin/env node
// scripts/${name}/run.js
// Purpose: ${purpose}
// Run:     node scripts/${name}/run.js
//          MATHPILOT_DB_URL=... node scripts/${name}/run.js
//
// Rules (architecture-principles.md §11):
//   - No DDD layers. Throw on unrecoverable errors.
//   - Zod for all external data (DB rows, API responses, file input).
//   - Idempotent: safe to re-run without corrupting data.
//   - Secrets from environment variables only.
//   - Exit code 1 on failure so CI/GitHub Actions detects it.

import { z } from "zod";

// ── Config ────────────────────────────────────────────────────────────────────

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing required environment variable: \${name}\`);
  return value;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // TODO: implement ${purpose}

  log("Starting ${name} script");

  // Example: read env, fetch data, validate with Zod, write to DB
  // const dbUrl = requireEnv("MATHPILOT_DB_URL");

  log("Done");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg, meta) {
  const entry = { timestamp: new Date().toISOString(), msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + "\\n");
}

main().catch((e) => {
  process.stderr.write(JSON.stringify({ timestamp: new Date().toISOString(), error: String(e) }) + "\\n");
  process.exit(1);
});
`;

    const pkgContent = `{
  "name": "mathpilot-${name}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node run.js"
  },
  "dependencies": {
    "zod": "3.23.8"
  }
}
`;

    const workflowContent = `# GitHub Actions workflow for: ${purpose}
# Trigger manually from Actions tab → Run workflow
# See architecture-principles.md §11 for operational script rules

name: ${pascal}

on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run (no writes)'
        type: boolean
        default: true${scheduleTrigger}

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 360  # 6h max — adjust per script

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: scripts/${name}/package.json

      - name: Install dependencies
        run: npm install
        working-directory: scripts/${name}

      - name: Run ${name}
        run: node run.js
        working-directory: scripts/${name}
        env:
          MATHPILOT_DB_URL: \${{ secrets.MATHPILOT_DB_URL }}
          # TODO: add other required secrets here
          DRY_RUN: \${{ inputs.dry_run }}
`;

    return {
        files: [
            { path: scriptPath, content: scriptContent },
            { path: pkgPath, content: pkgContent },
            { path: workflowPath, content: workflowContent },
        ],
        summary: `Operational script \`${name}\` scaffolded in \`scripts/${name}/\` with GitHub Actions workflow.`,
    };
}

// ─── String utilities ──────────────────────────────────────────────────────

function toKebab(s) {
    return s
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
}

function toPascal(s) {
    return s
        .split(/[-_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");
}

function toCamel(s) {
    const p = toPascal(s);
    return p.charAt(0).toLowerCase() + p.slice(1);
}

function parseFields(raw) {
    if (!raw) return [];
    return raw.split(",").map((f) => {
        const [name, type] = f.trim().split(":");
        return { name: name.trim(), type: (type || "string").trim() };
    });
}

function defaultFor(type) {
    switch (type) {
        case "number": return "0";
        case "boolean": return "false";
        case "Date": return "new Date()";
        default: return '""';
    }
}

function exampleFor(type) {
    switch (type) {
        case "number": return "42";
        case "boolean": return "true";
        case "Date": return "new Date()";
        default: return '"test-value"';
    }
}

// ─── Generator dispatch ────────────────────────────────────────────────────

const GENERATORS = {
    "domain-entity": generateDomainEntity,
    "api-handler": generateApiHandler,
    "application-use-case": generateUseCase,
    "infrastructure-adapter": generateInfraAdapter,
    "react-component": generateReactComponent,
    "migration": generateMigration,
    "test-factory": generateTestFactory,
    "script": generateScript,
};

// ─── Extension entry point ─────────────────────────────────────────────────

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("MathPilot CodeGen loaded — 8 scaffolding templates + UI/UX constitution enforcement");
        },

        // ── Agent auto-routing: detect intent and inject guidance ──────────
        onUserPromptSubmitted: async (input) => {
            const prompt = input.prompt.toLowerCase();
            const parts = [];

            // ── Scaffold / codegen intent ──────────────────────────────────
            const isScaffoldIntent =
                prompt.includes("scaffold") ||
                prompt.includes("generate") ||
                prompt.includes("boilerplate") ||
                prompt.includes("template") ||
                (prompt.includes("create") && (
                    prompt.includes("component") ||
                    prompt.includes("handler") ||
                    prompt.includes("entity") ||
                    prompt.includes("use case") ||
                    prompt.includes("migration") ||
                    prompt.includes("adapter") ||
                    prompt.includes("factory")
                )) ||
                (prompt.includes("new") && (
                    prompt.includes("component") ||
                    prompt.includes("page") ||
                    prompt.includes("api") ||
                    prompt.includes("endpoint")
                )) ||
                prompt.includes("add a handler") ||
                prompt.includes("add a component");

            if (isScaffoldIntent) {
                parts.push(AGENT_ROUTING_HINT);
            }

            // ── UI / responsive / design intent ───────────────────────────
            const isUIIntent =
                prompt.includes("component") ||
                prompt.includes("responsive") ||
                prompt.includes("mobile") ||
                prompt.includes("layout") ||
                prompt.includes("css") ||
                prompt.includes("style") ||
                prompt.includes("design") ||
                prompt.includes("ui") ||
                prompt.includes("page") ||
                prompt.includes("button") ||
                prompt.includes("form") ||
                prompt.includes("modal") ||
                prompt.includes("sidebar") ||
                prompt.includes("nav") ||
                prompt.includes(".tsx") ||
                prompt.includes(".module.css");

            if (isUIIntent) {
                parts.push(UI_UX_RULES);
            }

            // ── Planning intent — remind about the planner agent ───────────
            const isPlanningIntent =
                prompt.includes("plan ") ||
                prompt.includes("design a") ||
                prompt.includes("architect") ||
                prompt.includes("implement feature") ||
                prompt.includes("add feature") ||
                prompt.includes("set up") ||
                prompt.includes("how should i");

            if (isPlanningIntent && !isScaffoldIntent) {
                parts.push(
                    "\n> **Planner agent:** This looks like a design/planning request. " +
                    "Consider calling `mathpilot_plan_review` with your plan first to check " +
                    "compliance before writing code (docs/governance/constitution.md §3)."
                );
            }

            return parts.length > 0
                ? { additionalContext: parts.join("\n\n---\n\n") }
                : undefined;
        },

        // ── File-level rules injection based on path ───────────────────────
        onPreToolUse: async (input) => {
            if (input.toolName !== "create" && input.toolName !== "edit") {
                return undefined;
            }

            const path = String(input.toolArgs?.path || "");

            // UI files — inject UI/UX constitution
            if (
                path.endsWith(".tsx") ||
                path.endsWith(".module.css") ||
                path.includes("/components/") ||
                path.includes("\\components\\") ||
                path.includes("/pages/") ||
                path.includes("\\pages\\")
            ) {
                return {
                    additionalContext:
                        "UI FILE: Enforce ui-ux-constitution.md. Key rules:\n" +
                        "  1. Page padding: px-4 sm:px-6 — never bare px-6\n" +
                        "  2. Every .tsx component needs a co-located .module.css with a @media (max-width: 768px) block if it uses columns\n" +
                        "  3. Touch targets: min-h-[44px] on all buttons\n" +
                        "  4. No <div onClick> — use <button type=\"button\">\n" +
                        "  5. No hardcoded hex colours — use CSS tokens or Tailwind theme classes\n" +
                        "  6. LaTeX: only via renderLatexToHtml() from utils/render-latex\n" +
                        "  Full doc: docs/governance/ui-ux-constitution.md",
                };
            }

            // Scripts — exempt from DDD (architecture-principles.md §11)
            const isScript = path.includes("/scripts/") || path.includes("\\scripts\\");
            if (isScript) {
                return {
                    additionalContext:
                        "SCRIPT MODE: flat structure applies. DDD layers, Result<T,E>, and branded IDs " +
                        "are NOT required. Still required: env vars for secrets, Zod for external data, " +
                        "idempotency, exit code 1 on failure. See docs/governance/architecture-principles.md §11.",
                };
            }

            // Domain layer
            if (path.includes("/domain/") || path.includes("\\domain\\")) {
                return {
                    additionalContext:
                        "RULE CHECK: Domain layer file — ZERO external dependencies allowed. " +
                        "Read docs/governance/architecture-principles.md §1 if unsure.",
                };
            }

            // API handlers
            if (path.includes("/api/") || path.includes("\\api\\")) {
                return {
                    additionalContext:
                        "RULE CHECK: API handler — no business logic, delegate to application layer. " +
                        "Read docs/governance/architecture-principles.md §1, §3.",
                };
            }

            // AI infrastructure adapters
            if (
                (path.includes("/ai/") || path.includes("\\ai\\")) &&
                (path.includes("/infrastructure/") || path.includes("\\infrastructure\\"))
            ) {
                return {
                    additionalContext:
                        "RULE CHECK: AI adapter — wrap behind domain interface, config-based model IDs. " +
                        "Read docs/governance/ai-guidelines.md.",
                };
            }

            return undefined;
        },
    },

    tools: [
        {
            name: "mathpilot_scaffold",
            description:
                "Generate compliant boilerplate code following all MathPilot project standards. " +
                "Supports: domain-entity, api-handler, application-use-case, infrastructure-adapter, " +
                "react-component, migration, test-factory, script. Each template produces correctly " +
                "layered code with proper types, error handling, tests, and naming conventions.",
            parameters: {
                type: "object",
                properties: {
                    template: {
                        type: "string",
                        description:
                            "Template type: 'domain-entity' | 'api-handler' | 'application-use-case' | " +
                            "'infrastructure-adapter' | 'react-component' | 'migration' | 'test-factory'",
                        enum: [
                            "domain-entity", "api-handler", "application-use-case",
                            "infrastructure-adapter", "react-component", "migration",
                            "test-factory", "script",
                        ],
                    },
                    name: {
                        type: "string",
                        description: "Primary name for the generated code (PascalCase for entities/components, kebab-case for handlers)",
                    },
                    fields: {
                        type: "string",
                        description: "Comma-separated field:type pairs for domain entities (e.g., 'name:string,code:string')",
                    },
                    context: {
                        type: "string",
                        description: "Bounded context: taxonomy | problem | student | training | ingestion",
                    },
                    method: {
                        type: "string",
                        description: "HTTP method for api-handler: GET | POST | PUT | DELETE",
                    },
                    path: {
                        type: "string",
                        description: "API path for api-handler (e.g., /api/problems/:id)",
                    },
                    implements: {
                        type: "string",
                        description: "Domain interface name for infrastructure-adapter",
                    },
                    kind: {
                        type: "string",
                        description: "Adapter kind: database | ai | storage | external-api",
                    },
                    type: {
                        type: "string",
                        description: "Component type for react-component: page | feature | primitive",
                    },
                    number: {
                        type: "string",
                        description: "Migration number for migration template (e.g., '007')",
                    },
                    entity: {
                        type: "string",
                        description: "Entity name for test-factory template",
                    },
                    purpose: {
                        type: "string",
                        description: "One-line description for script template",
                    },
                    schedule: {
                        type: "string",
                        description: "Optional cron expression for recurring script template (e.g., '0 2 * * 0')",
                    },
                    dry_run: {
                        type: "boolean",
                        description: "If true, returns generated code without writing files. Default: true",
                    },
                },
                required: ["template"],
            },
            handler: async (args) => {
                const { template, dry_run } = args;

                const generator = GENERATORS[template];
                if (!generator) {
                    return `Unknown template '${template}'. Available: ${Object.keys(GENERATORS).join(", ")}`;
                }

                const templateDef = TEMPLATES[template];

                // Validate required params
                for (const req of templateDef.required) {
                    if (!args[req]) {
                        return `Missing required parameter '${req}' for template '${template}'. ` +
                            `Required: ${templateDef.required.join(", ")}. ` +
                            `Description: ${templateDef.params[req]}`;
                    }
                }

                const result = generator(args);

                if (dry_run !== false) {
                    // Dry run: return the code for review
                    let output = `## Scaffold Preview: ${template}\n\n${result.summary}\n\n`;
                    output += `### Files to create (${result.files.length}):\n\n`;
                    for (const file of result.files) {
                        output += `#### \`${file.path}\`\n\`\`\`typescript\n${file.content}\`\`\`\n\n`;
                    }
                    output += "Set `dry_run: false` to write these files to disk.";
                    return output;
                }

                // Write files
                const written = [];
                for (const file of result.files) {
                    const fullPath = join(process.cwd(), file.path);
                    await mkdir(dirname(fullPath), { recursive: true });
                    await writeFile(fullPath, file.content, "utf-8");
                    written.push(file.path);
                }

                return `✅ ${result.summary}\n\nFiles written:\n${written.map((f) => `- ${f}`).join("\n")}`;
            },
        },

        {
            name: "mathpilot_list_templates",
            description:
                "List all available code generation templates with their descriptions " +
                "and required parameters.",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                let output = "## MathPilot Code Generation Templates\n\n";
                for (const [key, tmpl] of Object.entries(TEMPLATES)) {
                    output += `### \`${key}\`\n${tmpl.description}\n\n`;
                    output += "**Parameters:**\n";
                    for (const [param, desc] of Object.entries(tmpl.params)) {
                        const req = tmpl.required.includes(param) ? " *(required)*" : "";
                        output += `- \`${param}\`${req}: ${desc}\n`;
                    }
                    output += "\n";
                }
                return output;
            },
        },
    ],
});
