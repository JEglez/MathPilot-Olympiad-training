# MathPilot — Project Constitution

> The non-negotiable principles that govern every decision in this codebase.
> Changing any rule below requires a PR with explicit justification and team consensus.

---

## 1. Mission

Build an **AI-powered knowledge-graph platform** for olympiad mathematics training
that connects the right problem to the right student at the right moment.

## 2. Core Tenets

### 2.1 Domain Integrity Is Sacred

The domain model (Topics, Subtopics, Techniques, Learning Objectives, Problems)
is the **single source of truth** for mathematical knowledge representation.

- **No feature bypasses the domain model.** Every user-facing capability must
  read from or write to the canonical entities.
- **Taxonomy changes require domain expert review.** AI may propose; humans validate.
- **Mathematical content is never fabricated.** The system retrieves and classifies
  human-verified content — it does not generate proofs or solutions.

### 2.2 AI Assists, Humans Decide

- AI is used for **classification, search, and recommendation** — never for
  generating mathematical truth.
- Every AI-produced classification is **provisional** until a trainer validates it.
- LLM outputs are **logged, versioned, and auditable.**
- The system must function (in degraded mode) when AI services are unavailable.

### 2.3 Correctness Over Speed

- Mathematical accuracy is the #1 quality metric. A wrong classification destroys
  trust with an expert audience faster than any missing feature.
- Type safety is mandatory. No `any`, no runtime type coercion on domain entities.
- Every public API contract is validated at the boundary.

### 2.4 Cost Discipline

- **AI at ingestion, not at runtime.** Pre-compute embeddings and classifications.
- **Consumption-based pricing by default.** No always-on infrastructure unless
  proven necessary by load data.
- **Cheapest model that meets quality bar.** Justify model upgrades with
  measurable accuracy improvements.

### 2.5 Open by Default

- Code is open source. Secrets, credentials, and PII are never committed.
- Documentation lives next to the code it describes.
- Decisions are recorded in ADRs (Architecture Decision Records) in `docs/adr/`.

## 3. Decision-Making

| Decision Type | Authority | Artefact |
|---------------|-----------|----------|
| Domain model changes | Domain expert + 1 engineer | ADR + migration |
| Architecture changes | 2 engineers | ADR |
| Dependency additions | 1 engineer + CI check | PR review |
| AI model/prompt changes | 1 engineer + accuracy benchmark | PR + benchmark results |
| Security-sensitive changes | 2 engineers | PR + threat note |

## 4. Amendment Process

1. Open a PR titled `[CONSTITUTION] <change summary>`.
2. Include a written justification explaining *why* the current rule is insufficient.
3. Require approval from at least two maintainers.
4. Update the changelog section below.

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-07-17 | Initial constitution | MathPilot team |
