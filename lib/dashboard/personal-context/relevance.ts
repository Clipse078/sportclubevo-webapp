import type { PersonalContext } from "./types";

/** Personal relevance only — never implies authorization to view resources. */
export function getPersonallyRelevantTeamIds(context: PersonalContext): string[] {
  return context.teams.map((t) => t.teamId);
}

export function getPersonallyRelevantTeamSeasonIds(context: PersonalContext): string[] {
  const ids = new Set<string>();
  for (const team of context.teams) {
    for (const teamSeasonId of team.teamSeasonIds) {
      ids.add(teamSeasonId);
    }
  }
  return [...ids];
}

export type PersonalTeamEventRelevanceRow = {
  teamId: string | null;
  teamSeasonId: string | null;
};

/**
 * Sporting team events must match a personally relevant team.
 * When the row carries teamSeasonId, it must align with an active trainer/player season scope.
 */
export function isPersonalTeamEventRowRelevant(
  context: PersonalContext,
  event: PersonalTeamEventRelevanceRow,
): boolean {
  if (!event.teamId || !isTeamPersonallyRelevant(context, event.teamId)) {
    return false;
  }
  if (!event.teamSeasonId) {
    return true;
  }
  const relationship = context.teams.find((t) => t.teamId === event.teamId);
  if (!relationship?.teamSeasonIds.length) {
    return true;
  }
  return relationship.teamSeasonIds.includes(event.teamSeasonId);
}

export function isTeamPersonallyRelevant(
  context: PersonalContext,
  teamId: string | null | undefined,
): boolean {
  if (!teamId) return false;
  return context.teams.some((t) => t.teamId === teamId);
}

export function isOrgUnitPersonallyRelevant(
  context: PersonalContext,
  orgUnitId: string | null | undefined,
): boolean {
  if (!orgUnitId) return false;
  return context.orgUnits.some((o) => o.orgUnitId === orgUnitId);
}

export function hasPersonalAssignmentOnTeam(
  context: PersonalContext,
  teamId: string,
): boolean {
  return context.assignments.some((a) => a.teamId === teamId);
}

/**
 * Technical permissions must not expand personal relevance.
 * Club Admin / events.view alone does not make teams relevant.
 */
export function permissionKeysArePersonalRelevance(_permissionKeys: string[]): boolean {
  return false;
}
