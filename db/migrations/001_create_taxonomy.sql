-- Migration: 001_create_taxonomy
-- Taxonomy reference data: Topics, Subtopics, Techniques, LearningObjectives
-- Forward-only migration (architecture-principles.md §4)

BEGIN;

CREATE TABLE topics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,         -- "ALG", "NT", "GEO-S"
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  icon         TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subtopics (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id               UUID NOT NULL REFERENCES topics(id),
  code                   TEXT NOT NULL UNIQUE,     -- "NT-DIV", "ALG-INQ"
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  prerequisite_subtopics UUID[] NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE techniques (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_subtopic_id     UUID NOT NULL REFERENCES subtopics(id),
  code                    TEXT NOT NULL UNIQUE,     -- "T-PHP", "T-FLT"
  name                    TEXT NOT NULL,
  description             TEXT NOT NULL DEFAULT '',
  canonical_statement     TEXT NOT NULL DEFAULT '',
  cognitive_load          TEXT NOT NULL CHECK (cognitive_load IN ('foundational','intermediate','advanced','elite')),
  prerequisite_techniques UUID[] NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning_objectives (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id        UUID NOT NULL REFERENCES techniques(id),
  code                TEXT NOT NULL UNIQUE,         -- "LO-PHP-01"
  statement           TEXT NOT NULL,
  bloom_level         TEXT NOT NULL CHECK (bloom_level IN ('remember','understand','apply','analyse','evaluate','create')),
  assessment_criteria TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common lookup patterns
CREATE INDEX idx_subtopics_topic     ON subtopics (topic_id);
CREATE INDEX idx_techniques_subtopic ON techniques (primary_subtopic_id);
CREATE INDEX idx_los_technique       ON learning_objectives (technique_id);

COMMIT;
