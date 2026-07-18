// LaTeX rendering utility using KaTeX
// Splits text on delimiter boundaries and renders math segments.
// Supported delimiters: $$...$$, $...$, \[...\], \(...\)

import katex from "katex";

interface TextSegment {
  readonly kind: "text";
  readonly content: string;
}

interface InlineMathSegment {
  readonly kind: "inline";
  readonly content: string;
}

interface DisplayMathSegment {
  readonly kind: "display";
  readonly content: string;
}

type Segment = TextSegment | InlineMathSegment | DisplayMathSegment;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Split raw LaTeX-annotated text into plain-text and math segments. */
export function parseLatexSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Match all four delimiter styles in priority order:
  //   \[...\]  display   \\[\\s\\S]*?\\]
  //   \(...\)  inline    \\(.*?\\)
  //   $$...$$ display
  //   $...$   inline
  const pattern = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before.length > 0) {
      segments.push({ kind: "text", content: before });
    }

    const raw = match[0];
    if (raw.startsWith("\\[")) {
      segments.push({ kind: "display", content: raw.slice(2, -2) });
    } else if (raw.startsWith("\\(")) {
      segments.push({ kind: "inline", content: raw.slice(2, -2) });
    } else if (raw.startsWith("$$")) {
      segments.push({ kind: "display", content: raw.slice(2, -2) });
    } else {
      segments.push({ kind: "inline", content: raw.slice(1, -1) });
    }

    lastIndex = match.index + raw.length;
  }

  // Any remaining text (including truncated/unclosed delimiters) is emitted as plain text
  const remaining = text.slice(lastIndex);
  if (remaining.length > 0) {
    segments.push({ kind: "text", content: remaining });
  }

  return segments;
}

/** Render a LaTeX segment to an HTML string using KaTeX. Falls back to escaped raw on error. */
export function renderLatexSegment(segment: InlineMathSegment | DisplayMathSegment): string {
  try {
    return katex.renderToString(segment.content, {
      displayMode: segment.kind === "display",
      throwOnError: false,
      trust: true,
      output: "html",
    });
  } catch {
    return escapeHtml(segment.content);
  }
}

/** Render full text with LaTeX to an HTML string. */
export function renderLatexToHtml(text: string): string {
  const segments = parseLatexSegments(text);
  return segments
    .map((seg) => {
      if (seg.kind === "text") return escapeHtml(seg.content);
      return renderLatexSegment(seg);
    })
    .join("");
}
