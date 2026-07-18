import styles from "./TaxonomyTag.module.css";

interface Props {
  readonly code: string;
  readonly name: string;
  readonly kind: "topic" | "technique" | "subtopic";
  readonly onClick?: (code: string) => void;
}

/** Map topic code prefix to colour class */
function topicColorClass(code: string): string {
  const prefix = code.split("-")[0]?.toUpperCase() ?? "";
  const map: Record<string, string> = {
    NT: styles.nt,
    GEO: styles.geo,
    ALG: styles.alg,
    COMB: styles.comb,
    NUM: styles.nt,
    COM: styles.comb,
  };
  return map[prefix] ?? styles.default;
}

export function TaxonomyTag({ code, name, kind, onClick }: Props) {
  const colorClass = kind === "topic" ? topicColorClass(code) : styles.technique;

  if (onClick) {
    return (
      <button
        className={`${styles.tag} ${colorClass}`}
        onClick={() => onClick(code)}
        type="button"
        title={code}
      >
        {name}
      </button>
    );
  }

  return (
    <span className={`${styles.tag} ${colorClass}`} title={code}>
      {name}
    </span>
  );
}
