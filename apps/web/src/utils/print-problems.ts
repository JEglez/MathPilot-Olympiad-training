// Exports approved problems as PDF (browser print), Markdown, or LaTeX.
// PDF uses KaTeX-rendered math; Markdown/LaTeX keep raw $...$ notation.

import type { ProblemCard } from "../services/api";
import { renderLatexToHtml } from "./render-latex";

export type ExportFormat = "pdf" | "md" | "latex";

export interface ExportOptions {
  readonly title: string;
  readonly format: ExportFormat;
  readonly showAnswers: boolean;
  readonly problems: ProblemCard[];
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function exportProblems(opts: ExportOptions): void {
  switch (opts.format) {
    case "pdf":    return exportPdf(opts);
    case "md":     return exportMarkdown(opts);
    case "latex":  return exportLatex(opts);
  }
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

function exportPdf({ title, showAnswers, problems }: ExportOptions): void {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const problemsHtml = problems
    .map((p, i) => buildProblemHtml(p, i + 1, showAnswers))
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Georgia", serif; font-size: 12pt; color: #000; padding: 2cm; }
    h1  { font-size: 18pt; margin-bottom: 0.2rem; }
    .date { font-size: 10pt; color: #555; margin-bottom: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.6rem; }
    .problem { margin-bottom: 2.2rem; page-break-inside: avoid; }
    .problem-num { font-weight: 700; font-size: 13pt; display: block; margin-bottom: 0.3rem; }
    .problem-title { font-weight: 600; font-size: 11pt; margin-bottom: 0.3rem; }
    .problem-statement { line-height: 1.75; }
    .problem-meta { font-size: 9pt; color: #666; margin-top: 0.3rem; }
    .problem-answer { margin-top: 0.7rem; padding: 0.4rem 0.75rem; background: #f5f5f5; border-left: 3px solid #333; font-size: 10pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="date">${escapeHtml(date)}</p>
  ${problemsHtml}
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function buildProblemHtml(p: ProblemCard, num: number, showAnswers: boolean): string {
  const meta = [p.competition, p.source_year, p.competition_level]
    .filter(Boolean)
    .join(" · ");
  const titleHtml = renderLatexToHtml(p.title);
  const statementHtml = renderLatexToHtml(p.statement);
  const answerBlock =
    showAnswers && p.answer
      ? `<div class="problem-answer"><strong>Answer:</strong> ${renderLatexToHtml(p.answer)}</div>`
      : "";
  return `
<div class="problem">
  <span class="problem-num">Problem ${num}.</span>
  <div class="problem-title">${titleHtml}</div>
  <div class="problem-statement">${statementHtml}</div>
  ${answerBlock}
  ${meta ? `<div class="problem-meta">${escapeHtml(meta)}</div>` : ""}
</div>`;
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function exportMarkdown({ title, showAnswers, problems }: ExportOptions): void {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# ${title}`,
    ``,
    `*${date}*`,
    ``,
    `---`,
    ``,
  ];

  problems.forEach((p, i) => {
    lines.push(`## Problem ${i + 1}`);
    lines.push(``);
    lines.push(`**${p.title}**`);
    lines.push(``);
    lines.push(p.statement);
    lines.push(``);
    if (showAnswers && p.answer) {
      lines.push(`> **Answer:** ${p.answer}`);
      lines.push(``);
    }
    const meta = [p.competition, p.source_year, p.competition_level]
      .filter(Boolean)
      .join(" · ");
    if (meta) {
      lines.push(`*${meta}*`);
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
  });

  downloadText(lines.join("\n"), `${slugify(title)}.md`, "text/markdown");
}

// ─── LaTeX ───────────────────────────────────────────────────────────────────

function exportLatex({ title, showAnswers, problems }: ExportOptions): void {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const problemBlocks = problems.map((p, i) => {
    const meta = [p.competition, p.source_year, p.competition_level]
      .filter(Boolean)
      .join(", ");
    const answerLine =
      showAnswers && p.answer
        ? `\n\\medskip\n\\textbf{Answer:} ${latexEscape(p.answer)}\n`
        : "";
    const metaLine = meta ? `\n{\\small\\textit{${latexEscape(meta)}}}\n` : "";

    return [
      `\\begin{problem}{${i + 1}}`,
      `\\textbf{${latexEscape(p.title)}}`,
      ``,
      p.statement,
      answerLine,
      metaLine,
      `\\end{problem}`,
    ].join("\n");
  });

  const tex = `\\documentclass[12pt]{article}
\\usepackage[margin=2cm]{geometry}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{parskip}

% Problem environment
\\newcounter{problemcounter}
\\newenvironment{problem}[1]{%
  \\stepcounter{problemcounter}%
  \\medskip\\noindent\\textbf{Problem #1.}\\quad
}{\\par}

\\begin{document}

\\begin{center}
  {\\LARGE\\bfseries ${latexEscape(title)}}\\\\[0.4em]
  {\\normalsize ${latexEscape(date)}}
\\end{center}

\\bigskip

${problemBlocks.join("\n\n")}

\\end{document}
`;

  downloadText(tex, `${slugify(title)}.tex`, "application/x-tex");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function latexEscape(text: string): string {
  // Only escape chars that are NOT already inside $...$ math
  return text.replace(/(?<![\\$])[&%#_{}~^]/g, (ch) => `\\${ch}`);
}
