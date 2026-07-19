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
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { margin: 2.8cm 3cm; }

    body {
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 11.5pt;
      color: #111;
      line-height: 1;
      background: #fff;
    }

    /* ── Cover ── */
    .cover {
      text-align: center;
      margin-bottom: 2.8rem;
      padding-bottom: 1.2rem;
      border-bottom: 2px solid #111;
    }
    .cover h1 {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin-bottom: 0.4rem;
    }
    .cover .date {
      font-size: 10pt;
      color: #555;
      font-style: italic;
    }

    /* ── Problems ── */
    .problem {
      margin-bottom: 2.6rem;
      page-break-inside: avoid;
    }
    .problem + .problem {
      padding-top: 2rem;
      border-top: 1px solid #ddd;
    }
    .problem-num {
      display: block;
      font-weight: 700;
      font-size: 12.5pt;
      margin-bottom: 0.65rem;
    }
    .problem-statement {
      line-height: 1.85;
      font-size: 11.5pt;
    }
    /* KaTeX display blocks — add breathing room */
    .problem-statement .katex-display {
      margin: 0.8rem 0;
    }

    /* ── Answer block ── */
    .problem-answer {
      margin-top: 1rem;
      padding: 0.5rem 0.9rem;
      background: #f6f6f6;
      border-left: 3px solid #555;
      font-size: 10.5pt;
      line-height: 1.6;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(title)}</h1>
    <span class="date">${escapeHtml(date)}</span>
  </div>
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
      ? `<div class="problem-answer"><strong>Answer:</strong> ${renderLatexToHtml(p.answer)}</div>`
      : "";
  return `
<div class="problem">
  <span class="problem-num">Problem ${num}.</span>
  <div class="problem-statement">${statementHtml}</div>
  ${answerBlock}
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
    lines.push(p.statement);
    lines.push(``);
    if (showAnswers && p.answer) {
      lines.push(`> **Answer:** ${p.answer}`);
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
    const answerLine =
      showAnswers && p.answer
        ? `\n\\medskip\n\\textbf{Answer:} ${latexEscape(p.answer)}\n`
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
