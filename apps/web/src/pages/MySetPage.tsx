import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useProblemSet } from "../context/ProblemSetContext";
import { exportProblems, type ExportFormat } from "../utils/print-problems";
import { renderLatexToHtml } from "../utils/render-latex";
import styles from "./MySetPage.module.css";

type PracticeOrder = "listed" | "shuffled" | "difficulty";
type ActiveMode = "practice" | "export";

const DOMAIN_TAGS: Record<string, { text: string; bg: string }> = {
  "Number Theory": { text: "#006096", bg: "#E3F2FD" },
  "Geometry":      { text: "#527630", bg: "#EAF2E3" },
  "Algebra":       { text: "#B45309", bg: "#FFF8E1" },
  "Combinatorics": { text: "#6B21A8", bg: "#F3E8FF" },
};

function getDomainStyle(topicName: string) {
  return DOMAIN_TAGS[topicName] ?? { text: "#0F172A", bg: "#F1F5F9" };
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "pdf",   label: "PDF",      ext: ".pdf" },
  { value: "md",    label: "Markdown", ext: ".md"  },
  { value: "latex", label: "LaTeX",    ext: ".tex" },
];

export function MySetPage() {
  const { problems, remove, clear } = useProblemSet();

  // Practice mode settings
  const [activeMode, setActiveMode] = useState<ActiveMode>("practice");
  const [timed, setTimed] = useState(false);
  const [hints, setHints] = useState(true);
  const [revealAnswers, setRevealAnswers] = useState(false);
  const [order, setOrder] = useState<PracticeOrder>("listed");

  // Export mode settings
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [organization, setOrganization] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docDate, setDocDate] = useState(() =>
    new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
  );
  const [instructions, setInstructions] = useState("");

  // Stats
  const topicCounts = problems.reduce<Record<string, number>>((acc, p) => {
    const name = p.topics[0]?.name ?? "Unknown";
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  const levelCounts = problems.reduce<Record<string, number>>((acc, p) => {
    const lvl = p.competition_level ?? "Unknown";
    acc[lvl] = (acc[lvl] ?? 0) + 1;
    return acc;
  }, {});

  const dominantLevel = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  function openExportModal() {
    setDocTitle("");
    setShowModal(true);
  }

  function handleGenerate() {
    if (!docTitle.trim()) return;
    exportProblems({
      organization: organization.trim(),
      title: docTitle.trim(),
      date: docDate.trim(),
      instructions: instructions.trim(),
      format: exportFormat,
      showAnswers: includeAnswers,
      problems,
    });
    setShowModal(false);
  }

  return (
    <div className={styles.page} data-testid="my-set-page">
      <div className={cn(styles.inner, "px-4 sm:px-6")}>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold leading-tight" style={{ color: "#0F172A" }}>
              My Set
            </h1>
            <span
              className="text-xs font-bold rounded-full px-2 py-0.5"
              style={{ background: "#F59E0B", color: "#0F172A" }}
            >
              {problems.length}
            </span>
          </div>
          {problems.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-semibold px-3 min-h-[44px] rounded-lg border transition-colors"
              style={{ borderColor: "#E2E8F0", color: "#64748B" }}
            >
              Clear all
            </button>
          )}
        </div>

        {problems.length === 0 ? (
          <div className={styles.emptyState}>
            <p className="text-base font-medium mb-3" style={{ color: "#64748B" }}>
              Your set is empty — add problems from Search or AI Finder.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/"
                className="text-sm font-semibold min-h-[44px] flex items-center px-4 rounded-lg border transition-colors"
                style={{ borderColor: "#F59E0B", color: "#92400E" }}
              >
                Go to Search
              </Link>
              <Link
                to="/chat"
                className="text-sm font-semibold min-h-[44px] flex items-center px-4 rounded-lg border transition-colors"
                style={{ borderColor: "#F59E0B", color: "#92400E" }}
              >
                Go to AI Finder
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.layout}>
            {/* ── Left: problem list ── */}
            <div className="flex flex-col gap-2">
              {problems.map((problem, idx) => {
                const statementHtml = renderLatexToHtml(problem.statement);
                const topicName = problem.topics[0]?.name;
                const topicStyle = topicName ? getDomainStyle(topicName) : null;
                return (
                  <div key={problem.id} className={styles.problemRow}>
                    {/* Drag handle */}
                    <span className={styles.dragHandle} aria-hidden>⠿</span>
                    {/* Number */}
                    <span className={styles.problemNumber}>{idx + 1}</span>
                    {/* Content */}
                    <div className={styles.problemContent}>
                      <div className={styles.problemTags}>
                        {topicName && topicStyle && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: topicStyle.bg, color: topicStyle.text }}
                          >
                            {topicName}
                          </span>
                        )}
                        {problem.competition_level && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                            style={{ background: "#F1F5F9", color: "#64748B" }}
                          >
                            {problem.competition_level}
                          </span>
                        )}
                      </div>
                      <div
                        className={styles.problemStatement}
                        dangerouslySetInnerHTML={{ __html: statementHtml }}
                      />
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => remove(problem.id)}
                      aria-label="Remove problem"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Right: action panel ── */}
            <div className={styles.actionPanel}>
              {/* Stats */}
              <div className={styles.statsCard}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#64748B" }}>
                  Set Summary
                </p>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt style={{ color: "#64748B" }}>Total</dt>
                    <dd className="font-semibold">{problems.length}</dd>
                  </div>
                  {Object.entries(topicCounts).map(([name, count]) => (
                    <div key={name} className="flex justify-between">
                      <dt style={{ color: getDomainStyle(name).text }}>{name}</dt>
                      <dd className="font-semibold">{count}</dd>
                    </div>
                  ))}
                  {dominantLevel && (
                    <div className="flex justify-between">
                      <dt style={{ color: "#64748B" }}>Most common level</dt>
                      <dd className="font-semibold capitalize">{dominantLevel}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Mode: Practice */}
              <div
                className={cn(styles.modeCard, activeMode === "practice" && styles.modeCardSelected, "mb-3")}
                onClick={() => setActiveMode("practice")}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="mode-practice"
                    name="active-mode"
                    checked={activeMode === "practice"}
                    onChange={() => setActiveMode("practice")}
                    className="accent-[#F59E0B]"
                  />
                  <label htmlFor="mode-practice" className="font-semibold text-sm cursor-pointer">
                    🎯 Practice Session
                  </label>
                </div>

                {activeMode === "practice" && (
                  <div className="mt-3 flex flex-col gap-1">
                    <div className={styles.modeToggleRow}>
                      <label htmlFor="toggle-timed" className="text-xs" style={{ color: "#64748B" }}>Timed session</label>
                      <input id="toggle-timed" type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="accent-[#F59E0B]" />
                    </div>
                    <div className={styles.modeToggleRow}>
                      <label htmlFor="toggle-hints" className="text-xs" style={{ color: "#64748B" }}>Show hints</label>
                      <input id="toggle-hints" type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} className="accent-[#F59E0B]" />
                    </div>
                    <div className={styles.modeToggleRow}>
                      <label htmlFor="toggle-reveal" className="text-xs" style={{ color: "#64748B" }}>Reveal answers</label>
                      <input id="toggle-reveal" type="checkbox" checked={revealAnswers} onChange={(e) => setRevealAnswers(e.target.checked)} className="accent-[#F59E0B]" />
                    </div>
                    <select
                      className={styles.selectField}
                      value={order}
                      onChange={(e) => setOrder(e.target.value as PracticeOrder)}
                      aria-label="Problem order"
                    >
                      <option value="listed">As listed</option>
                      <option value="shuffled">Shuffled</option>
                      <option value="difficulty">By difficulty</option>
                    </select>
                    <button
                      type="button"
                      disabled
                      title="Coming soon"
                      className="mt-2 w-full min-h-[44px] rounded-lg font-semibold text-sm transition-colors"
                      style={{ background: "#F59E0B", color: "#0F172A", opacity: 0.5, cursor: "not-allowed" }}
                    >
                      ▶ Start Practice
                    </button>
                  </div>
                )}
              </div>

              {/* Mode: Export */}
              <div
                className={cn(styles.modeCard, activeMode === "export" && styles.modeCardSelected)}
                onClick={() => setActiveMode("export")}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="mode-export"
                    name="active-mode"
                    checked={activeMode === "export"}
                    onChange={() => setActiveMode("export")}
                    className="accent-[#F59E0B]"
                  />
                  <label htmlFor="mode-export" className="font-semibold text-sm cursor-pointer">
                    📄 Create Training Material
                  </label>
                </div>

                {activeMode === "export" && (
                  <div className="mt-3 flex flex-col gap-1">
                    <div className={styles.modeToggleRow}>
                      <label htmlFor="toggle-answers" className="text-xs" style={{ color: "#64748B" }}>Include answers</label>
                      <input id="toggle-answers" type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} className="accent-[#F59E0B]" />
                    </div>
                    <div className={styles.formatRow}>
                      {FORMAT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExportFormat(opt.value); }}
                          className={cn(styles.formatBtn, exportFormat === opt.value && styles.formatBtnActive)}
                        >
                          {opt.label}
                          <span className="text-[0.7rem] opacity-65 font-normal">{opt.ext}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openExportModal(); }}
                      className="mt-2 w-full min-h-[44px] rounded-lg font-semibold text-sm transition-colors"
                      style={{ background: "#F59E0B", color: "#0F172A" }}
                    >
                      📄 Build Exam…
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Coming soon"
                      className="mt-1 w-full min-h-[44px] rounded-lg font-semibold text-sm border transition-colors"
                      style={{ borderColor: "#E2E8F0", color: "#64748B", opacity: 0.5, cursor: "not-allowed" }}
                    >
                      Preview
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold" style={{ color: "#0F172A" }}>Build training material</h3>

            <label className={styles.modalLabel} htmlFor="ms-org">
              Organization <span className="text-[0.75rem] font-normal lowercase">(optional)</span>
            </label>
            <input
              id="ms-org"
              className={styles.modalInput}
              type="text"
              placeholder="e.g. Comité Estatal de Olimpiadas de Matemáticas"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />

            <label className={styles.modalLabel} htmlFor="ms-title">Exam title *</label>
            <input
              id="ms-title"
              className={styles.modalInput}
              type="text"
              placeholder="e.g. Primer examen para la 40 OMM"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              autoFocus
            />

            <label className={styles.modalLabel} htmlFor="ms-date">Date</label>
            <input
              id="ms-date"
              className={styles.modalInput}
              type="text"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
            />

            <label className={styles.modalLabel} htmlFor="ms-instructions">
              Instructions <span className="text-[0.75rem] font-normal lowercase">(one per line, optional)</span>
            </label>
            <textarea
              id="ms-instructions"
              className={styles.modalTextarea}
              rows={4}
              placeholder={"Tiempo límite: 4.5 horas.\nEscribe todos los razonamientos.\nNo puedes usar calculadora."}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 min-h-[44px] rounded-lg text-sm border transition-colors"
                style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!docTitle.trim()}
                className="px-4 min-h-[44px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#F59E0B", color: "#0F172A" }}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
