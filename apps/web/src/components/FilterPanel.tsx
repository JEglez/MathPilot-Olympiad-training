import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SearchFilters, SubtopicNode, TaxonomyTree, TopicNode } from "../services/api";
import { getTaxonomy } from "../services/api";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

interface Props {
  readonly filters: SearchFilters;
  readonly onChange: (filters: SearchFilters) => void;
}

const LEVELS = ["local", "state", "national", "international"] as const;

const selectClass = "w-full h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary text-foreground";
const inputClass = "w-full h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary placeholder:text-muted-foreground";
const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

export function FilterPanel({ filters, onChange }: Props) {
  const [taxonomy, setTaxonomy] = useState<TaxonomyTree | null>(null);
  const [subtopics, setSubtopics] = useState<SubtopicNode[]>([]);

  useEffect(() => {
    getTaxonomy()
      .then((t) => setTaxonomy(t))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!taxonomy || !filters.topics?.length) { setSubtopics([]); return; }
    const topic: TopicNode | undefined = taxonomy.topics.find(
      (t) => filters.topics?.includes(t.code),
    );
    setSubtopics(topic?.subtopics ?? []);
  }, [taxonomy, filters.topics]);

  function set<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    onChange({ ...filters, [key]: value, page: 1 });
  }
  function clearFilters() { onChange({ page: 1, page_size: filters.page_size }); }

  const allTechniques = subtopics.flatMap((s) => s.techniques);

  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal size={15} />
          Filters
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={clearFilters} type="button">
          <X size={12} /> Clear
        </Button>
      </div>

      <Separator />

      <div className="space-y-1">
        <label className={labelClass} htmlFor="fp-topic">Topic</label>
        <select id="fp-topic" className={selectClass}
          value={filters.topics?.[0] ?? ""}
          onChange={(e) => set("topics", e.target.value ? [e.target.value] : undefined)}>
          <option value="">All topics</option>
          {(taxonomy?.topics ?? []).map((t) => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      </div>

      {subtopics.length > 0 && (
        <div className="space-y-1">
          <label className={labelClass} htmlFor="fp-subtopic">Subtopic</label>
          <select id="fp-subtopic" className={selectClass}
            value={filters.subtopics?.[0] ?? ""}
            onChange={(e) => set("subtopics", e.target.value ? [e.target.value] : undefined)}>
            <option value="">All subtopics</option>
            {subtopics.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {allTechniques.length > 0 && (
        <div className="space-y-1">
          <span className={labelClass}>Techniques</span>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {allTechniques.map((tech) => (
              <label key={tech.code} className="flex items-center gap-2 text-sm py-1 cursor-pointer min-h-[44px]">
                <input type="checkbox"
                  checked={filters.techniques?.includes(tech.code) ?? false}
                  onChange={(e) => {
                    const prev = filters.techniques ?? [];
                    const next = e.target.checked ? [...prev, tech.code] : prev.filter((c) => c !== tech.code);
                    set("techniques", next.length > 0 ? next : undefined);
                  }}
                  className="rounded border-border"
                />
                {tech.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-1">
        <label className={labelClass} htmlFor="fp-level">Level</label>
        <select id="fp-level" className={selectClass}
          value={filters.level ?? ""}
          onChange={(e) => set("level", e.target.value || undefined)}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="fp-competition">Competition</label>
        <input id="fp-competition" className={inputClass} type="text"
          placeholder="e.g. IMO, USAMO"
          value={filters.competition ?? ""}
          onChange={(e) => set("competition", e.target.value || undefined)} />
      </div>

      <div className="space-y-1">
        <span className={labelClass}>Year range</span>
        <div className="flex items-center gap-2">
          <input className={inputClass} type="number" placeholder="From"
            min={1900} max={2100} value={filters.year_min ?? ""}
            onChange={(e) => set("year_min", e.target.value ? Number(e.target.value) : undefined)} />
          <span className="text-muted-foreground text-sm">–</span>
          <input className={inputClass} type="number" placeholder="To"
            min={1900} max={2100} value={filters.year_max ?? ""}
            onChange={(e) => set("year_max", e.target.value ? Number(e.target.value) : undefined)} />
        </div>
      </div>
    </aside>
  );
}
