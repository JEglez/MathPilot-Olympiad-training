-- Seed: Subtopics (50 subtopics across 8 domains)
-- Source: docs/taxonomy.md Layer 2
-- Inserts in dependency order: topics must exist first (run topics.sql first)

INSERT INTO subtopics (code, name, topic_id)
SELECT s.code, s.name, t.id
FROM (VALUES
  -- ALG subtopics
  ('ALG-MAN',     'Algebraic Manipulation & Simplification',    'ALG'),
  ('ALG-EQN',     'Equations & Linear Systems',                 'ALG'),
  ('ALG-BAS-INQ', 'Elementary Inequalities & Ordering',         'ALG'),
  ('ALG-PAT',     'Patterns, Telescoping & Clever Arithmetic',  'ALG'),
  ('ALG-PROG',    'Arithmetic & Geometric Progressions',        'ALG'),
  ('ALG-POL',     'Polynomials & Roots',                        'ALG'),
  ('ALG-INQ',     'Classical Inequalities',                     'ALG'),
  ('ALG-SYS',     'Nonlinear & Symmetric Systems',              'ALG'),
  ('ALG-SEQ',     'Sequences & Recurrences',                    'ALG'),
  ('ALG-IND',     'Mathematical Induction (Algebraic)',         'ALG'),
  ('ALG-SUM',     'Summation & Manipulation of Sums',           'ALG'),
  ('ALG-FEQ',     'Functional Equations',                       'ALG'),
  ('ALG-ADV-INQ', 'Advanced Inequalities',                      'ALG'),
  ('ALG-SET',     'Algebraic Structures',                       'ALG'),
  -- NT subtopics
  ('NT-BAS',      'Integer Properties & Parity',                'NT'),
  ('NT-DIV',      'Divisibility & GCD',                         'NT'),
  ('NT-PRM-BAS',  'Prime Numbers & Factorisation',              'NT'),
  ('NT-MOD-BAS',  'Introduction to Modular Arithmetic',         'NT'),
  ('NT-DIO-BAS',  'Elementary Diophantine Equations',           'NT'),
  ('NT-MOD',      'Modular Arithmetic (Full)',                   'NT'),
  ('NT-PRM',      'Advanced Prime Theory',                      'NT'),
  ('NT-DIO',      'Diophantine Equations (Full)',                'NT'),
  ('NT-MUL',      'Multiplicative Functions',                   'NT'),
  ('NT-VAL',      'Valuations & Local Methods',                 'NT'),
  ('NT-QR',       'Quadratic Residues & Reciprocity',           'NT'),
  ('NT-CON',      'Constructions in Number Theory',             'NT'),
  -- GEO-S subtopics
  ('GEO-S-FUN',     'Euclidean Fundamentals',                    'GEO-S'),
  ('GEO-S-TRI-BAS', 'Triangle Basics',                           'GEO-S'),
  ('GEO-S-QUAD',    'Quadrilaterals & Polygons',                 'GEO-S'),
  ('GEO-S-CIR-BAS', 'Circle Basics',                             'GEO-S'),
  ('GEO-S-AREA',    'Areas & Geometric Measurement',             'GEO-S'),
  ('GEO-S-TRI',     'Triangle Geometry (Advanced)',              'GEO-S'),
  ('GEO-S-CIR',     'Circles & Cyclic Quadrilaterals',           'GEO-S'),
  ('GEO-S-ANG',     'Angle Chasing (Directed Angles)',           'GEO-S'),
  ('GEO-S-COL',     'Collinearity & Concurrence',                'GEO-S'),
  ('GEO-S-PRJ',     'Projective Methods',                        'GEO-S'),
  ('GEO-S-3D',      'Solid Geometry',                            'GEO-S'),
  -- GEO-A subtopics
  ('GEO-A-BAS',     'Basic Coordinate Geometry',                 'GEO-A'),
  ('GEO-A-TRN-BAS', 'Elementary Transformations',                'GEO-A'),
  ('GEO-A-CRD',     'Coordinate Methods (Full)',                  'GEO-A'),
  ('GEO-A-TRN',     'Geometric Transformations (Full)',           'GEO-A'),
  ('GEO-A-VEC',     'Vector Methods',                             'GEO-A'),
  ('GEO-A-CPX',     'Complex Numbers in Geometry',               'GEO-A'),
  ('GEO-A-INV',     'Inversion',                                  'GEO-A'),
  ('GEO-A-BARY',    'Barycentric Coordinates',                   'GEO-A'),
  -- COMB-E subtopics
  ('COMB-E-BAS', 'Counting Principles',                          'COMB-E'),
  ('COMB-E-PC',  'Permutations & Combinations',                  'COMB-E'),
  ('COMB-E-BIN', 'Binomial Theorem & Pascal''s Triangle',        'COMB-E'),
  ('COMB-E-CNT', 'Advanced Counting',                            'COMB-E'),
  ('COMB-E-BIJ', 'Bijections & Combinatorial Identities',        'COMB-E'),
  ('COMB-E-REC', 'Combinatorial Recurrences',                    'COMB-E'),
  ('COMB-E-GEN', 'Generating Functions',                         'COMB-E'),
  ('COMB-E-PRB', 'Probabilistic & Expected Value Arguments',     'COMB-E'),
  ('COMB-E-ALG', 'Algebraic Combinatorics',                      'COMB-E'),
  -- COMB-S subtopics
  ('COMB-S-PHP',     'Pigeonhole Principle',                     'COMB-S'),
  ('COMB-S-GRP-BAS', 'Introduction to Graph Theory',             'COMB-S'),
  ('COMB-S-GRP',     'Graph Theory (Full)',                       'COMB-S'),
  ('COMB-S-EXT',     'Extremal Combinatorics',                   'COMB-S'),
  ('COMB-S-CGE',     'Combinatorial Geometry',                   'COMB-S'),
  ('COMB-S-RAM-BAS', 'Ramsey Theory (Introduction)',             'COMB-S'),
  ('COMB-S-RAM',     'Ramsey Theory (Full)',                      'COMB-S'),
  ('COMB-S-SET',     'Set Systems & Designs',                    'COMB-S'),
  ('COMB-S-ORD',     'Partially Ordered Sets',                   'COMB-S'),
  -- GAME subtopics
  ('GAME-PAR',     'Parity & Simple Invariants',                 'GAME'),
  ('GAME-NIMBASIC','Simple Game Analysis',                       'GAME'),
  ('GAME-CON-BAS', 'Elementary Constructions',                   'GAME'),
  ('GAME-INV',     'Invariants (Full)',                           'GAME'),
  ('GAME-MON',     'Monovariants & Potential Functions',         'GAME'),
  ('GAME-ALG',     'Algorithmic Processes',                      'GAME'),
  ('GAME-STR',     'Game Strategy (Full)',                       'GAME'),
  ('GAME-CON',     'Advanced Constructions',                     'GAME')
) AS s(code, name, topic_code)
JOIN topics t ON t.code = s.topic_code
ON CONFLICT (code) DO NOTHING;
