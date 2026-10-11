/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01E — approved-but-unassigned release candidates for Aufgebot.
 */

import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import {
  canSelectForMatchSquad,
  mapParticipationStatusToMatchAvailability,
  type MatchPlayerAvailability,
} from "@/lib/match-squad/availability-adapter";
import { getMatchParticipationStatusPresentation } from "@/lib/match-squad/match-availability-presentation";
import { participationEventKindForActivitySquad } from "@/lib/match-squad/activity-squad-kind";
import { isPlayerReleaseOperationallyActive } from "@/lib/match-squad/player-release-lifecycle";
import { isPlayerReleaseValidForTargetActivity } from "@/lib/match-squad/player-release-target-validity";
import { loadPersonActivityConflictHints } from "@/lib/match-squad/person-activity-conflict-hints";
import { prisma } from "@/lib/db/prisma";

export type ApprovedReleaseAssignmentCandidate = {
  requestId: string;
  personId: string;
  personDisplayName: string;
  sourceTeamSeasonId: string;
  sourceTeamLabel: string;
  statusLabel: string;
  availabilityLabel: string;
  availabilityTone: "success" | "danger" | "warning" | "muted";
  conflictHints: { level: string; message: string }[];
  canAssign: boolean;
  assignBlockedReason: string | null;
  assignWarning: string | null;
  version: string;
};

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

function isEventCancelled(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return normalized === "CANCELLED" || normalized === "CANCELED";
}

export const requestForAssignmentSelect = {
  id: true,
  tenantId: true,
  status: true,
  personId: true,
  playerReleaseId: true,
  sourceTeamSeasonId: true,
  targetTeamSeasonId: true,
  targetEventId: true,
  updatedAt: true,
  person: {
    select: { id: true, firstName: true, lastName: true, displayName: true },
  },
  sourceTeamSeason: {
    select: {
      id: true,
      displayName: true,
      shortName: true,
      team: { select: { name: true, shortName: true } },
    },
  },
  targetTeamSeason: {
    select: {
      id: true,
      displayName: true,
      shortName: true,
      team: { select: { name: true, shortName: true } },
    },
  },
  targetEvent: {
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      type: true,
      status: true,
    },
  },
  playerRelease: {
    select: {
      id: true,
      personId: true,
      status: true,
      revokedAt: true,
      scope: true,
      eventId: true,
      trainingSessionId: true,
      validFrom: true,
      validUntil: true,
      targetTeamSeasonId: true,
      sourceTeamSeasonId: true,
    },
  },
  assignmentMatchSquadMember: {
    select: { id: true, matchSquadId: true, personId: true },
  },
} as const;

export type AssignmentRequestRow = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.playerReleaseRequest.findFirst<{ select: typeof requestForAssignmentSelect }>
    >
  >
>;

