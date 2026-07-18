-- Migration: 004_create_import_tables
-- Import tracking: import_runs, import_records
-- Per 03-dataset-import-search.md §6

BEGIN;

CREATE TABLE import_runs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset          TEXT NOT NULL,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at            TIMESTAMPTZ,
  total_records           INT NOT NULL DEFAULT 0,
  imported                INT NOT NULL DEFAULT 0,
  duplicates_skipped      INT NOT NULL DEFAULT 0,
  classification_failures INT NOT NULL DEFAULT 0,
  parse_errors            INT NOT NULL DEFAULT 0,
  flagged_for_review      INT NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id       UUID NOT NULL REFERENCES problems(id),
  source_dataset   TEXT NOT NULL,
  external_id      TEXT NOT NULL,
  dedup_hash       TEXT NOT NULL,
  source_subject   TEXT,
  source_difficulty FLOAT,
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source_dataset, external_id),
  UNIQUE (dedup_hash)
);

CREATE INDEX idx_import_records_problem ON import_records (problem_id);
CREATE INDEX idx_import_dedup           ON import_records (dedup_hash);
CREATE INDEX idx_import_records_source  ON import_records (source_dataset);

COMMIT;
