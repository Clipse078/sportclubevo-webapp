import { getPersonFunctionLabel } from "@/lib/people/functions";
import type {
  PersonalContext,
  PersonalContextDescriptor,
  PersonalContextDescriptorKind,
  PersonalTeamRelationship,
} from "./types";

const TEAM_TRAINER_LABEL = "Trainer";
const TEAM_PLAYER_LABEL = "Spieler";

/** Documented precedence: direct sporting role > team-scoped assignment > org assignment > membership. */
const TEAM_KIND_PRECEDENCE: Record<string, number> = {
  TRAINER: 0,
  PLAYER: 1,
  PERSON_ASSIGNMENT: 2,
};

export function pickPrimaryTeamRelationship(
  team: PersonalTeamRelationship | undefined,
): PersonalContextDescriptor | null {
  if (!team) return null;

  const sortedKinds = [...team.kinds].sort(
    (a, b) => (TEAM_KIND_PRECEDENCE[a] ?? 99) - (TEAM_KIND_PRECEDENCE[b] ?? 99),
  );
  const primary = sortedKinds[0];

  if (primary === "TRAINER") {
    return {
      kind: "TEAM_TRAINER",
      label: `${team.teamName} · ${TEAM_TRAINER_LABEL}`,
    };
  }
  if (primary === "PLAYER") {
    return {
      kind: "TEAM_PLAYER",
      label: `${team.teamName} · ${TEAM_PLAYER_LABEL}`,
    };
  }
  if (primary === "PERSON_ASSIGNMENT" && team.assignmentFunctionKeys.length > 0) {
    const fnKey = team.assignmentFunctionKeys[0];
    const fnLabel = getPersonFunctionLabel(fnKey) || "Funktion";
    return {
      kind: "TEAM_ASSIGNMENT",
      label: `${team.teamName} · ${fnLabel}`,
    };
  }

  return {
    kind: "GENERIC",
    label: team.teamName,
  };
}

export function resolveTeamEventContextLabel(
  context: PersonalContext,
  teamId: string | null | undefined,
): string | undefined {
  if (!teamId) return undefined;
  const team = context.teams.find((t) => t.teamId === teamId);
  return pickPrimaryTeamRelationship(team)?.label;
}

export function resolveOrgContextDescriptor(
  context: PersonalContext,
  orgUnitId: string,
): PersonalContextDescriptor | null {
  const org = context.orgUnits.find((o) => o.orgUnitId === orgUnitId);
  if (!org) return null;

  if (org.assignmentFunctionKeys.length > 0) {
    const fnLabel = getPersonFunctionLabel(org.assignmentFunctionKeys[0]) || "Funktion";
    return {
      kind: "ORG_ASSIGNMENT",
      label: `${org.orgUnitName} · ${fnLabel}`,
    };
  }

  return {
    kind: "ORG_MEMBERSHIP",
    label: org.orgUnitName,
  };
}

export function meetingParticipantContextLabel(): PersonalContextDescriptor {
  return { kind: "MEETING_PARTICIPANT", label: "Meeting · Teilnehmer" };
}

export function meetingOrganizerContextLabel(): PersonalContextDescriptor {
  return { kind: "MEETING_ORGANIZER", label: "Meeting · Organisator" };
}

export function taskAssigneeContextLabel(): PersonalContextDescriptor {
  return { kind: "TASK_ASSIGNEE", label: "Dir zugewiesen" };
}

export function descriptorKindForTeam(teamId: string, context: PersonalContext): PersonalContextDescriptorKind {
  const desc = pickPrimaryTeamRelationship(context.teams.find((t) => t.teamId === teamId));
  return desc?.kind ?? "GENERIC";
}
