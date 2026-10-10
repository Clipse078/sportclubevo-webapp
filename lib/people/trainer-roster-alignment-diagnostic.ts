/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — read-only PersonAssignment vs TrainerTeamMember alignment.
 *
 * Mirrors PERSON-UX-07 State A–D semantics for future onboarding UX (01B).
 * Does not mutate data or infer authorization from trainer roster rows.
 */

import { PERSON_FUNCTION_GROUPS } from "@/lib/people/functions";

export type TrainerRosterAlignmentState =
  | "ALIGNED"
  | "ASSIGNMENT_ONLY"
  | "ROSTER_ONLY"
  | "NEITHER";

export type TrainerAssignmentSnapshot = {
  status: string;
  functionKey: string | null;
  team: { id: string; name?: string } | null;
};

export type TrainerMembershipSnapshot = {
  status: string;
  teamSeason: { team: { id: string; name?: string } };
};

const TRAINER_FUNCTION_KEYS = new Set<string>(PERSON_FUNCTION_GROUPS.TRAINER_STAFF);

function isActiveTrainerAssignment(assignment: TrainerAssignmentSnapshot): boolean {
  return (
    assignment.status === "ACTIVE" &&
    assignment.functionKey != null &&
    TRAINER_FUNCTION_KEYS.has(assignment.functionKey) &&
    assignment.team != null
  );
}

function activeTrainerTeamIds(memberships: readonly TrainerMembershipSnapshot[]): Set<string> {
  const ids = new Set<string>();
  for (const row of memberships) {
    if (row.status === "ACTIVE") {
      ids.add(row.teamSeason.team.id);
    }
  }
  return ids;
}

function activeTrainerAssignmentTeamIds(
  assignments: readonly TrainerAssignmentSnapshot[],
): Set<string> {
  const ids = new Set<string>();
  for (const row of assignments) {
    if (isActiveTrainerAssignment(row) && row.team) {
      ids.add(row.team.id);
    }
  }
  return ids;
}

/**
 * Classifies alignment for one Team within the current operational view.
 */
export function classifyTrainerRosterAlignmentForTeam(input: {
  teamId: string;
  assignments: readonly TrainerAssignmentSnapshot[];
  trainerMemberships: readonly TrainerMembershipSnapshot[];
}): TrainerRosterAlignmentState {
  const hasAssignment = activeTrainerAssignmentTeamIds(input.assignments).has(input.teamId);
  const hasRoster = activeTrainerTeamIds(input.trainerMemberships).has(input.teamId);

  if (hasAssignment && hasRoster) return "ALIGNED";
  if (hasAssignment) return "ASSIGNMENT_ONLY";
  if (hasRoster) return "ROSTER_ONLY";
  return "NEITHER";
}

/**
 * Returns per-team alignment rows for all teams referenced by either side.
 */
export function summarizeTrainerRosterAlignment(input: {
  assignments: readonly TrainerAssignmentSnapshot[];
  trainerMemberships: readonly TrainerMembershipSnapshot[];
}): Array<{ teamId: string; state: TrainerRosterAlignmentState }> {
  const teamIds = new Set<string>();
  for (const a of input.assignments) {
    if (isActiveTrainerAssignment(a) && a.team) teamIds.add(a.team.id);
  }
  for (const m of input.trainerMemberships) {
    if (m.status === "ACTIVE") teamIds.add(m.teamSeason.team.id);
  }

  return [...teamIds]
    .sort()
    .map((teamId) => ({
      teamId,
      state: classifyTrainerRosterAlignmentForTeam({
        teamId,
        assignments: input.assignments,
        trainerMemberships: input.trainerMemberships,
      }),
    }));
}

/**
 * Person-level summary used by onboarding diagnostics.
 */
export function summarizePersonTrainerRosterAlignment(input: {
  assignments: readonly TrainerAssignmentSnapshot[];
  trainerMemberships: readonly TrainerMembershipSnapshot[];
}): {
  byTeam: Array<{ teamId: string; state: TrainerRosterAlignmentState }>;
  hasAnyAssignmentOnly: boolean;
  hasAnyRosterOnly: boolean;
} {
  const byTeam = summarizeTrainerRosterAlignment(input);
  return {
    byTeam,
    hasAnyAssignmentOnly: byTeam.some((row) => row.state === "ASSIGNMENT_ONLY"),
    hasAnyRosterOnly: byTeam.some((row) => row.state === "ROSTER_ONLY"),
  };
}
