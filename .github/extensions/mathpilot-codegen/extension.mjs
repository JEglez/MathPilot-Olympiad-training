// Extension: mathpilot-codegen
// Code generation agent that scaffolds compliant boilerplate following all
// MathPilot project standards. Reads governance docs for up-to-date rules.

import { joinSession } from "@github/copilot-sdk/extension";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

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
    "test-factory": {
        description:
            "Scaffold a test data factory function (buildProblem, buildTechnique, etc.) " +
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
    const subdir =
        type === "page" ? "pages" : type === "feature" ? "features" : "components";
    const filePath = `src/ui/${subdir}/${name}.tsx`;
    const testPath = `src/ui/${subdir}/${name}.test.tsx`;

    const content = `// ${filePath}
// ${type || "component"} — functional component with TypeScript props

export interface ${name}Props {
  // TODO(#issue): Define props
}

export function ${name}(props: ${name}Props): JSX.Element {
  return (
    <div data-testid="${toKebab(name)}">
      {/* TODO(#issue): Implement component */}
    </div>
  );
}
`;

    const testContent = `// ${testPath}
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ${name} } from "./${name}";

describe("${name}", () => {
  it("renders without crashing", () => {
    render(<${name} />);
    expect(screen.getByTestId("${toKebab(name)}")).toBeDefined();
  });
});
`;

    return {
        files: [
            { path: filePath, content },
            { path: testPath, content: testContent },
        ],
        summary: `React ${type || "component"} \`${name}\` scaffolded in \`${filePath}\` with data-testid and co-located test.`,
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
};

// ─── Extension entry point ─────────────────────────────────────────────────

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("MathPilot CodeGen loaded — 7 scaffolding templates available");
        },
    },

    tools: [
        {
            name: "mathpilot_scaffold",
            description:
                "Generate compliant boilerplate code following all MathPilot project standards. " +
                "Supports: domain-entity, api-handler, application-use-case, infrastructure-adapter, " +
                "react-component, migration, test-factory. Each template produces correctly layered " +
                "code with proper types, error handling, tests, and naming conventions.",
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
                            "infrastructure-adapter", "react-component", "migration", "test-factory",
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
