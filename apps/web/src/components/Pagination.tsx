import styles from "./Pagination.module.css";

interface Props {
  readonly page: number;
  readonly total: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  // Show at most 7 page buttons, centered around current page
  function pageNumbers(): number[] {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);

    for (let i = start; i <= end; i++) range.push(i);

    if (start > 1) range.unshift(-1, 1); // -1 = ellipsis
    if (end < totalPages) range.push(-2, totalPages); // -2 = ellipsis

    return range;
  }

  return (
    <nav className={styles.nav} aria-label="Pagination">
      <button
        className={styles.btn}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        type="button"
        aria-label="Previous page"
      >
        ←
      </button>

      {pageNumbers().map((n, i) => {
        if (n < 0) {
          return (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>
              …
            </span>
          );
        }
        return (
          <button
            key={n}
            className={`${styles.btn} ${n === page ? styles.active : ""}`}
            onClick={() => onPageChange(n)}
            type="button"
            aria-current={n === page ? "page" : undefined}
          >
            {n}
          </button>
        );
      })}

      <button
        className={styles.btn}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        type="button"
        aria-label="Next page"
      >
        →
      </button>
    </nav>
  );
}
