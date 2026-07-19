// Exports approved problems as PDF (browser print), Markdown, or LaTeX.
// PDF uses KaTeX-rendered math; Markdown/LaTeX keep raw $...$ notation.

import type { ProblemCard } from "../services/api";
import { renderLatexToHtml } from "./render-latex";

export type ExportFormat = "pdf" | "md" | "latex";

export interface ExportOptions {
  readonly organization: string;
  readonly title: string;
  readonly date: string;
  readonly instructions: string;
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

function exportPdf({ organization, title, date, instructions, showAnswers, problems }: ExportOptions): void {
  const problemsHtml = problems
    .map((p, i) => buildProblemHtml(p, i + 1, showAnswers))
    .join("\n");

  const instrLines = instructions.trim()
    ? instructions.trim().split("\n")
        .map(l => `<li>${escapeHtml(l.trim())}</li>`)
        .join("\n")
    : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: letter; margin: 2.5cm 2.8cm; }

    body {
      font-family: "Times New Roman", "Georgia", serif;
      font-size: 11.5pt;
      color: #000;
      line-height: 1.45;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      margin-bottom: 1.2rem;
    }
    .header .org {
      font-size: 11.5pt;
      font-weight: 700;
      display: block;
      margin-bottom: 0.15rem;
    }
    .header .exam-title {
      font-size: 11.5pt;
      font-weight: 400;
      display: block;
      margin-bottom: 0.15rem;
    }
    .header .exam-date {
      font-size: 11.5pt;
      display: block;
    }

    /* ── Instructions ── */
    .instructions {
      margin: 0.9rem 0 1.4rem;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 0.55rem 0;
    }
    .instructions ul {
      list-style: none;
      padding: 0;
    }
    .instructions li {
      font-size: 11pt;
      line-height: 1.5;
    }
    .instructions li + li { margin-top: 0.1rem; }

    /* ── Problems ── */
    .problem {
      display: flex;
      gap: 0.55em;
      margin-bottom: 1.5rem;
      page-break-inside: avoid;
    }
    .problem-num {
      font-weight: 700;
      font-size: 11.5pt;
      flex-shrink: 0;
      min-width: 1.5em;
    }
    .problem-body {
      flex: 1;
      min-width: 0;
      line-height: 1.7;
      font-size: 11.5pt;
    }
    .problem-body .katex-display {
      margin: 0.6rem 0;
    }
    .problem-answer {
      margin-top: 0.7rem;
      padding: 0.4rem 0.75rem;
      background: #f5f5f5;
      border-left: 3px solid #555;
      font-size: 10.5pt;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${organization ? `<span class="org">${escapeHtml(organization)}</span>` : ""}
    <span class="exam-title">${escapeHtml(title)}</span>
    <span class="exam-date">${escapeHtml(date)}</span>
  </div>
  ${instrLines ? `<div class="instructions"><ul>${instrLines}</ul></div>` : ""}
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
  const statementHtml = renderLatexToHtml(p.statement);
  const answerBlock =
    showAnswers && p.answer
      ? `<div class="problem-answer"><strong>Respuesta:</strong> ${renderLatexToHtml(p.answer)}</div>`
      : "";
  return `
<div class="problem">
  <span class="problem-num">${num}.</span>
  <div class="problem-body">${statementHtml}${answerBlock}</div>
</div>`;
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function exportMarkdown({ organization, title, date, instructions, showAnswers, problems }: ExportOptions): void {
  const lines: string[] = [];

  if (organization) lines.push(`# ${organization}`, ``);
  lines.push(`## ${title}`, ``);
  lines.push(`*${date}*`, ``);

  if (instructions.trim()) {
    lines.push(`---`, ``);
    instructions.trim().split("\n").forEach(l => lines.push(l.trim()));
    lines.push(``, `---`, ``);
  }

  lines.push(``);

  problems.forEach((p, i) => {
    lines.push(`**${i + 1}.** ${p.statement}`);
    lines.push(``);
    if (showAnswers && p.answer) {
      lines.push(`> **Respuesta:** ${p.answer}`);
      lines.push(``);
    }
    lines.push(``);
  });

  downloadText(lines.join("\n"), `${slugify(title)}.md`, "text/markdown");
}

// ─── LaTeX ───────────────────────────────────────────────────────────────────

function exportLatex({ organization, title, date, instructions, showAnswers, problems }: ExportOptions): void {
  const instrBlock = instructions.trim()
    ? `\\begin{itemize}[noitemsep,topsep=2pt]\n` +
      instructions.trim().split("\n")
        .map(l => `  \\item ${latexEscape(l.trim())}`)
        .join("\n") +
      `\n\\end{itemize}\n`
    : "";

  const problemBlocks = problems.map((p, i) => {
    const answerLine =
      showAnswers && p.answer
        ? `\n\\medskip\n\\textbf{Respuesta:} ${latexEscape(p.answer)}\n`
        : "";
    return [
      `\\begin{problem}{${i + 1}}`,
      ``,
      p.statement,
      answerLine,
      `\\end{problem}`,
    ].join("\n");
  });

  const tex = `\\documentclass[12pt]{article}
\\usepackage[letterpaper, margin=2.5cm]{geometry}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{enumitem}
\\usepackage{parskip}

% Inline-numbered problem environment
\\newenvironment{problem}[1]{%
  \\noindent\\textbf{#1.}\\enspace
}{\\par\\medskip}

\\begin{document}

\\begin{center}
${organization ? `  {\\textbf{${latexEscape(organization)}}}\\\\[0.15em]\n` : ""
}  {${latexEscape(title)}}\\\\[0.15em]
  {${latexEscape(date)}}
\\end{center}

${instrBlock ? `\\vspace{0.4em}\\hrule\\vspace{0.4em}\n${instrBlock}\\hrule\\vspace{1em}` : "\\vspace{1em}"}

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
