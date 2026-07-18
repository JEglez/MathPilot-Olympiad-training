# MathPilot — Product Analysis

> **Date**: July 2026
> **Status**: Draft
> **Author**: Architecture & Product Strategy Session

---

## 1. Core Value Proposition

**"The GPS for Olympiad training — not just a map of problems, but a navigator that knows where you are and where you need to go."**

Today, trainers spend hours manually curating problem sets. Students solve random problems without understanding *why* those problems matter for their growth.

The platform's value is **intelligent curation**: connecting the right problem to the right student at the right moment, based on what they know, what they don't, and what they need next.

### For Trainers

> "Build a 2-hour training session on combinatorial invariants" — done in 30 seconds instead of 2 hours of searching PDFs.

### For Students

> "I can solve angle-chasing problems but struggle with inversions" → the system finds the bridge problems that connect those skills.

---

## 2. Biggest Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Cold start / content scarcity** — the platform is useless without a critical mass of well-classified problems | 🔴 Critical | Seed with public olympiad archives (IMO, USAMO, national olympiads). Quality of 200 problems > quantity of 5,000 poorly tagged ones |
| **Classification accuracy** — if AI mislabels techniques/topics, trust is destroyed instantly with this expert audience | 🔴 Critical | Human-in-the-loop: AI proposes, trainers validate. Trainers are the moat |
| **Math reasoning quality** — LLMs still hallucinate mathematical proofs | 🟡 High | Don't generate solutions. Retrieve and present human-verified solutions. Use AI for search/classification, not proof generation |
| **Niche market size** — olympiad training is a small audience | 🟡 High | Start niche (olympiad), expand to competition math broadly, then advanced math education |
| **Trainer adoption** — trainers must see immediate value or they won't contribute | 🟡 High | MVP must save trainers time on day one, not add work |

---

## 3. Competitive Landscape

### What makes MathPilot unique

| Competitor | What they do well | What they lack |
|-----------|-------------------|----------------|
| **Art of Problem Solving (AoPS)** | Massive community, great content, structured courses | No AI-powered discovery. No personalized paths. No trainer tools for camp management. Problems organized by fixed difficulty levels (1-10), not by knowledge graphs |
| **MathNet / Evan Chen's materials** | High-quality curated handouts | Static documents. No search. No personalization. A trainer still has to manually find and sequence problems |
| **Generic AI chatbots (ChatGPT, etc.)** | Can discuss math, generate explanations | No curated problem database. Hallucinate solutions. Can't track student progress. No concept of "what you know vs. what you need" |

### The Differentiator

A **knowledge-graph-driven discovery engine** with trainer-validated content. Not a chatbot that invents math. Not a static archive. A system that *understands the structure of mathematical knowledge* and uses it to navigate.

### The Moat

The **classified problem corpus + trainer validation loop** — something neither AoPS nor ChatGPT has. Every trainer interaction enriches the knowledge graph, making the system harder to replicate over time.

---

## 4. MVP Definition

The MVP should answer ONE question convincingly:

> **"Can a trainer find the right problems faster with this tool than without it?"**

### MVP Scope

- ~200–500 pre-classified problems (seeded from public olympiad archives)
- Searchable by topic, technique, and competition source
- Semantic search: *"problems using the extremal principle in graph theory"*
- A simple chat interface: *"Find me 5 problems that require pigeonhole on geometry"*
- Problem cards showing: statement, source, topics, techniques, prerequisites

### MVP Users

3–5 trainers you know personally who will give honest feedback.

### MVP Success Criteria

- A trainer can find a relevant problem in under 30 seconds
- Semantic search returns results that a trainer agrees are relevant (>80% precision)
- A trainer says "I would use this again"

---

## 5. Feature Prioritization

### Build Now (MVP)

| Feature | Rationale |
|---------|-----------|
| Problem repository with structured metadata | Foundation — everything depends on this |
| Topic/technique/prerequisite tagging | Enables intelligent search |
| Semantic search | The core "find the right problem" experience |
| Chat-based problem discovery | Natural interface for trainers |
| Problem cards with full metadata | Trainers need to evaluate problems quickly |

