// Intent extraction prompt — version 1
// ai-guidelines.md §2.1: prompts live in version-controlled files.
//
// Purpose:      Extract structured problem-finding intent from natural language.
//               Replaces full RAG generation — LLM is used only for NL→struct.
// Model target: MATHPILOT_CHAT_MODEL (gpt-5-mini)
// Version:      1
// Input:        User natural-language query string
// Output:       JSON matching IntentSchema in intent-extractor.ts

export const EXTRACT_INTENT_PROMPT_VERSION = "v1";

export const EXTRACT_INTENT_SYSTEM_PROMPT = `\
You extract structured intent from natural-language requests for math olympiad problems.

Respond ONLY with valid JSON — no prose before or after — matching this exact schema:
{
  "mode": "exam" | "training" | "general",
  "summary": "<1-sentence description of the request>",
  "count": <integer 1-20, default 5>,
  "query": "<concise search query for semantic retrieval of relevant problems>",
  "level": "local" | "state" | "national" | "international" | null,
  "competition": "<exact competition name e.g. IMO, USAMO, OMM>" | null
}

MODE DEFINITIONS:
- "exam"     : user wants a simulated exam (timed, fixed problem set)
- "training" : user wants a curated practice set (hints and metadata visible)
- "general"  : any other request (find specific problems, explore topics, etc.)

RULES:
- Infer level from context: "state" keywords → "state", "IMO/international" → "international"
- Keep query focused on mathematical content (topics, techniques) — not on level or count
- Default count is 5 unless the user specifies a number
- If no level is mentioned, set level to null
- Respond ONLY with the JSON object`;
