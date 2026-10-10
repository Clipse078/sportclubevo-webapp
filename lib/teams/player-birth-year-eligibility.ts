import {
  getAllowedBirthYearsForSeason,
  getSeasonStartYearFromDate,
  normalizeJuniorCategoryCode,
  type JuniorCategoryCode,
} from "@/lib/teams/jahrgang-rules";

export type TeamBirthYearEligibilityMode =
  | "JUNIOR_BIRTH_YEAR"
  | "UNRESTRICTED"
  | "CONFIG_INCOMPLETE";

export type PlayerBirthYearEligibilityKind =
  | "ELIGIBLE"
  | "MISSING_PERSON_DOB"
  | "INVALID_PERSON_DOB"
  | "BIRTH_YEAR_OUTSIDE_RANGE"
  | "TEAM_CONFIG_INCOMPLETE"
  | "UNRESTRICTED";

export type TeamBirthYearEligibilityContext = {
  mode: TeamBirthYearEligibilityMode;
  rawAgeGroup: string | null;
  normalizedJuniorCode: JuniorCategoryCode | null;
  allowedBirthYears: number[];
};

export type PlayerBirthYearEligibilityResult = {
  ok: boolean;
  kind: PlayerBirthYearEligibilityKind;
  allowedBirthYears: number[];
  birthYear: number | null;
  teamContext: TeamBirthYearEligibilityContext;
};

function normalizeAgeGroupToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace("-", "");
}

/** Junior team labels that look like category codes but are not canonical (e.g. F2 vs F). */
export function looksLikeMalformedJuniorAgeGroup(
  value: string | null | undefined,
): boolean {
  const normalized = normalizeAgeGroupToken(value);
  if (!normalized) {
    return false;
  }

  if (normalizeJuniorCategoryCode(normalized)) {
    return false;
  }

  return /^[A-G]\d+$/.test(normalized);
}

export function isKnownUnrestrictedAdultAgeGroupLabel(
  value: string | null | undefined,
): boolean {
  const normalized = normalizeAgeGroupToken(value);
  if (!normalized) {
    return true;
  }

  if (/^\d+\+$/.test(normalized)) {
    return true;
  }

  return (
    normalized === "AKTIVE" ||
    normalized === "SENIOREN" ||
    normalized === "FRAUEN" ||
    normalized === "TRAININGSGRUPPE" ||
    normalized === "KINDERFUSSBALL"
  );
}

export function resolveTeamBirthYearEligibility(args: {
  categoryCode: string | null | undefined;
  seasonStartDate: string | Date;
}): TeamBirthYearEligibilityContext {
  const rawAgeGroup = String(args.categoryCode ?? "").trim() || null;
  const normalizedJuniorCode = normalizeJuniorCategoryCode(args.categoryCode);
  const seasonStartYear = getSeasonStartYearFromDate(args.seasonStartDate);

  if (normalizedJuniorCode) {
    if (seasonStartYear === null) {
      return {
        mode: "CONFIG_INCOMPLETE",
        rawAgeGroup,
        normalizedJuniorCode,
        allowedBirthYears: [],
      };
    }

    const allowedBirthYears = getAllowedBirthYearsForSeason(
      args.categoryCode,
      args.seasonStartDate,
    );

    if (allowedBirthYears.length === 0) {
      return {
        mode: "CONFIG_INCOMPLETE",
        rawAgeGroup,
        normalizedJuniorCode,
        allowedBirthYears: [],
      };
    }

    return {
      mode: "JUNIOR_BIRTH_YEAR",
      rawAgeGroup,
      normalizedJuniorCode,
      allowedBirthYears,
    };
  }

  if (!rawAgeGroup) {
    return {
      mode: "UNRESTRICTED",
      rawAgeGroup,
      normalizedJuniorCode: null,
      allowedBirthYears: [],
    };
  }

  if (looksLikeMalformedJuniorAgeGroup(rawAgeGroup)) {
    return {
      mode: "CONFIG_INCOMPLETE",
      rawAgeGroup,
      normalizedJuniorCode: null,
      allowedBirthYears: [],
    };
  }

  if (isKnownUnrestrictedAdultAgeGroupLabel(rawAgeGroup)) {
    return {
      mode: "UNRESTRICTED",
      rawAgeGroup,
      normalizedJuniorCode: null,
      allowedBirthYears: [],
    };
  }

  // Free-form provider or display labels (e.g. competition names) — no birth-year gate.
  return {
    mode: "UNRESTRICTED",
    rawAgeGroup,
    normalizedJuniorCode: null,
    allowedBirthYears: [],
  };
}

