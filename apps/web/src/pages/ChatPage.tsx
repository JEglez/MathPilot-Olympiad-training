import { useState } from "react";
import type { SearchFilters } from "../services/api";
import { ChatPanel } from "../components/ChatPanel";
import { FilterPanel } from "../components/FilterPanel";
import styles from "./ChatPage.module.css";

export function ChatPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [chatFilters, setChatFilters] = useState<Omit<SearchFilters, "q" | "page" | "page_size">>({});

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Find Olympiad Problems</h1>
        <button
          className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ""}`}
          onClick={() => setShowFilters((prev) => !prev)}
          type="button"
        >
          ⚙ Context filters {showFilters ? "▲" : "▼"}
        </button>
      </div>

      {showFilters && (
        <div className={styles.filterBox}>
          <p className={styles.filterHint}>
            Filters below restrict the problems the AI retrieves as context for your question.
          </p>
          <FilterPanel
            filters={chatFilters}
            onChange={({ topics, subtopics, techniques, level, competition, year_min, year_max }) =>
              setChatFilters({ topics, subtopics, techniques, level, competition, year_min, year_max })
            }
          />
        </div>
      )}

      <ChatPanel filters={chatFilters} />
    </div>
  );
}
