# MathPilot — AI Guidelines

> Rules for building, integrating, and operating AI-powered features.
> Applies to all LLM, embedding, and ML components.

---

## 1. Fundamental Principles

### 1.1 AI Is Infrastructure, Not Product

AI components are **tools in the service of the domain** — classification engines,
search rankers, recommendation generators. They are replaceable, versioned
infrastructure adapters, not the product itself.

The product is the **curated knowledge graph** and the **trainer-validated corpus**.

### 1.2 Retrieve, Don't Generate

- **Never generate mathematical proofs or solutions.** LLMs hallucinate
  mathematical reasoning. The system retrieves human-verified content.
- **AI classifies and organises.** It tags problems with topics, techniques,
  and difficulty — it does not create mathematical truth.
- **AI proposes, trainers dispose.** Every AI output that affects the knowledge
  graph must pass through human validation.

### 1.3 Graceful Degradation

- The platform must function without AI services. Search falls back to full-text
  PostgreSQL search. Classification queues for later processing.
- No user-facing feature should display a hard error when an AI service is down.

---

## 2. Prompt Engineering

### 2.1 Prompt Management

- Prompts live in **version-controlled files**, not inline strings.
- Location: `src/infrastructure/ai/prompts/` (or equivalent).
- Each prompt file includes: purpose, model target, expected input/output
  schema, and version number.

### 2.2 Prompt Design Rules

- **Be specific about the domain.** Reference the taxonomy structure (Topics,
  Subtopics, Techniques) explicitly in classification prompts.
- **Constrain output format.** Use JSON mode or structured output. Parse with
  Zod schemas to catch format violations.
- **Include negative examples.** Show the model what *not* to classify, especially
  for ambiguous categories.
- **Set temperature to 0** for classification and extraction tasks. Only use
  non-zero temperature for creative/conversational features.
- **System prompts are immutable per version.** User input is injected into
  user messages, never concatenated into system prompts.

### 2.3 Prompt Testing

- Every prompt has a **golden evaluation set** (≥ 50 examples with expected outputs).
- Prompt changes require a **benchmark run** showing accuracy delta.
- Prompts that reduce accuracy on the golden set are rejected.
- Track **per-category accuracy** — overall accuracy can mask regressions in
  rare categories.

---

## 3. Model Selection & Configuration

| Use Case | Model Tier | Rationale |
|----------|-----------|-----------|
| Problem classification | Cost-efficient (e.g., GPT-4o-mini) | High volume, structured output |
| Embedding generation | Small embedding model | Dimensions × corpus size = cost driver |
| Chat / RAG responses | Cost-efficient with RAG context | Low frequency, quality from retrieval not model |
| Taxonomy suggestions | Higher capability when needed | Low volume, high accuracy requirement |

### Rules

- **Model identifiers are environment configuration**, not hardcoded.
- **Justify upgrades** with benchmark data. "It feels better" is not evidence.
- **Track cost per operation.** Log token usage for every AI call.
- **Set token limits** on all requests. Unbounded completions are a cost and
  latency risk.

---

## 4. Data Pipeline Rules

### 4.1 Ingestion

- AI classification runs **asynchronously** in the ingestion pipeline, never in
  the request path.
- Every classification result is stored with: model version, prompt version,
  confidence score, and timestamp.
- Low-confidence results (< configurable threshold) are flagged for human review.

### 4.2 Embeddings

- Embeddings are **pre-computed and stored** in pgvector, not generated at query time.
- Embedding model changes require a **full re-indexing** job with rollback capability.
- Store the model identifier alongside each embedding vector.

### 4.3 Caching

- AI responses are cached with **content-addressable keys** (hash of input +
  model + prompt version).
- Cache invalidation happens on prompt version changes or model upgrades.

---

## 5. Safety & Ethics

### 5.1 Content Safety

- All user-uploaded content (PDFs, text) passes through content moderation
  before AI processing.
- AI outputs are sanitised before storage — strip any content not matching
  expected schema.
- Log all AI inputs and outputs for audit. Retention follows data policy.

### 5.2 Bias Awareness

- The taxonomy was designed with awareness of competition traditions across
  cultures. Monitor classification accuracy across competition sources
  (IMO, USAMO, OMM, etc.) to detect bias.
- Track per-domain accuracy separately. If a domain (e.g., GAME) consistently
  scores lower, investigate prompt and training data gaps.

### 5.3 Transparency

- When displaying AI-generated classifications to users, indicate they are
  AI-proposed (vs. trainer-validated).
- Provide a feedback mechanism for trainers to correct AI classifications.
- Display confidence scores where appropriate.

---

## 6. Operational Rules

- **Rate limiting:** Enforce per-minute token budgets on AI service calls.
  Alert when approaching 80% of quota.
- **Circuit breaker:** After 3 consecutive failures to an AI endpoint, open the
  circuit for 60 seconds. Degrade gracefully.
- **Logging:** Log every AI call with: operation type, model, prompt version,
  input token count, output token count, latency, success/failure.
- **Monitoring:** Dashboard for AI cost, latency P50/P95/P99, error rate,
  and classification confidence distribution.
- **Budget alerts:** Configure billing alerts at 50%, 80%, and 100% of monthly
  AI spend budget.

---

## 7. AI-Assisted Development

When using AI coding assistants (GitHub Copilot, etc.) on this codebase:

- **AI-generated code is reviewed to the same standard as human code.** "Copilot
  wrote it" is not a justification for skipping review.
- **AI suggestions for domain logic require extra scrutiny.** The assistant
  doesn't understand olympiad mathematics.
- **Never paste secrets, PII, or proprietary problem content into external AI
  tools.**
- **Commit messages must be written or reviewed by the developer**, not
  blindly accepted from AI.
