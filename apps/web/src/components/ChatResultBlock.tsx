import type { ChatMode, ProblemCard as ProblemCardType } from "../services/api";
import { useProblemSet } from "../context/ProblemSetContext";
import { ProblemCard } from "./ProblemCard";
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

export function ChatResultBlock({ mode, summary, problems }: Props) {
  const { add, remove, has } = useProblemSet();

  function toggleApprove(problem: ProblemCardType) {
    if (has(problem.id)) remove(problem.id);
    else add(problem);
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
        <div className={styles.cards}>
          {problems.map((p) => (
            <div key={p.id} className={styles.cardRow}>
              <button
                className={`${styles.approveBtn} ${has(p.id) ? styles.approveBtnActive : ""}`}
                onClick={() => toggleApprove(p)}
                type="button"
                aria-pressed={has(p.id)}
                title={has(p.id) ? "Remove from My Set" : "Add to My Set"}
              >
                {has(p.id) ? "✓" : "+"}
              </button>
              <div className={styles.cardContent}>
                <ProblemCard problem={p} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
