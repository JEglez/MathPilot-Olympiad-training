-- Migration: 003_create_join_tables
-- Many-to-many joins: problem ↔ taxonomy entities
-- Per domain-model.md §5 and 03-dataset-import-search.md §7.0

BEGIN;

CREATE TABLE problem_topics (
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  topic_id   UUID NOT NULL REFERENCES topics(id),
  PRIMARY KEY (problem_id, topic_id)
);

CREATE TABLE problem_subtopics (
  problem_id  UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id),
  PRIMARY KEY (problem_id, subtopic_id)
);

CREATE TABLE problem_techniques (
  problem_id   UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES techniques(id),
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (problem_id, technique_id)
);

CREATE TABLE problem_learning_objectives (
  problem_id           UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  learning_objective_id UUID NOT NULL REFERENCES learning_objectives(id),
  PRIMARY KEY (problem_id, learning_objective_id)
);

CREATE TABLE solution_techniques (
  solution_id  UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES techniques(id),
  PRIMARY KEY (solution_id, technique_id)
);

-- Indexes for fast taxonomy filtering (03-dataset-import-search.md §7.0)
CREATE INDEX idx_problem_topics_problem     ON problem_topics (problem_id);
CREATE INDEX idx_problem_topics_topic       ON problem_topics (topic_id);
CREATE INDEX idx_problem_subtopics_problem  ON problem_subtopics (problem_id);
CREATE INDEX idx_problem_subtopics_subtopic ON problem_subtopics (subtopic_id);
CREATE INDEX idx_problem_techniques_problem ON problem_techniques (problem_id);
CREATE INDEX idx_problem_techniques_tech    ON problem_techniques (technique_id);

COMMIT;
