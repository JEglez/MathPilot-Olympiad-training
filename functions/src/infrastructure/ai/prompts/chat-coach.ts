// Olympiad coach system prompt — version 1
// ai-guidelines.md §2.1: prompts live in version-controlled files, not inline strings.
//
// Purpose:     Guide GPT-4o-mini to act as an olympiad coach that ONLY cites
//              retrieved problems and never fabricates mathematical content.
// Model target: gpt-4o-mini
// Version:     1
// Input:       RetrievedProblem[] (from retrieval.ts)
// Output:      Natural-language coach response with [prob-{uuid}] citations

// Minimal interface for the data the prompt builder needs — avoids importing
// from the API layer (architecture-principles.md §1: deps point inward).
export interface RetrievedProblemContext {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly competition: string | null;
  readonly source_year: number | null;
  readonly source_round: string | null;
  readonly competition_level: string | null;
  readonly topics: ReadonlyArray<{ readonly name: string }>;
  readonly techniques: ReadonlyArray<{ readonly name: string }>;
}

/**
 * Build the system prompt from the retrieved problem set.
 *
 * The retrieved problems are injected into the system prompt, NOT the user
 * message, per ai-guidelines §2.2: "User input is injected into user messages,
 * never concatenated into system prompts."
 */
export function buildCoachSystemPrompt(retrieved: RetrievedProblemContext[]): string {
  const problemsSection = retrieved.length === 0
    ? "No problems were retrieved for this query."
    : retrieved.map(p => formatProblemEntry(p)).join("\n\n---\n\n");

  return `\
You are an expert math olympiad coach assistant. You help trainers find and \
understand competition mathematics problems.

RULES — READ CAREFULLY:
1. ONLY cite problems from the RETRIEVED SET below. NEVER invent, hallucinate, \
   or reference any problem not listed in the retrieved set.
2. Cite problems using exactly this format: [prob-{id}] where {id} is the \
   problem's UUID shown in the retrieved set.
3. When recommending a problem, briefly explain WHY it matches the trainer's request.
4. If the retrieved set contains no good matches for the request, say so \
   honestly and clearly — do not force citations.
5. Use LaTeX for all mathematical notation: $...$ for inline math, \
   $$...$$ for display math.
6. Keep explanations concise and targeted for experienced olympiad trainers.
7. Do NOT generate proofs, solutions, or new mathematical content. Your role is \
   to present and explain retrieved problems.

RETRIEVED PROBLEMS:
${problemsSection}`;
}

function formatProblemEntry(p: RetrievedProblemContext): string {
  const topicNames = p.topics.map((t: { name: string }) => t.name).join(", ") || "Unknown";
  const techniqueNames = p.techniques.map((t: { name: string }) => t.name).join(", ") || "None";
  const source = [p.competition, p.source_year, p.source_round]
    .filter(Boolean)
    .join(" ");

  return `\
[prob-${p.id}]: ${p.title}
Source: ${source || "Unknown"}
Level: ${p.competition_level ?? "Unknown"}
Topics: ${topicNames}
Techniques: ${techniqueNames}
Statement: ${p.statement}`;
}
