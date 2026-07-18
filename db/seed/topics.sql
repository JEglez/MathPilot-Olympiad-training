-- Seed: Topics (8 primary domains)
-- Source: docs/taxonomy.md Layer 1

INSERT INTO topics (code, name, description) VALUES
  ('ALG',    'Algebraic Structures & Manipulations',    'Equations, inequalities, polynomials, functional equations'),
  ('NT',     'Number Theory & Arithmetic',              'Divisibility, primes, modular arithmetic, p-adic valuations'),
  ('GEO-S',  'Synthetic & Projective Geometry',         'Angle chasing, collinearity, concurrence, projective methods'),
  ('GEO-A',  'Analytic & Transformational Geometry',    'Coordinates, complex numbers, inversions, spiral similarities'),
  ('COMB-E', 'Enumerative & Algebraic Combinatorics',   'Counting, generating functions, recurrences, bijections'),
  ('COMB-S', 'Structural & Extremal Combinatorics',     'Graph theory, Ramsey, extremal problems, combinatorial geometry'),
  ('GAME',   'Strategies, Algorithms & Games',          'Game theory, invariants, monovariants, greedy strategies, process analysis'),
  ('MISC',   'Cross-Domain & Unconventional',           'Problems that defy classification or blend 3+ domains')
ON CONFLICT (code) DO NOTHING;
