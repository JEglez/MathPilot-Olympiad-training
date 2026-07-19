import { renderLatexToHtml } from "../utils/render-latex";

export interface Citation {
  readonly id: string;
  readonly title: string;
}

interface Props {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly citations?: Citation[];
  readonly isStreaming?: boolean;
}

function extractCitationIds(text: string): string[] {
  const matches = text.matchAll(/\[prob-([a-zA-Z0-9_-]+)\]/g);
  return [...new Set([...matches].map((m) => `prob-${m[1]}`))];
}

export function ChatMessage({ role, content, citations = [], isStreaming = false }: Props) {
  const htmlContent = role === "assistant" ? renderLatexToHtml(content) : null;
  const citedIds = role === "assistant" ? extractCitationIds(content) : [];
  const citedProblems = citedIds
    .map((id) => citations.find((c) => c.id === id))
    .filter((c): c is Citation => c !== undefined);

  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div style={{ maxWidth: "80%" }}>
        {/* Bubble */}
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={role === "user"
            ? { background: "#0F172A", color: "#fff", borderBottomRightRadius: 4 }
            : { background: "#fff", color: "#0F172A", border: "1.5px solid #E2E8F0", borderBottomLeftRadius: 4 }
          }
        >
          {role === "user" ? (
            <p className="m-0">{content}</p>
          ) : content.length === 0 && isStreaming ? (
            /* thinking dots */
            <div className="flex items-center gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#F59E0B",
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: htmlContent ?? "" }}
            />
          )}
          {isStreaming && content.length > 0 && (
            <span
              style={{ display: "inline-block", width: 2, height: "1em", background: "#F59E0B", marginLeft: 2, animation: "pulse 1s infinite" }}
              aria-hidden
            />
          )}
        </div>

        {/* Citation chips */}
        {citedProblems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {citedProblems.map((c) => (
              <a
                key={c.id}
                href={`/problems/${c.id}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors hover:no-underline"
                style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FCD34D", textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                📌 {c.title.length > 40 ? c.title.slice(0, 40) + "…" : c.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
