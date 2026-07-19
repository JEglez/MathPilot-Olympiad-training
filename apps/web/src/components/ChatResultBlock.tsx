import { useState } from "react";
import type { ChatMode, ProblemCard as ProblemCardType } from "../services/api";
import { ProblemCard } from "./ProblemCard";
import { exportProblems, type ExportFormat } from "../utils/print-problems";
import styles from "./ChatResultBlock.module.css";

interface Props {
  readonly mode: ChatMode;
  readonly summary: string;
  readonly showAnswers: boolean;
  readonly problems: ProblemCardType[];
}

const MODE_LABEL: Record<ChatMode, string> = {
  exam: "📝 Exam Simulation",
  training: "🏋️ Training Set",
  general: "🔍 Problem Results",
};

const FORMAT_OPTIONS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "pdf",   label: "PDF",      ext: ".pdf" },
  { value: "md",    label: "Markdown", ext: ".md"  },
  { value: "latex", label: "LaTeX",    ext: ".tex" },
];

export function ChatResultBlock({ mode, summary, showAnswers, problems }: Props) {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [organization, setOrganization] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docDate, setDocDate] = useState(() =>
    new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
  );
  const [instructions, setInstructions] = useState("");
  const [format, setFormat] = useState<ExportFormat>("pdf");

  function toggleApprove(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openModal() {
    setDocTitle("");
    setShowModal(true);
  }

  function handleGenerate() {
    if (!docTitle.trim()) return;
    const selected = problems.filter((p) => approved.has(p.id));
    exportProblems({
      organization: organization.trim(),
      title: docTitle.trim(),
      date: docDate.trim(),
      instructions: instructions.trim(),
      format,
      showAnswers,
      problems: selected,
    });
    setShowModal(false);
  }

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.modeLabel}>{MODE_LABEL[mode]}</span>
        <p className={styles.summary}>{summary}</p>
        <span className={styles.count}>
          {problems.length} problem{problems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {problems.length === 0 ? (
        <p className={styles.empty}>No matching problems found. Try rephrasing your request.</p>
      ) : (
        <>
          <div className={styles.cards}>
            {problems.map((p) => (
              <div key={p.id} className={styles.cardRow}>
                <button
                  className={`${styles.approveBtn} ${approved.has(p.id) ? styles.approveBtnActive : ""}`}
                  onClick={() => toggleApprove(p.id)}
                  type="button"
                  aria-pressed={approved.has(p.id)}
                  title={approved.has(p.id) ? "Remove from selection" : "Add to export"}
                >
                  {approved.has(p.id) ? "✓" : "+"}
                </button>
                <div className={styles.cardContent}>
                  <ProblemCard problem={p} />
                </div>
              </div>
            ))}
          </div>

          {approved.size > 0 && (
            <div className={styles.downloadBar}>
              <span className={styles.downloadCount}>
                {approved.size} problem{approved.size !== 1 ? "s" : ""} selected
              </span>
              <button
                className={styles.downloadBtn}
                onClick={openModal}
                type="button"
              >
                ⬇ Export
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Export problems</h3>

            <label className={styles.modalLabel} htmlFor="doc-org">
              Organization <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="doc-org"
              className={styles.modalInput}
              type="text"
              placeholder="e.g. Comité Estatal de Olimpiadas de Matemáticas"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />

            <label className={styles.modalLabel} htmlFor="doc-title">
              Exam title *
            </label>
            <input
              id="doc-title"
              className={styles.modalInput}
              type="text"
              placeholder="e.g. Primer examen para la 40 OMM"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              autoFocus
            />

            <label className={styles.modalLabel} htmlFor="doc-date">
              Date
            </label>
            <input
              id="doc-date"
              className={styles.modalInput}
              type="text"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
            />

            <label className={styles.modalLabel} htmlFor="doc-instructions">
              Instructions <span className={styles.optional}>(one per line, optional)</span>
            </label>
            <textarea
              id="doc-instructions"
              className={styles.modalTextarea}
              rows={4}
              placeholder={"Tiempo límite: 4.5 horas.\nEscribe todos los razonamientos.\nNo puedes usar calculadora."}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />

            <span className={styles.modalLabel}>Format</span>
            <div className={styles.formatRow}>
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.formatBtn} ${format === opt.value ? styles.formatBtnActive : ""}`}
                  onClick={() => setFormat(opt.value)}
                >
                  {opt.label}
                  <span className={styles.formatExt}>{opt.ext}</span>
                </button>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={!docTitle.trim()}
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
