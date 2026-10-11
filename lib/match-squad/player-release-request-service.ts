/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D — PlayerReleaseRequest mutations and source review lists.
 */

import type { PlayerReleaseRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import { currentSeasonRosterPlayerSquadMemberWhere } from "@/lib/teams/player-squad-structural-filter";
import { mapParticipationStatusToMatchAvailability } from "@/lib/match-squad/availability-adapter";
import { discoverReleasedPlayersForTargetActivity } from "@/lib/match-squad/player-release-discovery-service";
import { isPlayerReleaseValidForTargetActivity } from "@/lib/match-squad/player-release-target-validity";
import {
  PlayerReleaseRequestConflictError,
  PlayerReleaseRequestDuplicateError,
  PlayerReleaseRequestNotFoundError,
  PlayerReleaseRequestValidationError,
} from "@/lib/match-squad/player-release-request-errors";
import { playerReleaseReasonLabel } from "@/lib/match-squad/player-release-presentation";
import { loadPersonActivityConflictHints } from "@/lib/match-squad/person-activity-conflict-hints";

const ACTIVE_REQUEST_STATUSES: PlayerReleaseRequestStatus[] = ["PENDING", "APPROVED"];

export type PlayerReleaseRequestView = {
  id: string;
  status: PlayerReleaseRequestStatus;
  statusLabel: string;
  personId: string;
  personDisplayName: string;
  sourceTeamSeasonId: string;
  sourceTeamLabel: string;
  targetTeamSeasonId: string;
  targetTeamLabel: string;
  targetEventId: string;
  targetEventTitle: string;
  targetEventStartAt: string;
  releaseId: string;
  releaseReasonLabel: string;
  releaseMaxMinutes: number | null;
  requestedMinutes: number | null;
  requestNote: string | null;
  decisionNote: string | null;
  version: string;
  decidedAt: string | null;
};

const statusLabels: Record<PlayerReleaseRequestStatus, string> = {
  PENDING: "Angefragt",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Zurückgezogen",
};

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

const requestSelect = {
  id: true,
  tenantId: true,
  playerReleaseId: true,
  personId: true,
  sourceTeamSeasonId: true,
  targetTeamSeasonId: true,
  targetEventId: true,
  requestedMinutes: true,
  requestNote: true,
  status: true,
  decisionNote: true,
  releaseMaxMinutesSnapshot: true,
  releaseReasonSnapshot: true,
  decidedAt: true,
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
    select: { id: true, title: true, startAt: true, endAt: true, type: true },
  },
  playerRelease: {
    select: {
      id: true,
      maxMinutes: true,
      reason: true,
      status: true,
      scope: true,
      eventId: true,
      trainingSessionId: true,
      validFrom: true,
      validUntil: true,
      targetTeamSeasonId: true,
    },
  },
} as const;

type RequestRow = Awaited<
  ReturnType<
    typeof prisma.playerReleaseRequest.findFirst<{ select: typeof requestSelect }>
  >
>;