export function evaluatePlayerBirthYearEligibility(args: {
  categoryCode: string | null | undefined;
  seasonStartDate: string | Date;
  birthDate: string | Date | null | undefined;
}): PlayerBirthYearEligibilityResult {
  const teamContext = resolveTeamBirthYearEligibility({
    categoryCode: args.categoryCode,
    seasonStartDate: args.seasonStartDate,
  });

  if (teamContext.mode === "UNRESTRICTED") {
    return {
      ok: true,
      kind: "UNRESTRICTED",
      allowedBirthYears: [],
      birthYear: extractBirthYear(args.birthDate),
      teamContext,
    };
  }

  if (teamContext.mode === "CONFIG_INCOMPLETE") {
    return {
      ok: false,
      kind: "TEAM_CONFIG_INCOMPLETE",
      allowedBirthYears: teamContext.allowedBirthYears,
      birthYear: extractBirthYear(args.birthDate),
      teamContext,
    };
  }

  const allowedBirthYears = teamContext.allowedBirthYears;

  if (!args.birthDate) {
    return {
      ok: false,
      kind: "MISSING_PERSON_DOB",
      allowedBirthYears,
      birthYear: null,
      teamContext,
    };
  }

  const birthDate = new Date(args.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    return {
      ok: false,
      kind: "INVALID_PERSON_DOB",
      allowedBirthYears,
      birthYear: null,
      teamContext,
    };
  }

  const birthYear = birthDate.getUTCFullYear();
  if (!allowedBirthYears.includes(birthYear)) {
    return {
      ok: false,
      kind: "BIRTH_YEAR_OUTSIDE_RANGE",
      allowedBirthYears,
      birthYear,
      teamContext,
    };
  }

  return {
    ok: true,
    kind: "ELIGIBLE",
    allowedBirthYears,
    birthYear,
    teamContext,
  };
}

function extractBirthYear(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) {
    return null;
  }

  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getUTCFullYear();
}

/** @deprecated Prefer evaluatePlayerBirthYearEligibility — kept for incremental migration. */
export function isBirthYearAllowedForTeamSeason(args: {
  categoryCode: string | null | undefined;
  seasonStartDate: string | Date;
  birthDate: string | Date | null | undefined;
}) {
  const result = evaluatePlayerBirthYearEligibility(args);

  if (result.ok) {
    return {
      ok: true as const,
      reason: null,
      allowedBirthYears: result.allowedBirthYears,
      birthYear: result.birthYear,
      kind: result.kind,
    };
  }

  const reasonByKind: Record<
    Exclude<PlayerBirthYearEligibilityKind, "ELIGIBLE" | "UNRESTRICTED">,
    string
  > = {
    MISSING_PERSON_DOB: "Kein Geburtsdatum vorhanden.",
    INVALID_PERSON_DOB: "Ungültiges Geburtsdatum.",
    BIRTH_YEAR_OUTSIDE_RANGE: "Geburtsjahr nicht für diese Team-Saison zugelassen.",
    TEAM_CONFIG_INCOMPLETE: "Team-Altersregel unvollständig konfiguriert.",
  };

  return {
    ok: false as const,
    reason: reasonByKind[result.kind as keyof typeof reasonByKind],
    allowedBirthYears: result.allowedBirthYears,
    birthYear: result.birthYear,
    kind: result.kind,
  };
}
