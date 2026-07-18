-- Seed: Competitions (common olympiad competitions referenced in datasets)
-- Extend as needed; abbreviation is the natural key

INSERT INTO competitions (abbreviation, name, level, is_active) VALUES
  ('IMO',      'International Mathematical Olympiad',         'international', true),
  ('USAMO',    'USA Mathematical Olympiad',                   'national',      true),
  ('AIME',     'American Invitational Mathematics Exam',      'national',      true),
  ('AMC',      'American Mathematics Competition',            'national',      true),
  ('PUTNAM',   'William Lowell Putnam Competition',           'national',      true),
  ('ISL',      'IMO Shortlist',                               'international', true),
  ('APMO',     'Asian Pacific Mathematics Olympiad',          'international', true),
  ('BMO',      'British Mathematical Olympiad',               'national',      true),
  ('CMO',      'Canadian Mathematical Olympiad',              'national',      true),
  ('RMO',      'Romanian Mathematical Olympiad',              'national',      true),
  ('OMM',      'Olimpiada Mexicana de Matemáticas',           'national',      true),
  ('OMEGAL',   'Olimpiada Estatal de Matemáticas (México)',   'state',         true),
  ('USAJMO',   'USA Junior Mathematical Olympiad',            'national',      true),
  ('HMMT',     'Harvard-MIT Mathematics Tournament',          'national',      true),
  ('PUMAC',    'Princeton University Mathematics Competition','national',      true),
  ('ARML',     'American Regions Mathematics League',         'national',      true),
  ('MOP',      'Mathematical Olympiad Program (USA)',         'national',      true),
  ('CGMO',     'China Girls Math Olympiad',                   'international', true),
  ('BALKAN',   'Balkan Mathematical Olympiad',                'international', true),
  ('JBMO',     'Junior Balkan Mathematical Olympiad',         'international', true),
  ('EGMO',     'European Girls Mathematical Olympiad',        'international', true),
  ('MEMO',     'Middle European Mathematical Olympiad',       'international', true),
  ('NORDIC',   'Nordic Mathematical Contest',                 'international', true),
  ('SHORTLIST','Competition Shortlist (generic)',             'international', true)
ON CONFLICT (abbreviation) DO NOTHING;