### Build Next (Post-MVP)

| Feature | Rationale |
|---------|-----------|
| PDF ingestion pipeline | Automates content growth — but manual curation is fine for 200 problems |
| AI-assisted classification | Speeds up tagging — but trainers can tag manually at small scale |
| Trainer validation workflow | Quality control — needed as content grows |

### Build Later (Growth Phase)

| Feature | Rationale |
|---------|-----------|
| Student accounts & progress tracking | Adds complexity before proving core search/discovery value |
| Personalized learning paths | Requires student profiles, which requires user adoption first |
| Camp/group management | B2B feature — irrelevant until you have paying trainers |
| Automated difficulty estimation | Requires training data you don't have yet |

### Postpone Indefinitely

| Feature | Rationale |
|---------|-----------|
| Mobile app | Web-first, validate the concept |
| Gamification | Distraction from core value |
| Solution generation by AI | Hallucination risk too high for this expert audience |

---

## 6. Build Order Principle

```
Search → Discovery → Personalization → Management Tools
```

Each layer only makes sense once the previous one is proven:

1. **Search**: Can we find problems accurately?
2. **Discovery**: Can we suggest problems a trainer didn't know to look for?
3. **Personalization**: Can we tailor suggestions to a specific student's knowledge?
4. **Management**: Can we help trainers run camps and track cohorts?

---

## 7. Cost Efficiency Principles

**This platform is open to the public and free to use.** Every architectural and
implementation decision must prioritise low operational cost. The system should
scale with the number of **problems ingested**, not the number of **users served**.

### Core Rules

1. **AI at ingestion, not at runtime.** The expensive LLM calls (classification,
   embedding generation, taxonomy tagging) happen once when a problem enters
   the system. User-facing operations (search, recommendations, mastery updates)
   must avoid per-request LLM calls whenever possible.

2. **Pre-compute everything possible.** Personalised difficulty scores, problem
   recommendations, and gap detection should be computed from pre-indexed data
   using deterministic rules and scoring functions — not live LLM inference.

3. **Pre-author over generate.** Hints should be stored as structured sequences
   on each Solution entity, revealed progressively — not generated on the fly.
   Feedback should compare student techniques to solution techniques using rules,
   not LLM analysis per submission.

4. **Use the cheapest model that works.** When an LLM call is truly needed (e.g.,
   parsing an ambiguous natural-language search query), use the smallest model
   sufficient for the task (e.g., GPT-4o-mini for intent parsing, not GPT-4o).

5. **Prefer consumption-based pricing.** Azure Functions on Consumption plan,
   Azure AI Search at the smallest viable tier. Pay for what you use, not for
   idle capacity.

6. **No Cosmos DB unless strongly justified.** A small relational database
   (Azure SQL Basic or PostgreSQL Flexible Server) is sufficient for the entity
   model. The problem corpus, student profiles, and mastery data are well under
   the scale threshold where NoSQL becomes necessary.

### What This Means for Future Decisions

| Decision Area | Cost-Efficient Choice |
|---------------|----------------------|
| Hint generation | Pre-authored hint sequences, not live LLM |
| Student feedback | Rule-based technique comparison, not LLM analysis |
| Search | Structured filters + pre-computed embeddings, LLM only for ambiguous queries |
| Gap detection | Deterministic rules ("3 failures on T-X → gap"), not LLM evaluation |
| Plan generation | Template-based (slot techniques via prerequisite DAG), not LLM from scratch |
| Mastery updates | Rule engine per attempt, no AI involved |
| Embedding model | text-embedding-3-small (cheaper, sufficient for similarity) |

---

## Next Steps

- [x] System Architecture and Domain Model — see `docs/domain-model.md`, `docs/plan/02-mvp-architecture.md`
- [ ] Technology Stack Decisions
- [ ] Development Roadmap (Phased)
- [ ] Azure Cost Strategy
- [ ] AI Strategy
- [x] Classification Taxonomy Design — see `docs/taxonomy.md` and `docs/taxonomy-integration.md`
- [ ] Backlog (Epics, Features, User Stories)
- [ ] Future Vision
