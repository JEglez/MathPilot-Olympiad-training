import { renderLatexToHtml } from "../utils/render-latex";
import styles from "./ChatMessage.module.css";

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

/** Extract [prob-xxx] references from text */
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
    <div className={`${styles.message} ${role === "user" ? styles.user : styles.assistant}`}>
      <div className={styles.bubble}>
        {role === "user" ? (
          <p className={styles.userText}>{content}</p>
        ) : (
          <div
            className={styles.assistantText}
            dangerouslySetInnerHTML={{ __html: htmlContent ?? "" }}
          />
        )}
        {isStreaming && <span className={styles.cursor} aria-hidden="true" />}
      </div>

      {citedProblems.length > 0 && (
        <div className={styles.chips}>
          {citedProblems.map((c) => (
            <a
              key={c.id}
              href={`/problems/${c.id}`}
              className={styles.chip}
              target="_blank"
              rel="noreferrer"
            >
              📌 {c.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