function mapRequestRow(row: NonNullable<RequestRow>): PlayerReleaseRequestView {
  return {
    id: row.id,
    status: row.status,
    statusLabel: statusLabels[row.status],
    personId: row.personId,
    personDisplayName: formatPersonName(row.person),
    sourceTeamSeasonId: row.sourceTeamSeasonId,
    sourceTeamLabel: teamSeasonLabel(row.sourceTeamSeason),
    targetTeamSeasonId: row.targetTeamSeasonId,
    targetTeamLabel: teamSeasonLabel(row.targetTeamSeason),
    targetEventId: row.targetEventId,
    targetEventTitle: row.targetEvent.title,
    targetEventStartAt: row.targetEvent.startAt.toISOString(),
    releaseId: row.playerReleaseId,
    releaseReasonLabel: playerReleaseReasonLabel(
      row.releaseReasonSnapshot ?? row.playerRelease.reason,
    ),
    releaseMaxMinutes: row.releaseMaxMinutesSnapshot ?? row.playerRelease.maxMinutes,
    requestedMinutes: row.requestedMinutes,
    requestNote: row.requestNote,
    decisionNote: row.decisionNote,
    version: row.updatedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

async function loadRequestOrThrow(tenantId: string, requestId: string): Promise<NonNullable<RequestRow>> {
  const row = await prisma.playerReleaseRequest.findFirst({
    where: { id: requestId, tenantId },
    select: requestSelect,
  });
  if (!row) {
    throw new PlayerReleaseRequestNotFoundError();
  }
  return row;
}

async function assertReleaseAuthorizesRequest(input: {
  tenantId: string;
  releaseId: string;
  targetTeamSeasonId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetActivityStartAt: Date;
  timezone: string;
}): Promise<NonNullable<Awaited<ReturnType<typeof prisma.playerRelease.findFirst>>>> {
  const release = await prisma.playerRelease.findFirst({
    where: { id: input.releaseId, tenantId: input.tenantId },
  });
  if (!release) {
    throw new PlayerReleaseRequestValidationError(
      "Spielerfreigabe nicht gefunden.",
      "RELEASE_NOT_FOUND",
    );
  }
  if (
    !isPlayerReleaseValidForTargetActivity({
      release,
      targetTeamSeasonId: input.targetTeamSeasonId,
      targetEventId: input.targetEventId,
      targetEventType: input.targetEventType,
      targetActivityStartAt: input.targetActivityStartAt,
      timezone: input.timezone,
    })
  ) {
    throw new PlayerReleaseRequestValidationError(
      "Freigabe ist nicht mehr gültig.",
      "RELEASE_INVALID",
    );
  }
  return release;
}

export async function createPlayerReleaseRequest(input: {
  tenantId: string;
  actorUserId: string;
  targetTeamSeasonId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetActivityStartAt: Date;
  targetEndAt: Date | null;
  timezone: string;
  playerReleaseId: string;
  requestedMinutes?: number | null;
  requestNote?: string | null;
}): Promise<PlayerReleaseRequestView> {
  const release = await assertReleaseAuthorizesRequest({
    tenantId: input.tenantId,
    releaseId: input.playerReleaseId,
    targetTeamSeasonId: input.targetTeamSeasonId,
    targetEventId: input.targetEventId,
    targetEventType: input.targetEventType,
    targetActivityStartAt: input.targetActivityStartAt,
    timezone: input.timezone,
  });

  if (release.targetTeamSeasonId !== input.targetTeamSeasonId) {
    throw new PlayerReleaseRequestValidationError(
      "Der Spieler ist für dieses Team nicht freigegeben.",
      "WRONG_TARGET",
    );
  }

  const rosterMember = await prisma.playerSquadMember.findFirst({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(release.sourceTeamSeasonId),
      personId: release.personId,
      person: { tenantId: input.tenantId },
    },
    select: { id: true },
  });
  if (!rosterMember) {
    throw new PlayerReleaseRequestValidationError(
      "Spieler ist nicht mehr im Saison-Kader des Stammteams.",
      "NOT_ROSTER_MEMBER",
    );
  }

  const existingActive = await prisma.playerReleaseRequest.findFirst({
    where: {
      tenantId: input.tenantId,
      playerReleaseId: input.playerReleaseId,
      targetEventId: input.targetEventId,
      status: { in: ACTIVE_REQUEST_STATUSES },
    },
    select: requestSelect,
  });
  if (existingActive?.status === "PENDING") {
    throw new PlayerReleaseRequestDuplicateError();
  }
  if (existingActive?.status === "APPROVED") {
    return mapRequestRow(existingActive);
  }

  let requestedMinutes =
    input.requestedMinutes === null || input.requestedMinutes === undefined
      ? null
      : Number(input.requestedMinutes);
  if (requestedMinutes !== null) {
    if (!Number.isFinite(requestedMinutes) || requestedMinutes < 1) {
      throw new PlayerReleaseRequestValidationError(
        "Gewünschte Einsatzzeit ist ungültig.",
        "INVALID_MINUTES",
      );
    }
    if (release.maxMinutes != null && requestedMinutes > release.maxMinutes) {
      throw new PlayerReleaseRequestValidationError(
        `Gewünschte Einsatzzeit darf ${release.maxMinutes} Minuten nicht überschreiten.`,
        "MAX_MINUTES_EXCEEDED",
      );
    }
  }

  const participation = await prisma.participationResponse.findFirst({
    where: {
      tenantId: input.tenantId,
      eventId: input.targetEventId,
      personId: release.personId,
    },
    select: { status: true },
  });
  const availability = mapParticipationStatusToMatchAvailability(participation?.status);
  if (availability === "UNAVAILABLE") {
    throw new PlayerReleaseRequestValidationError(
      "Spieler ist für diese Aktivität als nicht verfügbar gemeldet.",
      "UNAVAILABLE",
    );
  }

  const conflicts = await loadPersonActivityConflictHints({
    tenantId: input.tenantId,
    personId: release.personId,
    targetEventId: input.targetEventId,
    targetStartAt: input.targetActivityStartAt,
    targetEndAt: input.targetEndAt,
  });
  if (conflicts.some((hint) => hint.level === "HARD")) {
    throw new PlayerReleaseRequestValidationError(
      conflicts.find((hint) => hint.level === "HARD")?.message ??
        "Zeitliche Überschneidung mit anderem Aufgebot.",
      "HARD_CONFLICT",
    );
  }

  const discovery = await discoverReleasedPlayersForTargetActivity({
    tenantId: input.tenantId,
    targetTeamSeasonId: input.targetTeamSeasonId,
    targetEventId: input.targetEventId,
    targetEventType: input.targetEventType,
    targetActivityStartAt: input.targetActivityStartAt,
    targetEndAt: input.targetEndAt,
    timezone: input.timezone,
  });
  const candidate = discovery.find((row) => row.releaseId === input.playerReleaseId);
  if (!candidate) {
    throw new PlayerReleaseRequestValidationError(
      "Freigabe ist für diese Aktivität nicht auffindbar.",
      "NOT_DISCOVERABLE",
    );
  }
  if (!candidate.canRequest && candidate.request?.status !== "REJECTED" && candidate.request?.status !== "CANCELLED") {
    throw new PlayerReleaseRequestValidationError(
      candidate.requestBlockedReason ?? "Anfrage derzeit nicht möglich.",
      "REQUEST_BLOCKED",
    );
  }

  const created = await prisma.playerReleaseRequest.create({
    data: {
      tenantId: input.tenantId,
      playerReleaseId: release.id,
      personId: release.personId,
      sourceTeamSeasonId: release.sourceTeamSeasonId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      targetEventId: input.targetEventId,
      requestedMinutes,
      requestNote: input.requestNote?.trim() || null,
      status: "PENDING",
      releaseMaxMinutesSnapshot: release.maxMinutes,
      releaseReasonSnapshot: release.reason,
      requestedByUserId: input.actorUserId,
    },
    select: requestSelect,
  });

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "teams",
    entityType: "PlayerReleaseRequest",
    entityId: created.id,
    action: "CREATE",
    afterJson: {
      playerReleaseId: release.id,
      targetEventId: input.targetEventId,
      personId: release.personId,
    },
  });

  return mapRequestRow(created);
}

