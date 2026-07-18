-- Migration: 002_create_problems
-- Problem corpus: competitions, problems, solutions, translations, relationships
-- Includes pgvector (statement_vector) and tsvector (search_tsv) columns
-- Per 02-mvp-architecture.md §3.5 and 03-dataset-import-search.md §7.0

BEGIN;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE competitions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  abbreviation          TEXT NOT NULL UNIQUE,   -- "IMO", "USAMO"
  country               TEXT NOT NULL DEFAULT '',
  level                 TEXT NOT NULL CHECK (level IN ('local','state','national','international')),
  typical_position_count INT,
  description           TEXT NOT NULL DEFAULT '',
  website_url           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE problems (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                        TEXT NOT NULL,
  statement                    TEXT NOT NULL,       -- LaTeX
  statement_plain              TEXT,                -- LaTeX-stripped, for tsvector
  answer                       TEXT,
  source_competition_id        UUID REFERENCES competitions(id),
  source_year                  INT,
  source_round                 TEXT,                -- "P3", "Shortlist C5"
  language                     TEXT NOT NULL DEFAULT 'en',

  -- Taxonomy complexity dimensions (domain-model.md §5)
  competition_level            TEXT CHECK (competition_level IN ('local','state','national','international')),
  position_in_paper            TEXT CHECK (position_in_paper IN ('early','middle','late')),
  technique_depth              TEXT CHECK (technique_depth IN ('single','compound','synthesis')),
  creativity_demand            TEXT CHECK (creativity_demand IN ('routine','insightful','inventive','breakthrough')),
  proof_style                  TEXT CHECK (proof_style IN ('computation','existence','construction','bound','characterisation','impossibility')),
  entry_barrier                TEXT CHECK (entry_barrier IN ('transparent','camouflaged','deceptive')),

  estimated_solve_time_minutes INT,
  elegance_rating              FLOAT,
  status                       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
  needs_review                 BOOLEAN NOT NULL DEFAULT false,

  reviewed_at                  TIMESTAMPTZ,
  reviewed_by                  UUID,              -- FK to users (post-MVP)

  -- pgvector column for semantic similarity search
  statement_vector             vector(1536),

  -- tsvector for full-text search (GENERATED ALWAYS from title + statement_plain)
  -- title weighted A (higher), statement_plain weighted B
  search_tsv                   tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(statement_plain, '')), 'B')
  ) STORED,

  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE solutions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  approach_name   TEXT NOT NULL,          -- "Solution 1", "Via inversion"
  body            TEXT NOT NULL,          -- LaTeX
  is_canonical    BOOLEAN NOT NULL DEFAULT false,
  elegance_rating FLOAT,
  author          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE problem_translations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id   UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  language     TEXT NOT NULL,
  title        TEXT NOT NULL,
  statement    TEXT NOT NULL,
  translated_by TEXT NOT NULL DEFAULT 'ai',
  verified     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (problem_id, language)
);

CREATE TABLE problem_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_a_id      UUID NOT NULL REFERENCES problems(id),
  problem_b_id      UUID NOT NULL REFERENCES problems(id),
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('similar','easier_variant','harder_variant','prerequisite','dual','generalisation')),
  strength          FLOAT NOT NULL DEFAULT 0.5,
  explanation       TEXT,
  detected_by       TEXT NOT NULL CHECK (detected_by IN ('ai','human_coach','community')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (problem_a_id <> problem_b_id)
);

CREATE INDEX idx_problems_competition  ON problems (source_competition_id);
CREATE INDEX idx_problems_status       ON problems (status);
CREATE INDEX idx_problems_level        ON problems (competition_level);
CREATE INDEX idx_problems_year         ON problems (source_year);
CREATE INDEX idx_problems_language     ON problems (language);
CREATE INDEX idx_problems_proof_style  ON problems (proof_style);
CREATE INDEX idx_solutions_problem     ON solutions (problem_id);
CREATE INDEX idx_translations_problem  ON problem_translations (problem_id);

COMMIT;
