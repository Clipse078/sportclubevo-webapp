/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R1 — persistent target-team inbound release overview.
 */

import type { PlayerReleaseRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import {
  formatMaxMinutesLabel,
  formatReleaseValidityRange,
  playerReleaseReasonLabel,
} from "@/lib/match-squad/player-release-presentation";
import { isPlayerReleaseOperationallyActive } from "@/lib/match-squad/player-release-lifecycle";

export type InboundTargetedPlayerReleaseItem = {
  releaseId: string;
  personId: string;
  personDisplayName: string;
  sourceTeamSeasonId: string;
  sourceTeamLabel: string;
  scope: string;
  targetEventId: string | null;
  activityLabel: string | null;
  releaseReason: string;
  maxMinutesLabel: string | null;
  validityLabel: string;
  request: {
    id: string;
    status: PlayerReleaseRequestStatus;
    statusLabel: string;
  } | null;
};

const requestStatusLabel: Record<PlayerReleaseRequestStatus, string> = {
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

export async function countActionableInboundTargetedReleases(input: {
  tenantId: string;
  targetTeamSeasonId: string;
  sourceTeamSeasonId?: string;
  targetEventId?: string | null;
  timezone: string;
  now?: Date;
}): Promise<number> {
  if (input.targetEventId?.trim()) {
    const eventId = input.targetEventId.trim();
    const releases = await prisma.playerRelease.findMany({
      where: {
        tenantId: input.tenantId,
        targetTeamSeasonId: input.targetTeamSeasonId,
        status: "ACTIVE",
        scope: "ACTIVITY",
        eventId,
        ...(input.sourceTeamSeasonId
          ? { sourceTeamSeasonId: input.sourceTeamSeasonId }
          : {}),
      },
      select: {
        id: true,
        validFrom: true,
        validUntil: true,
        status: true,
      },
    });
    return releases.filter((row) =>
      isPlayerReleaseOperationallyActive({
        status: row.status,
        validFrom: row.validFrom,
        validUntil: row.validUntil,
        timezone: input.timezone,
        now: input.now,
      }),
    ).length;
  }
  const rows = await listInboundTargetedPlayerReleases(input);
  return rows.length;
}

export async function listInboundTargetedPlayerReleases(input: {
  tenantId: string;
  targetTeamSeasonId: string;
  sourceTeamSeasonId?: string;
  timezone: string;
  now?: Date;
}): Promise<InboundTargetedPlayerReleaseItem[]> {
  const releases = await prisma.playerRelease.findMany({
    where: {
      tenantId: input.tenantId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      status: "ACTIVE",
      ...(input.sourceTeamSeasonId
        ? { sourceTeamSeasonId: input.sourceTeamSeasonId }
        : {}),
    },
    select: {
      id: true,
      personId: true,
      sourceTeamSeasonId: true,
      scope: true,
      eventId: true,
      validFrom: true,
      validUntil: true,
      maxMinutes: true,
      reason: true,
      status: true,
      event: {
        select: { id: true, title: true, type: true, startAt: true },
      },
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
    },
    orderBy: [
      { sourceTeamSeason: { displayName: "asc" } },
      { person: { lastName: "asc" } },
    ],
  });

  const actionable = releases.filter((row) =>
    isPlayerReleaseOperationallyActive({
      status: row.status,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      timezone: input.timezone,
      now: input.now,
    }),
  );

  if (actionable.length === 0) {
    return [];
  }

  const releaseIds = actionable.map((row) => row.id);

  const requestRows = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: input.tenantId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      playerReleaseId: { in: releaseIds },
      status: { in: ["PENDING", "APPROVED", "REJECTED"] },
    },
    select: {
      id: true,
      playerReleaseId: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const requestByRelease = new Map<string, (typeof requestRows)[number]>();
  for (const row of requestRows) {
    if (!requestByRelease.has(row.playerReleaseId)) {
      requestByRelease.set(row.playerReleaseId, row);
    }
  }

  return actionable.map((row) => {
    const request = requestByRelease.get(row.id);
    const activityLabel =
      row.scope === "ACTIVITY" && row.event
        ? row.event.title
        : null;
    return {
      releaseId: row.id,
      personId: row.personId,
      personDisplayName: formatPersonName(row.person),
      sourceTeamSeasonId: row.sourceTeamSeasonId,
      sourceTeamLabel: teamSeasonLabel(row.sourceTeamSeason),
      scope: row.scope,
      targetEventId: row.eventId,
      activityLabel,
      releaseReason: playerReleaseReasonLabel(row.reason),
      maxMinutesLabel: formatMaxMinutesLabel(row.maxMinutes),
      validityLabel: formatReleaseValidityRange(row.validFrom, row.validUntil),
      request: request
        ? {
            id: request.id,
            status: request.status,
            statusLabel: requestStatusLabel[request.status],
          }
        : null,
    };
  });
}
