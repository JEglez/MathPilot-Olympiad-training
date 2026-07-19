import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ProblemDetailResponse } from "../services/api";
import { getProblem } from "../services/api";
import { TaxonomyTag } from "../components/TaxonomyTag";
import { renderLatexToHtml } from "../utils/render-latex";

type LevelVariant = "local" | "state" | "national" | "international";
const LEVEL_STYLES: Record<LevelVariant, { bg: string; text: string }> = {
  local:         { bg: "#DCFCE7", text: "#166534" },
  state:         { bg: "#FEF3C7", text: "#92400E" },
  national:      { bg: "#DBEAFE", text: "#1D4ED8" },
  international: { bg: "#EDE9FE", text: "#5B21B6" },
};
function levelVariant(level: string | null | undefined): LevelVariant {
  const l = (level ?? "").toLowerCase();
  if (l === "local") return "local";
  if (l === "state") return "state";
  if (l === "national") return "national";
  if (l === "international") return "international";
  return "local";
}

export function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<ProblemDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSolutions, setOpenSolutions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    getProblem(id)
      .then((p) => { setProblem(p); setOpenSolutions(new Set(p.solutions.filter((s) => s.is_canonical).map((s) => s.id))); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load problem"))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-sm animate-pulse" style={{ color: "#F59E0B" }}>Loading…</span>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-sm" style={{ color: "#DC2626" }}>{error}</span>
    </div>
  );
  if (!problem) return null;

  const variant = levelVariant(problem.competition_level);
  const lvStyle = LEVEL_STYLES[variant];

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FC" }}>
      {/* ── Sticky topbar ── */}
      <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-3"
        style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}>
        <Link to="/" className="text-xs font-medium hover:underline" style={{ color: "#94A3B8" }}>← Search</Link>
        <span style={{ color: "#E2E8F0" }}>·</span>
        {problem.competition && (
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{problem.competition}</span>
        )}
        {problem.source_year && (
          <span className="text-xs" style={{ color: "#CBD5E1" }}>{problem.source_year}</span>
        )}
        {problem.competition_level && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ml-1"
            style={{ background: lvStyle.bg, color: lvStyle.text }}>
            {problem.competition_level}
          </span>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title */}
        <h1
          className="font-bold leading-tight mb-4"
          style={{ fontSize: "1.5rem", color: "#0F172A", lineHeight: 1.3 }}
          dangerouslySetInnerHTML={{ __html: renderLatexToHtml(problem.title) }}
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {problem.topics.map((t) => <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="topic" />)}
          {problem.subtopics.map((s) => <TaxonomyTag key={s.code} code={s.code} name={s.name} kind="subtopic" />)}
          {problem.techniques.map((t) => <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="technique" />)}
        </div>

        {/* Problem Statement */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 pb-2"
            style={{ color: "#0F172A", borderBottom: "1px solid #E5E7EB" }}>
            Problem Statement
          </h2>
          <div
            className="text-sm leading-relaxed overflow-x-auto"
            style={{ color: "#334155", lineHeight: 1.75 }}
            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(problem.statement) }}
          />
        </section>

        {/* Answer */}
        {problem.answer !== null && (
          <section className="mb-6 p-4 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FEF3C7" }}>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92400E" }}>Answer</h2>
            <div className="text-sm" style={{ color: "#0F172A" }}
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(problem.answer) }} />
          </section>
        )}

        {/* Solutions */}
        {problem.solutions.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 pb-2"
              style={{ color: "#0F172A", borderBottom: "1px solid #E5E7EB" }}>
              {problem.solutions.length === 1 ? "Solution" : `Solutions (${problem.solutions.length})`}
            </h2>
            <div className="space-y-3">
              {problem.solutions.map((sol) => {
                const isOpen = openSolutions.has(sol.id);
                return (
                  <div key={sol.id} className="rounded-xl overflow-hidden"
                    style={{ border: `1.5px solid ${isOpen ? "#FCD34D" : "#E2E8F0"}` }}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                      style={{ background: isOpen ? "#FFFBEB" : "#fff", cursor: "pointer" }}
                      onClick={() => setOpenSolutions((prev) => {
                        const next = new Set(prev);
                        if (next.has(sol.id)) next.delete(sol.id); else next.add(sol.id);
                        return next;
                      })}
                      aria-expanded={isOpen}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>{sol.approach_name}</span>
                        {sol.is_canonical && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
                            Canonical
                          </span>
                        )}
                      </span>
                      <span style={{ color: "#94A3B8", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div
                        className="px-5 pb-5 pt-3 text-sm leading-relaxed overflow-x-auto"
                        style={{ color: "#334155", lineHeight: 1.8, borderTop: "1px solid #FEF3C7" }}
                        dangerouslySetInnerHTML={{ __html: renderLatexToHtml(sol.body) }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Related problems */}
        {problem.related_problems.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 pb-2"
              style={{ color: "#0F172A", borderBottom: "1px solid #E5E7EB" }}>
              Related Problems
            </h2>
            <ul className="space-y-2 list-none p-0 m-0">
              {problem.related_problems.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full text-left flex items-start justify-between gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ background: "#fff", border: "1.5px solid #E2E8F0", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FCD34D"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                    onClick={() => navigate(`/problems/${r.id}`)}
                  >
                    <span className="text-sm font-medium" style={{ color: "#0F172A" }}
                      dangerouslySetInnerHTML={{ __html: renderLatexToHtml(r.title) }} />
                    <span className="text-[9px] uppercase tracking-wider font-bold shrink-0 px-2 py-1 rounded"
                      style={{ background: "#F1F5F9", color: "#64748B" }}>
                      {r.relationship_type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Problem properties */}
        <section className="mb-8 p-4 rounded-xl" style={{ background: "#fff", border: "1px solid #E2E8F0" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#94A3B8" }}>
            Problem Properties
          </h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm" style={{ gridTemplateColumns: "auto 1fr" }}>
            {[
              ["Proof style",     problem.proof_style],
              ["Creativity",      problem.creativity_demand],
              ["Technique depth", problem.technique_depth],
              ["Entry barrier",   problem.entry_barrier],
              ["Language",        problem.language],
            ].filter(([, v]) => v).map(([label, val]) => (
              <><dt key={`dt-${label}`} className="font-medium" style={{ color: "#64748B" }}>{label}</dt>
                <dd key={`dd-${label}`} className="capitalize" style={{ color: "#0F172A" }}>{val}</dd></>
            ))}
          </dl>
        </section>

        {/* Find similar */}
        <button
          type="button"
          className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
          style={{ background: "#0F172A", color: "#F59E0B", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1E293B"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#0F172A"; }}
          onClick={() => navigate(`/?q=${encodeURIComponent(problem.title)}`)}
        >
          ⌕ Find similar problems
        </button>
      </div>
    </div>
  );
}
