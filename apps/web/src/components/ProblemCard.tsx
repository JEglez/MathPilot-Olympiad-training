import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useProblemSet } from "../context/ProblemSetContext";
import type { ProblemCard as ProblemCardType } from "../services/api";
import { renderLatexToHtml } from "../utils/render-latex";
import { TaxonomyTag } from "./TaxonomyTag";

interface Props {
  readonly problem: ProblemCardType;
  readonly index?: number;
  readonly onSelect?: (id: string) => void;
}

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

export function ProblemCard({ problem, index, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { add, remove, has } = useProblemSet();
  const inSet = has(problem.id);

  function toggleSet() {
    if (inSet) remove(problem.id);
    else add(problem);
  }

  const statementHtml = renderLatexToHtml(problem.statement);
  const titleHtml = renderLatexToHtml(problem.title);
  const variant = levelVariant(problem.competition_level);
  const levelStyle = LEVEL_STYLES[variant];

  return (
    <div
      className={cn(
        "bg-card rounded-xl border transition-all duration-150 overflow-hidden",
        expanded ? "border-amber-300" : "border-border hover:border-amber-200"
      )}
      style={expanded ? { boxShadow: "0 2px 12px rgba(245,158,11,0.1)" } : {}}
    >
      {/* Main row: 3 columns */}
      <div className="grid gap-3 p-4 min-w-0" style={{ gridTemplateColumns: "32px minmax(0,1fr) 80px" }}>
        {/* Ordinal */}
        <div className="text-right pt-0.5">
          <span
            className="font-mono font-bold text-lg leading-none"
            style={{ color: "#E2E8F0" }}
          >
            {index !== undefined ? String(index + 1).padStart(2, "0") : "—"}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {problem.competition_level && (
              <span
                className="text-[9px] font-bold uppercase tracking-[0.07em] px-2 py-0.5 rounded"
                style={{ background: levelStyle.bg, color: levelStyle.text }}
              >
                {problem.competition_level}
              </span>
            )}
            {problem.competition && (
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                {problem.competition}
              </span>
            )}
            {problem.source_year !== null && (
              <span className="text-[10px]" style={{ color: "#CBD5E1" }}>{problem.source_year}</span>
            )}
            {problem.search_score !== undefined && (
              <span
                className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FCD34D" }}
              >
                {(problem.search_score * 100).toFixed(0)}% match
              </span>
            )}
          </div>

          {/* Title */}
          <div className="mb-2">
            {onSelect ? (
              <button
                className="text-left font-semibold text-sm leading-snug bg-transparent border-0 p-0 cursor-pointer transition-colors text-foreground hover:text-amber-600"
                onClick={() => onSelect(problem.id)}
                type="button"
                dangerouslySetInnerHTML={{ __html: titleHtml }}
              />
            ) : (
              <Link
                to={`/problems/${problem.id}`}
                className="font-semibold text-sm leading-snug text-foreground hover:text-amber-600 transition-colors"
                style={{ textDecoration: "none" }}
                dangerouslySetInnerHTML={{ __html: titleHtml }}
              />
            )}
          </div>

          {/* Statement preview */}
          <div
            className="text-xs leading-relaxed mb-2 overflow-hidden"
            style={{
              color: "#64748B",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: statementHtml }}
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {problem.topics.map((t) => (
              <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="topic" />
            ))}
            {problem.techniques.map((t) => (
              <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="technique" />
            ))}
          </div>
        </div>

        {/* Action column */}
        <div className="flex flex-col items-end gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: expanded ? "#FFFBEB" : "transparent",
              color: "#92400E",
              border: "1.5px solid #FCD34D",
            }}
          >
            {expanded ? "Close ↑" : "Details ↓"}
          </button>
          <button
            type="button"
            onClick={toggleSet}
            aria-pressed={inSet}
            aria-label={inSet ? "Remove from My Set" : "Add to My Set"}
            className={cn(
              "text-xs font-semibold px-3 rounded-lg transition-colors min-h-[44px]",
              inSet
                ? "bg-[#F59E0B] text-[#0F172A] border border-[#F59E0B]"
                : "bg-transparent border border-[#F59E0B] text-[#F59E0B]"
            )}
          >
            {inSet ? "✓ Set" : "+ Set"}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div
          className="px-5 pb-5 pt-4 space-y-3 border-t"
          style={{ borderColor: "#FEF3C7" }}
        >
          {problem.answer !== null && (
            <p className="text-sm">
              <span className="font-semibold">Answer: </span>
              <span dangerouslySetInnerHTML={{ __html: renderLatexToHtml(problem.answer) }} />
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {problem.proof_style && (
              <><dt className="text-muted-foreground font-medium">Proof style</dt><dd className="capitalize">{problem.proof_style}</dd></>
            )}
            {problem.creativity_demand && (
              <><dt className="text-muted-foreground font-medium">Creativity</dt><dd className="capitalize">{problem.creativity_demand}</dd></>
            )}
            {problem.technique_depth && (
              <><dt className="text-muted-foreground font-medium">Technique depth</dt><dd className="capitalize">{problem.technique_depth}</dd></>
            )}
            {problem.entry_barrier && (
              <><dt className="text-muted-foreground font-medium">Entry barrier</dt><dd className="capitalize">{problem.entry_barrier}</dd></>
            )}
          </dl>
          <Link
            to={`/problems/${problem.id}`}
            className="text-sm font-semibold hover:underline"
            style={{ color: "#D97706" }}
          >
            View full problem →
          </Link>
        </div>
      )}
    </div>
  );
}
