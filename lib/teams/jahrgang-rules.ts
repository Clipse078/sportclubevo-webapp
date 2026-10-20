import {
  getCanonicalSwissFootballSeasonLabelFromSeasonStartDate,
  getSwissFootballSeasonStartYearFromDate,
} from "@/lib/seasons/season-logic";

export type JuniorCategoryCode =
  | "G"
  | "F"
  | "E"
  | "D7"
  | "D9"
  | "C"
  | "B"
  | "A";

const BASE_JAHRGANG_BY_CODE: Record<JuniorCategoryCode, number[]> = {
  G: [2019, 2020],
  F: [2017, 2018],
  E: [2015, 2016],
  D7: [2013, 2014],
  D9: [2012, 2013],
  C: [2010, 2011],
  B: [2007, 2008, 2009],
  A: [2005, 2006, 2007],
};

const BASE_SEASON_START_YEAR = 2025;

function normalizeAgeGroupToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

export function normalizeJuniorCategoryCode(
  value: string | null | undefined
): JuniorCategoryCode | null {
  const normalized = normalizeAgeGroupToken(value);

  if (normalized === "G") return "G";
  if (normalized === "F") return "F";
  if (normalized === "E") return "E";
  if (normalized === "D7") return "D7";
  if (normalized === "D9") return "D9";
  if (normalized === "C") return "C";
  if (normalized === "B") return "B";
  if (normalized === "A") return "A";

  return null;
}

/**
 * Resolves junior category from one structured team label (`ageGroup`, `shortName`, `alternativeName`).
 * Handles squad stufe tokens (E1 / F2), tenant short names (`Junioren E1`), and D-7 / D-9 labels.
 */
export function resolveStructuredJuniorCategoryFromAgeGroup(
  value: string | null | undefined,
): JuniorCategoryCode | null {
  const direct = normalizeJuniorCategoryCode(value);
  if (direct) return direct;

  const normalized = normalizeAgeGroupToken(value);
  if (!normalized) return null;

  const squadMatch = /^([GFEACB])(\d+)$/.exec(normalized);
  if (squadMatch) {
    return squadMatch[1] as JuniorCategoryCode;
  }

  if (normalized.includes("D7")) return "D7";
  if (normalized.includes("D9")) return "D9";

  const juniorPrefixMatch = /(?:JUNIOREN|JUNIORINNEN)([GFEACB])\d*/.exec(normalized);
  if (juniorPrefixMatch) {
    return juniorPrefixMatch[1] as JuniorCategoryCode;
  }

  const femaleFormatMatch = /([GFE])FF\d+/.exec(normalized);
  if (femaleFormatMatch) {
    return femaleFormatMatch[1] as JuniorCategoryCode;
  }

  return null;
}

/** Authoritative junior code for tournament composer category resolution. */
export function resolveAuthoritativeTeamJuniorCategoryCode(team: {
  ageGroup: string | null | undefined;
  shortName?: string | null | undefined;
  alternativeName?: string | null | undefined;
}): JuniorCategoryCode | null {
  for (const field of [team.ageGroup, team.alternativeName, team.shortName]) {
    const resolved = resolveStructuredJuniorCategoryFromAgeGroup(field);
    if (resolved) return resolved;
  }
  return null;
}

export function getSeasonStartYearFromDate(
  dateInput: string | Date
): number | null {
  return getSwissFootballSeasonStartYearFromDate(dateInput);
}

export function getCanonicalSeasonLabel(
  seasonStartDate: string | Date
): string | null {
  return getCanonicalSwissFootballSeasonLabelFromSeasonStartDate(seasonStartDate);
}

export function getAllowedBirthYearsForSeason(
  categoryCode: string | null | undefined,
  seasonStartDate: string | Date
): number[] {
  const normalizedCode = normalizeJuniorCategoryCode(categoryCode);
  const seasonStartYear = getSeasonStartYearFromDate(seasonStartDate);

  if (!normalizedCode || seasonStartYear === null) {
    return [];
  }

  const shift = seasonStartYear - BASE_SEASON_START_YEAR;

  return BASE_JAHRGANG_BY_CODE[normalizedCode].map((year) => year + shift);
}

