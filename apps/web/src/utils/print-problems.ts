// Generates a printable HTML document from approved problems and triggers browser print.
// Uses the same KaTeX rendering as the main app so math displays correctly.

import type { ProblemCard } from "../services/api";
import { renderLatexToHtml } from "./render-latex";

export interface PrintOptions {
  readonly mode: "exam" | "training" | "general";
  readonly summary: string;
  readonly problems: ProblemCard[];
}

const MODE_LABEL: Record<string, string> = {
  exam: "Exam Simulation",
  training: "Training Set",
  general: "Problem Set",
};

export function printProblems({ mode, summary, problems }: PrintOptions): void {
  const problemsHtml = problems
    .map((p, i) => buildProblemHtml(p, i + 1, mode === "exam"))
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${MODE_LABEL[mode] ?? "Problem Set"}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Georgia", serif; font-size: 12pt; color: #000; padding: 2cm; }
    h1 { font-size: 16pt; margin-bottom: 0.25rem; }
    .subtitle { font-size: 10pt; color: #555; margin-bottom: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
    .problem { margin-bottom: 2rem; page-break-inside: avoid; }
    .problem-header { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.4rem; }
    .problem-num { font-weight: 700; font-size: 13pt; }
    .problem-meta { font-size: 9pt; color: #666; }
    .problem-statement { line-height: 1.7; }
    .problem-answer { margin-top: 0.75rem; padding: 0.4rem 0.75rem; background: #f5f5f5; border-left: 3px solid #333; font-size: 10pt; }
    .tags { margin-top: 0.4rem; font-size: 9pt; color: #555; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${MODE_LABEL[mode] ?? "Problem Set"}</h1>
  <p class="subtitle">${escapeHtml(summary)} &nbsp;·&nbsp; ${problems.length} problem${problems.length !== 1 ? "s" : ""}</p>
  ${problemsHtml}
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function buildProblemHtml(p: ProblemCard, num: number, isExam: boolean): string {
  const meta = [p.competition, p.source_year, p.competition_level]
    .filter(Boolean)
    .join(" · ");

  const topicNames = p.topics.map(t => t.name).join(", ");
  const statementHtml = renderLatexToHtml(p.statement);

  const answerBlock =
    !isExam && p.answer
      ? `<div class="problem-answer"><strong>Answer:</strong> ${renderLatexToHtml(p.answer)}</div>`
      : "";

  const tagsBlock = topicNames
    ? `<div class="tags">Topics: ${escapeHtml(topicNames)}</div>`
    : "";

  return `
<div class="problem">
  <div class="problem-header">
    <span class="problem-num">Problem ${num}</span>
    ${meta ? `<span class="problem-meta">${escapeHtml(meta)}</span>` : ""}
  </div>
  <div class="problem-statement">${statementHtml}</div>
  ${answerBlock}
  ${tagsBlock}
</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
