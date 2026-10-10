/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01C-R2 — eligibility-aware target TeamSeason discovery.
 *
 * Player release ≠ sporting eligibility. This module applies only rules SCE can
 * establish from canonical tenant/season/team/person data (birth-year bands,
 * team category, gender group labels). Unknown or incomplete config is never
 * surfaced as ELIGIBLE.
 */

import type { TeamCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  evaluatePlayerBirthYearEligibility,
  isKnownUnrestrictedAdultAgeGroupLabel,
  resolveTeamBirthYearEligibility,
} from "@/lib/teams/player-birth-year-eligibility";
import { PlayerReleaseValidationError } from "@/lib/match-squad/player-release-errors";
import { normalizeJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";

export type PlayerReleaseTargetEligibilityState = "ELIGIBLE" | "INELIGIBLE" | "UNKNOWN";

export type PlayerReleaseTargetDiscoveryReason =
  | "SAME_SOURCE"
  | "INACTIVE_TEAM_SEASON"
  | "INACTIVE_TEAM"
  | "DIFFERENT_SEASON"
  | "DIFFERENT_TENANT"
  | "BIRTH_YEAR_OUTSIDE_RANGE"
  | "CATEGORY_MISMATCH"
  | "GENDER_GROUP_MISMATCH"
  | "TEAM_CONFIG_INCOMPLETE"
  | "MISSING_PERSON_DOB"
  | "UNRESTRICTED_PLAUSIBLE"
  | "JUNIOR_BIRTH_YEAR_ELIGIBLE";

export type PlayerReleaseTargetDiscoveryRow = {
  teamSeasonId: string;
  teamId: string;
  label: string;
  secondaryLabel: string | null;
  category: TeamCategory | null;
  ageGroup: string | null;
  genderGroup: string | null;
  eligibilityState: PlayerReleaseTargetEligibilityState;
  reasons: PlayerReleaseTargetDiscoveryReason[];
};

export type PlayerReleaseTargetPickerOption = {
  teamSeasonId: string;
  teamId: string;
  label: string;
  secondaryLabel: string | null;
  category?: string;
  genderGroup?: string | null;
};

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

function normalizeGenderToken(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

const ADULT_TEAM_CATEGORIES = new Set<TeamCategory>([
  "AKTIVE",
  "FRAUEN",
  "SENIOREN",
]);

const JUNIOR_TEAM_CATEGORIES = new Set<TeamCategory>(["JUNIOREN", "KINDERFUSSBALL"]);

function isCategoryPlausibleForSource(input: {
  sourceCategory: TeamCategory;
  sourceAgeGroup: string | null;
  targetCategory: TeamCategory;
  targetAgeGroup: string | null;
}): { ok: boolean; reason?: PlayerReleaseTargetDiscoveryReason } {
  if (JUNIOR_TEAM_CATEGORIES.has(input.sourceCategory)) {
    if (ADULT_TEAM_CATEGORIES.has(input.targetCategory)) {
      return { ok: false, reason: "CATEGORY_MISMATCH" };
    }
    if (input.targetCategory === "TRAININGSGRUPPE") {
      return { ok: true };
    }
    const sourceJunior = normalizeJuniorCategoryCode(input.sourceAgeGroup);
    const targetJunior = normalizeJuniorCategoryCode(input.targetAgeGroup);
    if (sourceJunior && targetJunior && sourceJunior !== targetJunior) {
      // Adjacent junior bands (e.g. B → B2 team labels) remain plausible within club;
      // only hard-exclude when target is clearly adult-labelled age group text.
      if (isKnownUnrestrictedAdultAgeGroupLabel(input.targetAgeGroup)) {
        return { ok: false, reason: "CATEGORY_MISMATCH" };
      }
    }
    return { ok: true };
  }

  if (ADULT_TEAM_CATEGORIES.has(input.sourceCategory)) {
    if (JUNIOR_TEAM_CATEGORIES.has(input.targetCategory)) {
      return { ok: false, reason: "CATEGORY_MISMATCH" };
    }
  }

  return { ok: true };
}

function evaluateTargetRow(input: {
  personBirthDate: Date | null;
  seasonStartDate: Date;
  sourceTeamSeasonId: string;
  sourceCategory: TeamCategory;
  sourceAgeGroup: string | null;
  sourceGenderGroup: string | null;
  target: {
    id: string;
    teamId: string;
    displayName: string;
    shortName: string | null;
    status: string;
    seasonId: string;
    team: {
      id: string;
      name: string;
      shortName: string | null;
      isActive: boolean;
      tenantId: string | null;
      category: TeamCategory;
      ageGroup: string | null;
      genderGroup: string | null;
    };
  };
}): PlayerReleaseTargetDiscoveryRow {
  const reasons: PlayerReleaseTargetDiscoveryReason[] = [];
  let eligibilityState: PlayerReleaseTargetEligibilityState = "UNKNOWN";

  const label = teamSeasonLabel(input.target);
  const secondaryParts = [
    input.target.team.ageGroup?.trim() || null,
    input.target.team.genderGroup?.trim() || null,
  ].filter(Boolean);
  const secondaryLabel = secondaryParts.length > 0 ? secondaryParts.join(" · ") : null;

  if (input.target.id === input.sourceTeamSeasonId) {
    return {
      teamSeasonId: input.target.id,
      teamId: input.target.team.id,
      label,
      secondaryLabel,
      category: input.target.team.category,
      ageGroup: input.target.team.ageGroup,
      genderGroup: input.target.team.genderGroup,
      eligibilityState: "INELIGIBLE",
      reasons: ["SAME_SOURCE"],
    };
  }

  if (input.target.status !== "ACTIVE") {
    return {
      teamSeasonId: input.target.id,
      teamId: input.target.team.id,
      label,
      secondaryLabel,
      category: input.target.team.category,
      ageGroup: input.target.team.ageGroup,
      genderGroup: input.target.team.genderGroup,
      eligibilityState: "INELIGIBLE",
      reasons: ["INACTIVE_TEAM_SEASON"],
    };
  }

  if (!input.target.team.isActive) {
    return {
      teamSeasonId: input.target.id,
      teamId: input.target.team.id,
      label,
      secondaryLabel,
      category: input.target.team.category,
      ageGroup: input.target.team.ageGroup,
      genderGroup: input.target.team.genderGroup,
      eligibilityState: "INELIGIBLE",
      reasons: ["INACTIVE_TEAM"],
    };
  }

  const categoryCheck = isCategoryPlausibleForSource({
    sourceCategory: input.sourceCategory,
    sourceAgeGroup: input.sourceAgeGroup,
    targetCategory: input.target.team.category,
    targetAgeGroup: input.target.team.ageGroup,
  });
  if (!categoryCheck.ok) {
    return {
      teamSeasonId: input.target.id,
      teamId: input.target.team.id,
      label,
      secondaryLabel,
      category: input.target.team.category,
      ageGroup: input.target.team.ageGroup,
      genderGroup: input.target.team.genderGroup,
      eligibilityState: "INELIGIBLE",
      reasons: [categoryCheck.reason ?? "CATEGORY_MISMATCH"],
    };
  }

  const sourceGender = normalizeGenderToken(input.sourceGenderGroup);
  const targetGender = normalizeGenderToken(input.target.team.genderGroup);
  if (sourceGender && targetGender && sourceGender !== targetGender) {
    return {
      teamSeasonId: input.target.id,
      teamId: input.target.team.id,
      label,
      secondaryLabel,
      category: input.target.team.category,
      ageGroup: input.target.team.ageGroup,
      genderGroup: input.target.team.genderGroup,
      eligibilityState: "INELIGIBLE",
      reasons: ["GENDER_GROUP_MISMATCH"],
    };
  }

  const birthYearEval = evaluatePlayerBirthYearEligibility({
    categoryCode: input.target.team.ageGroup,
    seasonStartDate: input.seasonStartDate,
    birthDate: input.personBirthDate,
  });

  if (birthYearEval.kind === "ELIGIBLE") {
    eligibilityState = "ELIGIBLE";
    reasons.push("JUNIOR_BIRTH_YEAR_ELIGIBLE");
  } else if (birthYearEval.kind === "UNRESTRICTED") {
    eligibilityState = "ELIGIBLE";
    reasons.push("UNRESTRICTED_PLAUSIBLE");
  } else if (
    birthYearEval.kind === "BIRTH_YEAR_OUTSIDE_RANGE" ||
    birthYearEval.kind === "INVALID_PERSON_DOB"
  ) {
    eligibilityState = "INELIGIBLE";
    reasons.push("BIRTH_YEAR_OUTSIDE_RANGE");
  } else if (birthYearEval.kind === "MISSING_PERSON_DOB") {
    const targetContext = resolveTeamBirthYearEligibility({
      categoryCode: input.target.team.ageGroup,
      seasonStartDate: input.seasonStartDate,
    });
    if (targetContext.mode === "JUNIOR_BIRTH_YEAR") {
      eligibilityState = "UNKNOWN";
      reasons.push("MISSING_PERSON_DOB");
    } else if (targetContext.mode === "CONFIG_INCOMPLETE") {
      eligibilityState = "UNKNOWN";
      reasons.push("TEAM_CONFIG_INCOMPLETE");
    } else {
      eligibilityState = "ELIGIBLE";
      reasons.push("UNRESTRICTED_PLAUSIBLE");
    }
  } else if (birthYearEval.kind === "TEAM_CONFIG_INCOMPLETE") {
    eligibilityState = "UNKNOWN";
    reasons.push("TEAM_CONFIG_INCOMPLETE");
  }

  return {
    teamSeasonId: input.target.id,
    teamId: input.target.team.id,
    label,
    secondaryLabel,
    category: input.target.team.category,
    ageGroup: input.target.team.ageGroup,
    genderGroup: input.target.team.genderGroup,
    eligibilityState,
    reasons,
  };
}

export async function resolvePlayerReleaseTargetTeams(input: {
  tenantId: string;
  personId: string;
  sourceTeamSeasonId: string;
  /** When set, defaults to season start of the source TeamSeason. */
  referenceDate?: Date;
  /** Default: only ELIGIBLE targets (never falsely claim unknown as eligible). */
  includeUnknown?: boolean;
  includeIneligible?: boolean;
}): Promise<PlayerReleaseTargetDiscoveryRow[]> {
  const source = await prisma.teamSeason.findFirst({
    where: {
      id: input.sourceTeamSeasonId,
      team: { tenantId: input.tenantId },
    },
    select: {
      id: true,
      seasonId: true,
      team: {
        select: {
          category: true,
          ageGroup: true,
          genderGroup: true,
        },
      },
      season: { select: { startDate: true } },
    },
  });
  if (!source) {
    return [];
  }

  const person = await prisma.person.findFirst({
    where: { id: input.personId, tenantId: input.tenantId },
    select: { dateOfBirth: true },
  });
  if (!person) {
    return [];
  }

  const candidates = await prisma.teamSeason.findMany({
    where: {
      seasonId: source.seasonId,
      team: { tenantId: input.tenantId },
    },
    select: {
      id: true,
      teamId: true,
      displayName: true,
      shortName: true,
      status: true,
      seasonId: true,
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          isActive: true,
          tenantId: true,
          category: true,
          ageGroup: true,
          genderGroup: true,
        },
      },
    },
    orderBy: [{ team: { name: "asc" } }, { displayName: "asc" }],
  });

  const seasonStartDate = source.season.startDate;
  const rows = candidates.map((target) =>
    evaluateTargetRow({
      personBirthDate: person.dateOfBirth,
      seasonStartDate,
      sourceTeamSeasonId: source.id,
      sourceCategory: source.team.category,
      sourceAgeGroup: source.team.ageGroup,
      sourceGenderGroup: source.team.genderGroup,
      target,
    }),
  );

  return rows.filter((row) => {
    if (row.eligibilityState === "ELIGIBLE") return true;
    if (row.eligibilityState === "UNKNOWN" && input.includeUnknown) return true;
    if (row.eligibilityState === "INELIGIBLE" && input.includeIneligible) return true;
    return false;
  });
}

export function mapTargetDiscoveryToPickerOptions(
  rows: PlayerReleaseTargetDiscoveryRow[],
): PlayerReleaseTargetPickerOption[] {
  return rows
    .filter((row) => row.eligibilityState === "ELIGIBLE")
    .map((row) => ({
      teamSeasonId: row.teamSeasonId,
      teamId: row.teamId,
      label: row.label,
      secondaryLabel: row.secondaryLabel,
      category: row.category ?? undefined,
      genderGroup: row.genderGroup,
    }));
}

export async function assertPlayerReleaseTargetEligible(input: {
  tenantId: string;
  personId: string;
  sourceTeamSeasonId: string;
  targetTeamSeasonId: string;
}): Promise<void> {
  const rows = await resolvePlayerReleaseTargetTeams({
    tenantId: input.tenantId,
    personId: input.personId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    includeUnknown: false,
    includeIneligible: true,
  });
  const match = rows.find((row) => row.teamSeasonId === input.targetTeamSeasonId);
  if (!match || match.eligibilityState !== "ELIGIBLE") {
    throw new PlayerReleaseValidationError(
      "Zielteam ist für diesen Spieler nicht als passendes Zielteam erkannt.",
      "INVALID_TARGET",
    );
  }
}
