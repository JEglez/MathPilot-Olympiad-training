import { cn } from "../lib/utils";

interface Props {
  readonly code: string;
  readonly name: string;
  readonly kind: "topic" | "technique" | "subtopic";
  readonly onClick?: (code: string) => void;
}

function topicClass(code: string): string {
  const prefix = code.split("-")[0]?.toUpperCase() ?? "";
  const map: Record<string, string> = {
    NT:   "bg-blue-50 text-blue-700 border-blue-200",
    GEO:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    ALG:  "bg-amber-50 text-amber-700 border-amber-200",
    COMB: "bg-purple-50 text-purple-700 border-purple-200",
    NUM:  "bg-blue-50 text-blue-700 border-blue-200",
    COM:  "bg-purple-50 text-purple-700 border-purple-200",
    GAME: "bg-rose-50 text-rose-700 border-rose-200",
    MISC: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return map[prefix] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

const baseClass = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition-colors";

export function TaxonomyTag({ code, name, kind, onClick }: Props) {
  const colorClass = kind === "topic" ? topicClass(code) : "bg-teal/10 text-teal border-teal/20";

  if (onClick) {
    return (
      <button
        className={cn(baseClass, colorClass, "cursor-pointer hover:opacity-80")}
        onClick={() => onClick(code)}
        type="button"
        title={code}
      >
        {name}
      </button>
    );
  }
  return <span className={cn(baseClass, colorClass)} title={code}>{name}</span>;
}

