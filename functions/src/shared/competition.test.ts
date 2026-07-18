import { describe, it, expect } from "vitest";
import { resolveCompetition, parseOlympiadBenchFilename } from "./competition";

describe("resolveCompetition", () => {
  it("resolves lowercase imo", () => {
    const result = resolveCompetition("imo");
    expect(result).toEqual({ abbreviation: "IMO", level: "international" });
  });

  it("is case-insensitive", () => {
    const result = resolveCompetition("USAMO");
    expect(result?.abbreviation).toBe("USAMO");
  });

  it("handles underscore variants", () => {
    const result = resolveCompetition("imo_shortlist");
    expect(result?.abbreviation).toBe("ISL");
  });

  it("returns null for unknown competition", () => {
    expect(resolveCompetition("unknown_competition_xyz")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(resolveCompetition(null)).toBeNull();
  });
});

describe("parseOlympiadBenchFilename", () => {
  it("parses IMO_2019_P4", () => {
    const result = parseOlympiadBenchFilename("IMO_2019_P4");
    expect(result).toEqual({ competition: "IMO", year: 2019, round: "P4" });
  });

  it("parses USAMO_2020_3", () => {
    const result = parseOlympiadBenchFilename("USAMO_2020_3");
    expect(result).toEqual({ competition: "USAMO", year: 2020, round: "3" });
  });

  it("returns nulls for unrecognised pattern", () => {
    const result = parseOlympiadBenchFilename("random_filename");
    expect(result).toEqual({ competition: null, year: null, round: null });
  });
});
