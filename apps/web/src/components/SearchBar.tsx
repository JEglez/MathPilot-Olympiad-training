import { useEffect, useRef } from "react";
import styles from "./SearchBar.module.css";

interface Props {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly debounceMs?: number;
}

export function SearchBar({ value, onChange, placeholder = "Search problems…", debounceMs = 300 }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, debounceMs);
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon} aria-hidden="true">🔍</span>
      <input
        className={styles.input}
        type="search"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search"
      />
    </div>
  );
}
