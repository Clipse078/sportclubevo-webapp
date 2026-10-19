import { normalizeJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import type { ProgrammeTemplateCategoryContext } from "./types";

export type ProgrammeCategoryResolutionSource =
  | "TEAM_AGE_GROUP"
  | "MIXED_OR_UNKNOWN"
  | "NO_TEAM_PARTICIPANTS";

export type ResolvedProgrammeCategoryContext = {
  categoryContext: ProgrammeTemplateCategoryContext | null;
  source: ProgrammeCategoryResolutionSource;
};

function juniorCodeToCategoryContext(
  code: ReturnType<typeof normalizeJuniorCategoryCode>,
): ProgrammeTemplateCategoryContext | null {
  if (code === "G") return "G";
  if (code === "F") return "F";
  if (code === "E") return "E_FF12";
  return null;
}

/**
 * Derives programme category from structured team age groups only — never from display names.
 */
export function resolveProgrammeCategoryFromTeamAgeGroups(
  ageGroups: readonly (string | null | undefined)[],
): ResolvedProgrammeCategoryContext {
  const contexts = new Set<ProgrammeTemplateCategoryContext>();
  for (const ageGroup of ageGroups) {
    const mapped = juniorCodeToCategoryContext(normalizeJuniorCategoryCode(ageGroup));
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
  participants: readonly { kind: string; teamId?: string; teamAgeGroup?: string | null }[];
  teamAgeGroupById: ReadonlyMap<string, string | null | undefined>;
}): ResolvedProgrammeCategoryContext {
  const teamAgeGroups: (string | null | undefined)[] = [];
  for (const participant of input.participants) {
    if (participant.kind !== "TEAM") continue;
    if (participant.teamAgeGroup !== undefined && participant.teamAgeGroup !== null) {
      teamAgeGroups.push(participant.teamAgeGroup);
      continue;
    }
    if (!participant.teamId) continue;
    teamAgeGroups.push(input.teamAgeGroupById.get(participant.teamId) ?? null);
  }
  if (teamAgeGroups.length === 0) {
    return { categoryContext: null, source: "NO_TEAM_PARTICIPANTS" };
  }
  return resolveProgrammeCategoryFromTeamAgeGroups(teamAgeGroups);
}
