import { useState } from "react";
import type { ChatMode, ProblemCard as ProblemCardType } from "../services/api";
import { ProblemCard } from "./ProblemCard";
import { printProblems } from "../utils/print-problems";
import styles from "./ChatResultBlock.module.css";

interface Props {
  readonly mode: ChatMode;
  readonly summary: string;
  readonly problems: ProblemCardType[];
}

const MODE_LABEL: Record<ChatMode, string> = {
  exam: "📝 Exam Simulation",
  training: "🏋️ Training Set",
  general: "🔍 Problem Results",
};

export function ChatResultBlock({ mode, summary, problems }: Props) {
  const [approved, setApproved] = useState<Set<string>>(new Set());

  function toggleApprove(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDownload() {
    const selected = problems.filter((p) => approved.has(p.id));
    printProblems({ mode, summary, problems: selected });
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
                  title={approved.has(p.id) ? "Remove from selection" : "Approve for download"}
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
                {approved.size} problem{approved.size !== 1 ? "s" : ""} approved
              </span>
              <button
                className={styles.downloadBtn}
                onClick={handleDownload}
                type="button"
              >
                ⬇ Download PDF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
