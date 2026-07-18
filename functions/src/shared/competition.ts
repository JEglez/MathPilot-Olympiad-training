// Competition name resolver — maps raw source strings to canonical Competition abbreviations
// Per 03-dataset-import-search.md §4.3

export interface ResolvedCompetition {
  readonly abbreviation: string;
  readonly level: "local" | "state" | "national" | "international";
}

/** Canonical lookup table — covers all 4 source datasets */
export const COMPETITION_MAP: Record<string, ResolvedCompetition> = {
  // Omni-MATH source codes
  imo:                               { abbreviation: "IMO",     level: "international" },
  imo_shortlist:                     { abbreviation: "ISL",     level: "international" },
  imol:                              { abbreviation: "IMO",     level: "international" },
  international_mathematical_olympiad: { abbreviation: "IMO",   level: "international" },
  usa_team_selection_test:           { abbreviation: "USATST",  level: "national" },
  china_team_selection_test:         { abbreviation: "CNTST",   level: "national" },
  putnam:                            { abbreviation: "PUTNAM",  level: "national" },
  usamo:                             { abbreviation: "USAMO",   level: "national" },
  usajmo:                            { abbreviation: "USAJMO",  level: "national" },
  china_national_olympiad:           { abbreviation: "CNMO",    level: "national" },
  apmo:                              { abbreviation: "APMO",    level: "international" },
  balkan_mo:                         { abbreviation: "BALKAN",  level: "international" },
  baltic_way:                        { abbreviation: "BWAY",    level: "international" },
  egmo:                              { abbreviation: "EGMO",    level: "international" },
  aime:                              { abbreviation: "AIME",    level: "national" },
  amc_8:                             { abbreviation: "AMC8",    level: "local" },
  amc_10:                            { abbreviation: "AMC10",   level: "local" },
  amc_12:                            { abbreviation: "AMC12",   level: "local" },
  hmmt:                              { abbreviation: "HMMT",    level: "national" },
  omm:                               { abbreviation: "OMM",     level: "national" },
  omm_regional:                      { abbreviation: "OMEGAL",  level: "state" },

  // OlympiadBench filename patterns
  comp:                              { abbreviation: "COMP",    level: "national" },

  // NuminaMath source categories
  olympiads:                         { abbreviation: "OLY",     level: "national" },
  amc_aime:                          { abbreviation: "AMC",     level: "local" },
};

/** Normalise source string to a lookup key */
function normaliseKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Resolve a raw competition string to a canonical abbreviation.
 * Returns null if unrecognised — caller should create a new competition row.
 */
export function resolveCompetition(raw: string | null | undefined): ResolvedCompetition | null {
  if (!raw) return null;
  const key = normaliseKey(raw);
  return COMPETITION_MAP[key] ?? null;
}

/** Extract competition abbreviation from OlympiadBench filename patterns like "IMO_2019_P4" */
export function parseOlympiadBenchFilename(filename: string): {
  competition: string | null;
  year: number | null;
  round: string | null;
} {
  // Pattern: {COMP}_{YEAR}_{ROUND} e.g. IMO_2019_P4, USAMO_2020_3
  const match = filename.match(/^([A-Z_]+?)_(\d{4})_(.+)$/i);
  if (!match) {
    return { competition: null, year: null, round: null };
  }
  const [, comp, yearStr, round] = match;
  return {
    competition: comp.toUpperCase(),
    year: parseInt(yearStr, 10),
    round: round,
  };
}
