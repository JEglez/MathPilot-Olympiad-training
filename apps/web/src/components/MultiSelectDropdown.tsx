import { useEffect, useRef, useState } from "react";

interface Option {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
}

interface Props {
  readonly label: string;
  readonly options: Option[];
  readonly selected: string[];
  readonly onToggle: (value: string) => void;
  readonly onClear: () => void;
}

export function MultiSelectDropdown({ label, options, selected, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const count = selected.length;
  const isActive = count > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: isActive ? "#FFFBEB" : "#fff",
          color: isActive ? "#92400E" : "#64748B",
          border: isActive ? "1.5px solid #FCD34D" : "1.5px solid #E2E8F0",
        }}
      >
        {label}
        {count > 0 && (
          <span
            className="flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
            style={{ background: "#F59E0B", color: "#fff" }}
          >
            {count}
          </span>
        )}
        <span style={{ opacity: 0.5, fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden min-w-[180px] max-h-60 overflow-y-auto"
          style={{ background: "#fff", border: "1.5px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        >
          {isActive && (
            <button
              type="button"
              onClick={() => { onClear(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold border-b transition-colors hover:bg-amber-50"
              style={{ color: "#92400E", borderColor: "#FEF3C7" }}
            >
              Clear all ×
            </button>
          )}
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-slate-50 min-h-[36px]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="rounded"
                  style={{ accentColor: "#F59E0B" }}
                />
                <span className="flex-1 text-xs font-medium" style={{ color: checked ? "#0F172A" : "#475569" }}>
                  {opt.label}
                </span>
                {opt.count !== undefined && (
                  <span className="text-[9px] font-mono" style={{ color: "#94A3B8" }}>{opt.count}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
