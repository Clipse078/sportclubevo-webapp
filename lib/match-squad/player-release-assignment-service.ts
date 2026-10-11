/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01E — assign APPROVED PlayerReleaseRequest to activity squad.
 */

import type { ActivitySquadEventKind } from "@/lib/match-squad/activity-squad-kind";
import {
  buildMatchSquadViewModel,
  buildTournamentSquadViewModel,
} from "@/lib/match-squad/match-squad-service";
import type { MatchSquadViewModel } from "@/lib/match-squad/types";
import {
  evaluateReleaseAssignmentFeasibility,
  requestForAssignmentSelect,
  type ApprovedReleaseAssignmentCandidate,
} from "@/lib/match-squad/player-release-assignment-candidates";
import {
  PlayerReleaseRequestConflictError,
  PlayerReleaseRequestNotFoundError,
  PlayerReleaseRequestValidationError,
} from "@/lib/match-squad/player-release-request-errors";
import { emitPlayerReleaseAssignmentNotifications } from "@/lib/match-squad/player-release-assignment-producer";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";

export type { ApprovedReleaseAssignmentCandidate };

export type AssignApprovedReleaseResult = {
  squad: MatchSquadViewModel;
  matchSquadMemberId: string;
  idempotentReplay: boolean;
};

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

async function loadAssignmentRequestOrThrow(tenantId: string, requestId: string) {
  const row = await prisma.playerReleaseRequest.findFirst({
    where: { id: requestId, tenantId },
    select: requestForAssignmentSelect,
  });
  if (!row) {
    throw new PlayerReleaseRequestNotFoundError();
  }
  return row;
}

