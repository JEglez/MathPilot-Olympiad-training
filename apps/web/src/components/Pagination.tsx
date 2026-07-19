import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface Props {
  readonly page: number;
  readonly total: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function pageNumbers(): number[] {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);
    for (let i = start; i <= end; i++) range.push(i);
    if (start > 1) range.unshift(-1, 1);
    if (end < totalPages) range.push(-2, totalPages);
    return range;
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-4" aria-label="Pagination">
      <Button variant="outline" size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1} type="button" aria-label="Previous page">
        ←
      </Button>

      {pageNumbers().map((n, i) => {
        if (n < 0) return <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">…</span>;
        return (
          <button key={n} type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPageChange(n)}
            className={cn(
              "h-9 min-w-[36px] px-3 rounded-lg text-sm font-medium transition-colors",
              n === page
                ? "bg-teal text-white"
                : "text-foreground hover:bg-muted border border-border"
            )}>
            {n}
          </button>
        );
      })}

      <Button variant="outline" size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages} type="button" aria-label="Next page">
        →
      </Button>
    </nav>
  );
}
