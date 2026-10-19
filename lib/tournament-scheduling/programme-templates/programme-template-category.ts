import {
  resolveStructuredJuniorCategoryFromAgeGroup,
  type JuniorCategoryCode,
} from "@/lib/teams/jahrgang-rules";
import type { ProgrammeTemplateCategoryContext } from "./types";

export type ProgrammeCategoryResolutionSource =
  | "TEAM_AGE_GROUP"
  | "MIXED_OR_UNKNOWN"
  | "NO_TEAM_PARTICIPANTS";

export type ResolvedProgrammeCategoryContext = {
  categoryContext: ProgrammeTemplateCategoryContext | null;
  source: ProgrammeCategoryResolutionSource;
};

function juniorCodeToCategoryContext(code: JuniorCategoryCode | null): ProgrammeTemplateCategoryContext | null {
  if (code === "G") return "G";
  if (code === "F") return "F";
  if (code === "E") return "E_FF12";
  return null;
}

function resolveJuniorCodeFromStructuredAgeGroup(
  value: string | null | undefined,
): JuniorCategoryCode | null {
  return resolveStructuredJuniorCategoryFromAgeGroup(value);
}

/**
 * Derives programme category from structured team age groups only — never from display names.
 */
export function resolveProgrammeCategoryFromTeamAgeGroups(
  ageGroups: readonly (string | null | undefined)[],
): ResolvedProgrammeCategoryContext {
  const contexts = new Set<ProgrammeTemplateCategoryContext>();
  for (const ageGroup of ageGroups) {
    const mapped = juniorCodeToCategoryContext(resolveJuniorCodeFromStructuredAgeGroup(ageGroup));
    if (mapped) contexts.add(mapped);
  }
  if (contexts.size === 1) {
    return {
      categoryContext: [...contexts][0]!,
      source: "TEAM_AGE_GROUP",
    };
  }
  if (contexts.size === 0) {
    return { categoryContext: null, source: ageGroups.length === 0 ? "NO_TEAM_PARTICIPANTS" : "MIXED_OR_UNKNOWN" };
  }
  return { categoryContext: null, source: "MIXED_OR_UNKNOWN" };
}

export function resolveProgrammeCategoryFromComposerParticipants(input: {
  participants: readonly {
    kind: string;
    teamId?: string;
    teamAgeGroup?: string | null;
    teamJuniorCategoryCode?: JuniorCategoryCode | null;
  }[];
  teamAgeGroupById: ReadonlyMap<string, string | null | undefined>;
  teamJuniorCategoryById?: ReadonlyMap<string, JuniorCategoryCode | null | undefined>;
}): ResolvedProgrammeCategoryContext {
  const juniorCodes: (JuniorCategoryCode | null | undefined)[] = [];
  for (const participant of input.participants) {
    if (participant.kind !== "TEAM") continue;
    if (participant.teamJuniorCategoryCode) {
      juniorCodes.push(participant.teamJuniorCategoryCode);
      continue;
    }
    if (participant.teamAgeGroup !== undefined && participant.teamAgeGroup !== null) {
      juniorCodes.push(resolveJuniorCodeFromStructuredAgeGroup(participant.teamAgeGroup));
      continue;
    }
    if (!participant.teamId) continue;
    const fromLookup = input.teamJuniorCategoryById?.get(participant.teamId);
    if (fromLookup) {
      juniorCodes.push(fromLookup);
      continue;
    }
    juniorCodes.push(resolveJuniorCodeFromStructuredAgeGroup(input.teamAgeGroupById.get(participant.teamId)));
  }
  if (juniorCodes.length === 0) {
    return { categoryContext: null, source: "NO_TEAM_PARTICIPANTS" };
  }

  const contexts = new Set<ProgrammeTemplateCategoryContext>();
  for (const code of juniorCodes) {
    const mapped = juniorCodeToCategoryContext(code ?? null);
    if (mapped) contexts.add(mapped);
  }
  if (contexts.size === 1) {
    return { categoryContext: [...contexts][0]!, source: "TEAM_AGE_GROUP" };
  }
  if (contexts.size === 0) {
    return { categoryContext: null, source: "MIXED_OR_UNKNOWN" };
  }
  return { categoryContext: null, source: "MIXED_OR_UNKNOWN" };
}