export async function listPlayerReleaseRequestsForSourceTeamSeason(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  status?: PlayerReleaseRequestStatus | "PENDING_ONLY";
}): Promise<PlayerReleaseRequestView[]> {
  const statusFilter =
    input.status === "PENDING_ONLY" || !input.status
      ? ({ status: "PENDING" as const } as const)
      : { status: input.status };

  const rows = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      ...statusFilter,
    },
    select: requestSelect,
    orderBy: [{ createdAt: "desc" }],
  });

  return rows.map(mapRequestRow);
}

export async function decidePlayerReleaseRequest(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  requestId: string;
  actorUserId: string;
  decision: "APPROVE" | "REJECT";
  decisionNote?: string | null;
  expectedVersion?: string | null;
  timezone: string;
}): Promise<PlayerReleaseRequestView> {
  const row = await loadRequestOrThrow(input.tenantId, input.requestId);
  if (row.sourceTeamSeasonId !== input.sourceTeamSeasonId) {
    throw new PlayerReleaseRequestNotFoundError();
  }
  if (row.status !== "PENDING") {
    throw new PlayerReleaseRequestConflictError("Die Anfrage wurde bereits bearbeitet.");
  }
  if (input.expectedVersion) {
    const expected = new Date(input.expectedVersion);
    if (row.updatedAt.getTime() !== expected.getTime()) {
      throw new PlayerReleaseRequestConflictError();
    }
  }

  if (input.decision === "APPROVE") {
    await assertReleaseAuthorizesRequest({
      tenantId: input.tenantId,
      releaseId: row.playerReleaseId,
      targetTeamSeasonId: row.targetTeamSeasonId,
      targetEventId: row.targetEventId,
      targetEventType:
        row.targetEvent.type === "TOURNAMENT"
          ? "TOURNAMENT"
          : "MATCH",
      targetActivityStartAt: row.targetEvent.startAt,
      timezone: input.timezone,
    });
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const updated = await prisma.playerReleaseRequest.update({
    where: { id: row.id },
    data: {
      status: nextStatus,
      decisionNote: input.decisionNote?.trim() || null,
      decidedByUserId: input.actorUserId,
      decidedAt: new Date(),
    },
    select: requestSelect,
  });

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "teams",
    entityType: "PlayerReleaseRequest",
    entityId: updated.id,
    action: input.decision === "APPROVE" ? "APPROVE" : "REJECT",
    afterJson: { status: nextStatus },
  });

  return mapRequestRow(updated);
}

export async function cancelPlayerReleaseRequest(input: {
  tenantId: string;
  requestId: string;
  actorUserId: string;
  targetTeamSeasonId: string;
  expectedVersion?: string | null;
}): Promise<PlayerReleaseRequestView> {
  const row = await loadRequestOrThrow(input.tenantId, input.requestId);
  if (row.targetTeamSeasonId !== input.targetTeamSeasonId) {
    throw new PlayerReleaseRequestNotFoundError();
  }
  if (row.status !== "PENDING") {
    throw new PlayerReleaseRequestConflictError("Nur offene Anfragen können zurückgezogen werden.");
  }
  if (input.expectedVersion) {
    const expected = new Date(input.expectedVersion);
    if (row.updatedAt.getTime() !== expected.getTime()) {
      throw new PlayerReleaseRequestConflictError();
    }
  }

  const updated = await prisma.playerReleaseRequest.update({
    where: { id: row.id },
    data: {
      status: "CANCELLED",
      cancelledByUserId: input.actorUserId,
      cancelledAt: new Date(),
    },
    select: requestSelect,
  });

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "teams",
    entityType: "PlayerReleaseRequest",
    entityId: updated.id,
    action: "CANCEL",
    afterJson: { status: "CANCELLED" },
  });

  return mapRequestRow(updated);
}

/** 01D boundary guard — approval must not mutate Match Squad. */
export const PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES = {
  approvalDoesNotAssignToMatchSquad: true,
  rejectionDoesNotMutatePlayerRelease: true,
  requestDoesNotMutateParticipationResponse: true,
} as const;
