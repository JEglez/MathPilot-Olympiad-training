import { useEffect, useState } from "react";
import type { SearchFilters, SubtopicNode, TaxonomyTree, TopicNode } from "../services/api";
import { getTaxonomy } from "../services/api";
import styles from "./FilterPanel.module.css";

interface Props {
  readonly filters: SearchFilters;
  readonly onChange: (filters: SearchFilters) => void;
}

const LEVELS = ["local", "state", "national", "international"] as const;

export function FilterPanel({ filters, onChange }: Props) {
  const [taxonomy, setTaxonomy] = useState<TaxonomyTree | null>(null);
  const [subtopics, setSubtopics] = useState<SubtopicNode[]>([]);

  useEffect(() => {
    getTaxonomy()
      .then((t) => setTaxonomy(t))
      .catch(() => {
        // Taxonomy load failure is non-fatal — filters still render without it
      });
  }, []);

  // Update subtopics when selected topic changes
  useEffect(() => {
    if (!taxonomy || !filters.topics?.length) {
      setSubtopics([]);
      return;
    }
    const topic: TopicNode | undefined = taxonomy.topics.find(
      (t) => filters.topics?.includes(t.code),
    );
    setSubtopics(topic?.subtopics ?? []);
  }, [taxonomy, filters.topics]);

  function set<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  function clearFilters() {
    onChange({ page: 1, page_size: filters.page_size });
  }

  const allTechniques = subtopics.flatMap((s) => s.techniques);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Filters</h3>
        <button className={styles.clearBtn} onClick={clearFilters} type="button">
          Clear
        </button>
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="fp-topic">Topic</label>
        <select
          id="fp-topic"
          className={styles.select}
          value={filters.topics?.[0] ?? ""}
          onChange={(e) =>
            set("topics", e.target.value ? [e.target.value] : undefined)
          }
        >
          <option value="">All topics</option>
          {(taxonomy?.topics ?? []).map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {subtopics.length > 0 && (
        <div className={styles.group}>
          <label className={styles.label} htmlFor="fp-subtopic">Subtopic</label>
          <select
            id="fp-subtopic"
            className={styles.select}
            value={filters.subtopics?.[0] ?? ""}
            onChange={(e) =>
              set("subtopics", e.target.value ? [e.target.value] : undefined)
            }
          >
            <option value="">All subtopics</option>
            {subtopics.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {allTechniques.length > 0 && (
        <div className={styles.group}>
          <label className={styles.label}>Techniques</label>
          <div className={styles.checkList}>
            {allTechniques.map((tech) => (
              <label key={tech.code} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={filters.techniques?.includes(tech.code) ?? false}
                  onChange={(e) => {
                    const prev = filters.techniques ?? [];
                    const next = e.target.checked
                      ? [...prev, tech.code]
                      : prev.filter((c) => c !== tech.code);
                    set("techniques", next.length > 0 ? next : undefined);
                  }}
                />
                {tech.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={styles.group}>
        <label className={styles.label} htmlFor="fp-level">Level</label>
        <select
          id="fp-level"
          className={styles.select}
          value={filters.level ?? ""}
          onChange={(e) => set("level", e.target.value || undefined)}
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="fp-competition">Competition</label>
        <input
          id="fp-competition"
          className={styles.input}
          type="text"
          placeholder="e.g. IMO, USAMO"
          value={filters.competition ?? ""}
          onChange={(e) => set("competition", e.target.value || undefined)}
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Year range</label>
        <div className={styles.yearRange}>
          <input
            className={styles.input}
            type="number"
            placeholder="From"
            min={1900}
            max={2100}
            value={filters.year_min ?? ""}
            onChange={(e) =>
              set("year_min", e.target.value ? Number(e.target.value) : undefined)
            }
          />
          <span className={styles.yearSep}>–</span>
          <input
            className={styles.input}
            type="number"
            placeholder="To"
            min={1900}
            max={2100}
            value={filters.year_max ?? ""}
            onChange={(e) =>
              set("year_max", e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>
      </div>
    </aside>
  );
}
