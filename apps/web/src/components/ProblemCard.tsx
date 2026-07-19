import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import type { ProblemCard as ProblemCardType } from "../services/api";
import { renderLatexToHtml } from "../utils/render-latex";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { TaxonomyTag } from "./TaxonomyTag";

interface Props {
  readonly problem: ProblemCardType;
  readonly onSelect?: (id: string) => void;
}

type LevelVariant = "local" | "state" | "national" | "international";

function levelVariant(level: string | null | undefined): LevelVariant {
  const l = (level ?? "").toLowerCase();
  if (l === "local") return "local";
  if (l === "state") return "state";
  if (l === "national") return "national";
  if (l === "international") return "international";
  return "local";
}

export function ProblemCard({ problem, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);

  const statementHtml = renderLatexToHtml(problem.statement);
  const titleHtml = renderLatexToHtml(problem.title);

  return (
    <Card className={cn(
      "group transition-all duration-150 border-border",
      "hover:border-teal hover:shadow-sm"
    )}>
      <CardHeader className="pb-2">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {problem.competition_level && (
            <Badge variant={levelVariant(problem.competition_level)}>
              {problem.competition_level}
            </Badge>
          )}
          {problem.competition && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wide">
              {problem.competition}
            </span>
          )}
          {problem.source_year !== null && (
            <span className="text-xs text-muted-foreground">{problem.source_year}</span>
          )}
          {problem.search_score !== undefined && (
            <Badge variant="score" className="ml-auto">
              {(problem.search_score * 100).toFixed(0)}% match
            </Badge>
          )}
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold leading-snug m-0">
          {onSelect ? (
            <button
              className="text-left text-foreground hover:text-teal transition-colors bg-transparent border-0 p-0 font-semibold text-base leading-snug cursor-pointer"
              onClick={() => onSelect(problem.id)}
              type="button"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          ) : (
            <Link
              to={`/problems/${problem.id}`}
              className="text-foreground hover:text-teal transition-colors no-underline hover:no-underline"
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          )}
        </h2>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Problem statement */}
        <div
          className="text-sm text-foreground/90 leading-relaxed line-clamp-3 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: statementHtml }}
        />
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/60">
        <div className="flex flex-wrap gap-1.5">
          {problem.topics.map((t) => (
            <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="topic" />
          ))}
          {problem.techniques.map((t) => (
            <TaxonomyTag key={t.code} code={t.code} name={t.name} kind="technique" />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-foreground h-8 px-2"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
          aria-expanded={expanded}
        >
          {expanded ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Details</>}
        </Button>
      </CardFooter>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border/60 pt-4 space-y-3">
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
          <Link to={`/problems/${problem.id}`} className="text-sm font-medium text-secondary hover:underline">
            View full problem →
          </Link>
        </div>
      )}
    </Card>
  );
}
