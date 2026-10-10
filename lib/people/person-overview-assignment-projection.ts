/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R1 — Person Übersicht assignment read model.
 *
 * Separates incomplete (State B), complete sporting memberships, and
 * "Weitere Funktionen" without duplicating the same team sporting context.
 */

import { PERSON_FUNCTIONS, PERSON_FUNCTION_GROUPS } from "@/lib/people/functions";

const PLAYER_FUNCTION_KEYS = new Set<string>(PERSON_FUNCTION_GROUPS.SPIELER);

const TRAINER_FUNCTION_KEYS = new Set<string>(PERSON_FUNCTION_GROUPS.TRAINER_STAFF);

/** Trainer/staff assignment keys that mirror TrainerTeamMember sporting context. */
export const SPORTING_TRAINER_ASSIGNMENT_KEYS = new Set<string>([
  PERSON_FUNCTIONS.HEAD_COACH,
  PERSON_FUNCTIONS.ASSISTANT_COACH,
  PERSON_FUNCTIONS.GOALKEEPER_COACH,
]);

export type PersonOverviewAssignmentRow = {
  id: string;
  status: string;
  functionKey: string | null | undefined;
  team: { id: string; name: string } | null;
  orgUnit?: { id: string; name: string } | null;
  season?: { id: string; name: string; key?: string } | null;
};

export type PersonOverviewMembershipTeamRef = {
  status: string;
  teamSeason: {
    team: { id: string; name: string };
  };
};

export type PersonOverviewAssignmentProjection = {
  incompletePlayerAssignments: PersonOverviewAssignmentRow[];
  incompleteTrainerAssignments: PersonOverviewAssignmentRow[];
  weitereAssignments: PersonOverviewAssignmentRow[];
  suppressedFromWeitereIds: string[];
};

function isActiveAssignment(row: PersonOverviewAssignmentRow) {
  return row.status === "ACTIVE";
}

export function personAssignmentRepeatsSportingMembership(
  assignment: PersonOverviewAssignmentRow,
  playerCompleteTeamIds: ReadonlySet<string>,
  trainerCompleteTeamIds: ReadonlySet<string>,
): boolean {
  if (!assignment.team || !assignment.functionKey) {
    return false;
  }

  if (
    PLAYER_FUNCTION_KEYS.has(assignment.functionKey) &&
    playerCompleteTeamIds.has(assignment.team.id)
  ) {
    return true;
  }

  if (
    SPORTING_TRAINER_ASSIGNMENT_KEYS.has(assignment.functionKey) &&
    trainerCompleteTeamIds.has(assignment.team.id)
  ) {
    return true;
  }

  return false;
}

export function buildPersonOverviewAssignmentProjection(input: {
  assignments: PersonOverviewAssignmentRow[];
  squadMemberships: PersonOverviewMembershipTeamRef[];
  trainerMemberships: PersonOverviewMembershipTeamRef[];
  squadMembershipActive?: (membership: { status: string }) => boolean;
  trainerMembershipActive?: (membership: { status: string }) => boolean;
}): PersonOverviewAssignmentProjection {
  const squadActive =
    input.squadMembershipActive ??
    ((m: { status: string }) =>
      m.status === "ACTIVE" || m.status === "INJURED" || m.status === "ABSENT");
  const trainerActive =
    input.trainerMembershipActive ?? ((m: { status: string }) => m.status === "ACTIVE");

  const activeAssignments = input.assignments.filter(isActiveAssignment);

  const playerCompleteTeamIds = new Set(
    input.squadMemberships.filter(squadActive).map((sm) => sm.teamSeason.team.id),
  );
  const trainerCompleteTeamIds = new Set(
    input.trainerMemberships.filter(trainerActive).map((tm) => tm.teamSeason.team.id),
  );

  const incompletePlayerAssignments = activeAssignments.filter(
    (a) =>
      a.functionKey != null &&
      PLAYER_FUNCTION_KEYS.has(a.functionKey) &&
      a.team != null &&
      !playerCompleteTeamIds.has(a.team.id),
  );

  const incompleteTrainerAssignments = activeAssignments.filter(
    (a) =>
      a.functionKey != null &&
      TRAINER_FUNCTION_KEYS.has(a.functionKey) &&
      a.team != null &&
      !trainerCompleteTeamIds.has(a.team.id),
  );

  const suppressedFromWeitere = new Set<string>([
    ...incompletePlayerAssignments.map((a) => a.id),
    ...incompleteTrainerAssignments.map((a) => a.id),
  ]);

  for (const assignment of activeAssignments) {
    if (
      personAssignmentRepeatsSportingMembership(
        assignment,
        playerCompleteTeamIds,
        trainerCompleteTeamIds,
      )
    ) {
      suppressedFromWeitere.add(assignment.id);
    }
  }

  const weitereAssignments = activeAssignments.filter((a) => !suppressedFromWeitere.has(a.id));

  return {
    incompletePlayerAssignments,
    incompleteTrainerAssignments,
    weitereAssignments,
    suppressedFromWeitereIds: [...suppressedFromWeitere],
  };
}
