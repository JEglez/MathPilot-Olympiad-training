import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ProblemDetailResponse } from "../services/api";
import { getProblem } from "../services/api";
import { TaxonomyTag } from "../components/TaxonomyTag";
import { renderLatexToHtml } from "../utils/render-latex";
import styles from "./ProblemDetailPage.module.css";

export function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<ProblemDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solutionOpen, setSolutionOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    getProblem(id)
      .then(setProblem)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load problem");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!problem) return null;

  const statementHtml = renderLatexToHtml(problem.statement);

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div className={styles.meta}>
          {problem.competition && (
            <span className={styles.competition}>{problem.competition}</span>
          )}
          {problem.source_year !== null && (
            <span className={styles.year}>{problem.source_year}</span>
          )}
          {problem.source_round && (
            <span className={styles.round}>{problem.source_round}</span>
          )}
          {problem.competition_level && (
            <span className={styles.level}>{problem.competition_level}</span>
          )}
        </div>
        <h1 className={styles.title}>{problem.title}</h1>
      </header>

      <div className={styles.tags}>
        {problem.topics.map((t) => (
          <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="topic" />
        ))}
        {problem.subtopics.map((s) => (
          <TaxonomyTag key={s.code} code={s.code} name={s.name} kind="subtopic" />
        ))}
        {problem.techniques.map((t) => (
          <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="technique" />
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Problem Statement</h2>
        <div
          className={styles.statement}
          dangerouslySetInnerHTML={{ __html: statementHtml }}
        />
      </section>

      {problem.answer !== null && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Answer</h2>
          <div
            className={styles.answer}
            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(problem.answer) }}
          />
        </section>
      )}

      {problem.solutions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {problem.solutions.length === 1 ? "Solution" : "Solutions"}
          </h2>
          {problem.solutions.map((sol) => (
            <div key={sol.id} className={styles.solution}>
              <button
                className={styles.solutionToggle}
                onClick={() =>
                  setSolutionOpen((prev) => (prev === sol.id ? null : sol.id))
                }
                type="button"
                aria-expanded={solutionOpen === sol.id}
              >
                <span className={styles.solutionName}>
                  {sol.approach_name}
                  {sol.is_canonical && (
                    <span className={styles.canonical}>Canonical</span>
                  )}
                </span>
                <span>{solutionOpen === sol.id ? "▲" : "▼"}</span>
              </button>
              {solutionOpen === sol.id && (
                <div
                  className={styles.solutionBody}
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(sol.body) }}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {problem.related_problems.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Related Problems</h2>
          <ul className={styles.relatedList}>
            {problem.related_problems.map((r) => (
              <li key={r.id}>
                <button
                  className={styles.relatedBtn}
                  onClick={() => navigate(`/problems/${r.id}`)}
                  type="button"
                >
                  <span>{r.title}</span>
                  <span className={styles.relType}>{r.relationship_type}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.dimSection}>
        <h2 className={styles.sectionTitle}>Problem Properties</h2>
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
          {problem.language && (
            <>
              <dt>Language</dt>
              <dd>{problem.language}</dd>
            </>
          )}
        </dl>
      </section>

      <div className={styles.actions}>
        <button
          className={styles.similarBtn}
          onClick={() => navigate(`/?q=${encodeURIComponent(problem.title)}`)}
          type="button"
        >
          🔍 Find similar problems
        </button>
      </div>
    </article>
  );
}
