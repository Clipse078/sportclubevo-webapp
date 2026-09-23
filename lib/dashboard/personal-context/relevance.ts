import type { PersonalContext } from "./types";

/** Personal relevance only — never implies authorization to view resources. */
export function getPersonallyRelevantTeamIds(context: PersonalContext): string[] {
  return context.teams.map((t) => t.teamId);
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
