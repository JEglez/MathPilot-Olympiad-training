# MathPilot — Olympiad Training Platform

> The GPS for olympiad training — not just a map of problems, but a navigator
> that knows where you are and where you need to go.

MathPilot is an AI-powered platform that connects the right math olympiad problem
to the right student at the right moment. It replaces manual problem curation with
a knowledge-graph-driven discovery engine validated by expert trainers.

## What It Does

- **For trainers:** Build a targeted training session in seconds instead of hours
  of searching PDFs and archives.
- **For students:** Discover bridge problems that connect what you know to what
  you need to learn next.

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-dimensional taxonomy** | 8 domains, 50+ subtopics, techniques with prerequisite graphs — not a flat difficulty scale |
| **AI-powered classification** | Automatic tagging of problems by topic, technique, and cognitive load |
| **Semantic search** | Find problems by concept, not just keywords, using vector similarity |
| **Knowledge gap analysis** | Identify what a student needs to learn based on their mastery profile |
| **Trainer validation loop** | AI proposes classifications; trainers validate. The corpus improves with every interaction |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TypeScript, KaTeX |
| Backend | Azure Functions (TypeScript) |
| Database | PostgreSQL + pgvector |
| AI Services | Azure OpenAI (classification, embeddings, RAG) |
| Hosting | Azure Static Web Apps |
| Infrastructure | Bicep / Terraform, Azure Key Vault |

## Project Documentation

| Document | Purpose |
|----------|---------|
| [`docs/domain-model.md`](docs/domain-model.md) | Entity definitions and relationships |
| [`docs/taxonomy.md`](docs/taxonomy.md) | Full problem classification taxonomy |
| [`docs/taxonomy-integration.md`](docs/taxonomy-integration.md) | How taxonomy integrates with the platform |
| [`docs/plan/`](docs/plan/) | Product analysis, architecture, and implementation roadmap |

## Engineering Standards

| Document | Purpose |
|----------|---------|
| [`constitution.md`](constitution.md) | Non-negotiable project tenets and decision-making rules |
| [`architecture-principles.md`](architecture-principles.md) | Layered architecture, DDD, API and data design |
| [`coding-standards.md`](coding-standards.md) | TypeScript rules, naming conventions, error handling |
| [`testing-standards.md`](testing-standards.md) | Test pyramid, coverage targets, AI benchmark testing |
| [`ai-guidelines.md`](ai-guidelines.md) | AI integration rules, prompt management, safety |

## Getting Started

> **Prerequisites:** Node.js (LTS), PostgreSQL 16+, Azure CLI

```bash
# Clone the repository
git clone https://github.com/JEglez/MathPilot-Olympiad-training.git
cd MathPilot-Olympiad-training

# Install dependencies
npm install

# Set up environment variables (copy and edit)
cp .env.example .env

# Run locally
npm run dev
```

## Contributing

1. Read the [constitution](constitution.md) and [coding standards](coding-standards.md).
2. Branch from `main` using `feat/`, `fix/`, or `docs/` prefixes.
3. Write tests for all domain logic changes.
4. Use [conventional commits](https://www.conventionalcommits.org/).
5. Open a PR — squash-merge when approved.

## License

See [LICENSE](LICENSE) for details.