export async function assignApprovedPlayerReleaseRequest(input: {
  tenantId: string;
  requestId: string;
  targetEventId: string;
  targetTeamSeasonId: string;
  activityKind: ActivitySquadEventKind;
  actorUserId: string;
  timezone: string;
}): Promise<AssignApprovedReleaseResult> {
  const request = await loadAssignmentRequestOrThrow(input.tenantId, input.requestId);

  if (request.assignmentMatchSquadMember) {
    const squad =
      input.activityKind === "MATCH"
        ? await buildMatchSquadViewModel(input.tenantId, input.targetEventId)
        : await buildTournamentSquadViewModel(input.tenantId, input.targetEventId);
    return {
      squad,
      matchSquadMemberId: request.assignmentMatchSquadMember.id,
      idempotentReplay: true,
    };
  }

  const targetEventType =
    request.targetEvent.type === "TOURNAMENT" ? "TOURNAMENT" : "MATCH";

  const feasibility = await evaluateReleaseAssignmentFeasibility({
    tenantId: input.tenantId,
    request,
    targetEventId: input.targetEventId,
    targetTeamSeasonId: input.targetTeamSeasonId,
    targetEventType,
    timezone: input.timezone,
    forAssignment: true,
  });

  if (!feasibility.canAssign) {
    throw new PlayerReleaseRequestValidationError(
      feasibility.blockedReason ?? "Aufbieten derzeit nicht möglich.",
      "ASSIGN_BLOCKED",
    );
  }

  const squadRow = await prisma.matchSquad.findUnique({
    where: {
      tenantId_eventId: { tenantId: input.tenantId, eventId: input.targetEventId },
    },
    select: { id: true, teamSeasonId: true },
  });

  let createdMemberId: string;

  try {
    createdMemberId = await prisma.$transaction(async (tx) => {
      const fresh = await tx.playerReleaseRequest.findFirst({
        where: { id: request.id, tenantId: input.tenantId },
        select: {
          id: true,
          status: true,
          assignmentMatchSquadMember: { select: { id: true } },
        },
      });
      if (!fresh || fresh.status !== "APPROVED") {
        throw new PlayerReleaseRequestConflictError(
          "Die Genehmigung ist nicht mehr gültig.",
        );
      }
      if (fresh.assignmentMatchSquadMember) {
        return fresh.assignmentMatchSquadMember.id;
      }

      const squad =
        squadRow ??
        (await tx.matchSquad.create({
          data: {
            tenantId: input.tenantId,
            eventId: input.targetEventId,
            teamSeasonId: input.targetTeamSeasonId,
          },
          select: { id: true, teamSeasonId: true },
        }));

      if (squad.teamSeasonId !== input.targetTeamSeasonId) {
        throw new PlayerReleaseRequestValidationError(
          "Gespeichertes Aufgebot passt nicht zur Team-Saison.",
          "STORED_TEAM_SEASON_MISMATCH",
        );
      }

      const existingMember = await tx.matchSquadMember.findUnique({
        where: {
          matchSquadId_personId: {
            matchSquadId: squad.id,
            personId: request.personId,
          },
        },
        select: { id: true, playerReleaseRequestId: true },
      });

      if (existingMember) {
        if (existingMember.playerReleaseRequestId === request.id) {
          return existingMember.id;
        }
        throw new PlayerReleaseRequestConflictError("Der Spieler wurde bereits aufgeboten.");
      }

      const created = await tx.matchSquadMember.create({
        data: {
          matchSquadId: squad.id,
          personId: request.personId,
          playerReleaseRequestId: request.id,
          assignedByUserId: input.actorUserId,
          assignedAt: new Date(),
        },
        select: { id: true },
      });

      await tx.matchSquad.update({
        where: { id: squad.id },
        data: { updatedAt: new Date() },
      });

      return created.id;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      const replay = await loadAssignmentRequestOrThrow(input.tenantId, input.requestId);
      if (replay.assignmentMatchSquadMember) {
        const squad =
          input.activityKind === "MATCH"
            ? await buildMatchSquadViewModel(input.tenantId, input.targetEventId)
            : await buildTournamentSquadViewModel(input.tenantId, input.targetEventId);
        return {
          squad,
          matchSquadMemberId: replay.assignmentMatchSquadMember.id,
          idempotentReplay: true,
        };
      }
    }
    throw error;
  }

  const squad =
    input.activityKind === "MATCH"
      ? await buildMatchSquadViewModel(input.tenantId, input.targetEventId)
      : await buildTournamentSquadViewModel(input.tenantId, input.targetEventId);

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: input.activityKind === "MATCH" ? "matchcenter" : "tournamentcenter",
    entityType: "PlayerReleaseRequest",
    entityId: request.id,
    action: "ASSIGN",
    afterJson: {
      matchSquadMemberId: createdMemberId,
      targetEventId: input.targetEventId,
      personId: request.personId,
      sourceTeamSeasonId: request.sourceTeamSeasonId,
    },
  });

  void emitPlayerReleaseAssignmentNotifications({
    tenantId: input.tenantId,
    matchSquadMemberId: createdMemberId,
    requestId: request.id,
    personId: request.personId,
    personDisplayName: formatPersonName(request.person),
    sourceTeamSeasonId: request.sourceTeamSeasonId,
    targetTeamSeasonId: request.targetTeamSeasonId,
    targetTeamLabel: teamSeasonLabel(request.targetTeamSeason),
    targetEventId: input.targetEventId,
    targetEventType,
    targetEventTitle: request.targetEvent.title,
    targetEventStartAt: request.targetEvent.startAt,
    actorUserId: input.actorUserId,
    timezone: input.timezone,
  }).catch((err) => {
    console.error("[match-squad] assignment notification emit failed", err);
  });

  return { squad, matchSquadMemberId: createdMemberId, idempotentReplay: false };
}

/** 01E boundary — assignment is explicit; approval alone never assigns. */
export const PLAYER_RELEASE_ASSIGNMENT_SIGNAL_BOUNDARIES = {
  approvalDoesNotAssignToMatchSquad: true,
  assignmentRequiresApprovedRequest: true,
  assignmentDoesNotMutateParticipationResponse: true,
  assignmentDoesNotCreateStructuralKaderMembership: true,
} as const;
