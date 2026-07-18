-- Migration: 005_create_search_indexes
-- HNSW and GIN indexes — run AFTER bulk insert for faster build
-- Per 02-mvp-architecture.md §3.5 and 03-dataset-import-search.md §7.0

BEGIN;

-- HNSW index for vector similarity search (cosine distance)
-- m=16, ef_construction=64 per architecture spec
CREATE INDEX idx_problems_vector ON problems
  USING hnsw (statement_vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search (tsvector)
CREATE INDEX idx_problems_search ON problems USING gin (search_tsv);

-- Update statistics for query planner after bulk load
ANALYZE problems;
ANALYZE problem_topics;
ANALYZE problem_subtopics;
ANALYZE problem_techniques;
ANALYZE import_records;

COMMIT;
