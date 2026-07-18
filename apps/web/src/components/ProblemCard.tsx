import { useState } from "react";
import { Link } from "react-router-dom";
import type { ProblemCard as ProblemCardType } from "../services/api";
import { renderLatexToHtml } from "../utils/render-latex";
import styles from "./ProblemCard.module.css";
import { TaxonomyTag } from "./TaxonomyTag";

interface Props {
  readonly problem: ProblemCardType;
  readonly onSelect?: (id: string) => void;
}

export function ProblemCard({ problem, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);

  const statementHtml = renderLatexToHtml(problem.statement);
  const titleHtml = renderLatexToHtml(problem.title);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.meta}>
          {problem.competition && (
            <span className={styles.competition}>{problem.competition}</span>
          )}
          {problem.source_year !== null && (
            <span className={styles.year}>{problem.source_year}</span>
          )}
          {problem.competition_level && (
            <span className={styles.level}>{problem.competition_level}</span>
          )}
          {problem.search_score !== undefined && (
            <span className={styles.score} title="Relevance score">
              {(problem.search_score * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <h2 className={styles.title}>
          {onSelect ? (
            <button
              className={styles.titleButton}
              onClick={() => onSelect(problem.id)}
              type="button"
              // Safe: rendered by KaTeX
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          ) : (
            <Link
              to={`/problems/${problem.id}`}
              // Safe: rendered by KaTeX
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          )}
        </h2>
      </header>

      <div
        className={styles.statement}
        // Safe: rendered by KaTeX, no user-controlled HTML paths
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: statementHtml }}
      />

      <footer className={styles.footer}>
        <div className={styles.tags}>
          {problem.topics.map((t) => (
            <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="topic" />
          ))}
          {problem.techniques.map((t) => (
            <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="technique" />
          ))}
        </div>
        <button
          className={styles.expandBtn}
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
          aria-expanded={expanded}
        >
          {expanded ? "Hide details ▲" : "Show details ▼"}
        </button>
      </footer>

      {expanded && (
        <div className={styles.details}>
          {problem.answer !== null && (
            <div className={styles.answer}>
              <strong>Answer:</strong>{" "}
              <span
                dangerouslySetInnerHTML={{ __html: renderLatexToHtml(problem.answer) }}
              />
            </div>
          )}
          <dl className={styles.dims}>
            {problem.proof_style && (
              <>
                <dt>Proof style</dt>
                <dd>{problem.proof_style}</dd>
              </>
            )}
            {problem.creativity_demand && (
              <>
                <dt>Creativity</dt>
                <dd>{problem.creativity_demand}</dd>
              </>
            )}
            {problem.technique_depth && (
              <>
                <dt>Technique depth</dt>
                <dd>{problem.technique_depth}</dd>
              </>
            )}
            {problem.entry_barrier && (
              <>
                <dt>Entry barrier</dt>
                <dd>{problem.entry_barrier}</dd>
              </>
            )}
          </dl>
          <Link to={`/problems/${problem.id}`} className={styles.detailLink}>
            View full problem →
          </Link>
        </div>
      )}
    </article>
  );
}
