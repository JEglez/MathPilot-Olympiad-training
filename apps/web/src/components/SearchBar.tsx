import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

interface Props {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly debounceMs?: number;
  readonly className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search problems…", debounceMs = 300, className }: Props) {
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
    <div className={cn("relative", className)}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        className="flex h-11 w-full rounded-xl border border-border bg-card px-4 pl-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-shadow"
        type="search"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search"
      />
    </div>
  );
}