export async function evaluateReleaseAssignmentFeasibility(input: {
  tenantId: string;
  request: AssignmentRequestRow;
  targetEventId: string;
  targetTeamSeasonId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  timezone: string;
  forAssignment: boolean;
}): Promise<{
  canAssign: boolean;
  blockedReason: string | null;
  warning: string | null;
  availability: MatchPlayerAvailability;
  availabilityLabel: string;
  availabilityTone: "success" | "danger" | "warning" | "muted";
  conflictHints: { level: string; message: string }[];
}> {
  const { request } = input;
  const conflictHints = await loadPersonActivityConflictHints({
    tenantId: input.tenantId,
    personId: request.personId,
    targetEventId: input.targetEventId,
    targetStartAt: request.targetEvent.startAt,
    targetEndAt: request.targetEvent.endAt,
  });
  const hardConflict = conflictHints.find((hint) => hint.level === "HARD");

  const participation = await prisma.participationResponse.findFirst({
    where: {
      tenantId: input.tenantId,
      eventId: input.targetEventId,
      eventKind: participationEventKindForActivitySquad(
        input.targetEventType === "TOURNAMENT" ? "TOURNAMENT" : "MATCH",
      ),
      personId: request.personId,
    },
    select: { status: true },
  });
  const availability = mapParticipationStatusToMatchAvailability(participation?.status);
  const presentation = getMatchParticipationStatusPresentation(participation?.status ?? null, {
    availability,
  });

  if (request.status !== "APPROVED") {
    return {
      canAssign: false,
      blockedReason: "Nur genehmigte Anfragen können aufgeboten werden.",
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  if (request.targetEventId !== input.targetEventId) {
    return {
      canAssign: false,
      blockedReason: "Die Genehmigung ist für diesen Einsatz nicht gültig.",
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  if (request.targetTeamSeasonId !== input.targetTeamSeasonId) {
    return {
      canAssign: false,
      blockedReason: "Die Genehmigung gehört nicht zu diesem Team.",
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  if (isEventCancelled(request.targetEvent.status)) {
    return {
      canAssign: false,
      blockedReason: "Der Einsatz wurde inzwischen abgesagt.",
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  if (
    !isPlayerReleaseOperationallyActive({
      status: request.playerRelease.status,
      validFrom: request.playerRelease.validFrom,
      validUntil: request.playerRelease.validUntil,
      timezone: input.timezone,
    }) ||
    !isPlayerReleaseValidForTargetActivity({
      release: request.playerRelease,
      targetTeamSeasonId: input.targetTeamSeasonId,
      targetEventId: input.targetEventId,
      targetEventType: input.targetEventType,
      targetActivityStartAt: request.targetEvent.startAt,
      timezone: input.timezone,
    })
  ) {
    return {
      canAssign: false,
      blockedReason: "Die Freigabe wurde inzwischen widerrufen oder ist abgelaufen.",
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  if (
    input.forAssignment &&
    !canSelectForMatchSquad({
      rosterEligible: true,
      editable: true,
      availability,
    })
  ) {
    return {
      canAssign: false,
      blockedReason: "Spieler ist für diese Aktivität als nicht verfügbar gemeldet.",
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  if (hardConflict) {
    return {
      canAssign: false,
      blockedReason: hardConflict.message,
      warning: null,
      availability,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      conflictHints,
    };
  }

  const softConflict = conflictHints.find((hint) => hint.level !== "HARD");
  return {
    canAssign: true,
    blockedReason: null,
    warning: softConflict?.message ?? null,
    availability,
    availabilityLabel: presentation.label,
    availabilityTone: presentation.tone,
    conflictHints,
  };
}

export async function listApprovedReleaseAssignmentCandidates(input: {
  tenantId: string;
  targetTeamSeasonId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  timezone: string;
}): Promise<ApprovedReleaseAssignmentCandidate[]> {
  const rows = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: input.tenantId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      targetEventId: input.targetEventId,
      status: "APPROVED",
      assignmentMatchSquadMember: { is: null },
    },
    select: requestForAssignmentSelect,
    orderBy: [{ decidedAt: "asc" }, { createdAt: "asc" }],
  });

  const candidates: ApprovedReleaseAssignmentCandidate[] = [];
  for (const row of rows) {
    const feasibility = await evaluateReleaseAssignmentFeasibility({
      tenantId: input.tenantId,
      request: row,
      targetEventId: input.targetEventId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      targetEventType: input.targetEventType,
      timezone: input.timezone,
      forAssignment: true,
    });
    candidates.push({
      requestId: row.id,
      personId: row.personId,
      personDisplayName: formatPersonName(row.person),
      sourceTeamSeasonId: row.sourceTeamSeasonId,
      sourceTeamLabel: teamSeasonLabel(row.sourceTeamSeason),
      statusLabel: "Genehmigt",
      availabilityLabel: feasibility.availabilityLabel,
      availabilityTone: feasibility.availabilityTone,
      conflictHints: feasibility.conflictHints,
      canAssign: feasibility.canAssign,
      assignBlockedReason: feasibility.blockedReason,
      assignWarning: feasibility.warning,
      version: row.updatedAt.toISOString(),
    });
  }

  candidates.sort((a, b) => {
    const rank = (row: ApprovedReleaseAssignmentCandidate) =>
      row.canAssign ? 0 : row.assignWarning ? 1 : 2;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return a.personDisplayName.localeCompare(b.personDisplayName, "de");
  });

  return candidates;
}
