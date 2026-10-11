/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01F — load cross-team operational tracks for trainers.
 */

import { prisma } from "@/lib/db/prisma";
import {
  playerReleaseReasonLabel,
  formatMaxMinutesLabel,
} from "@/lib/match-squad/player-release-presentation";
import {
  buildTargetActivityHref,
  deriveCrossTeamOperationalPresentation,
  evaluateReleaseValidForActivity,
  type CrossTeamOperationalTrack,
} from "@/lib/match-squad/cross-team-player-operational-state";

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

function eventTypeLabel(type: string): "MATCH" | "TOURNAMENT" | null {
  if (type === "MATCH") return "MATCH";
  if (type === "TOURNAMENT") return "TOURNAMENT";
  return null;
}

const operationalRequestSelect = {
  id: true,
  personId: true,
  playerReleaseId: true,
  sourceTeamSeasonId: true,
  targetTeamSeasonId: true,
  targetEventId: true,
  status: true,
  releaseReasonSnapshot: true,
  releaseMaxMinutesSnapshot: true,
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
      type: true,
      status: true,
    },
  },
  playerRelease: {
    select: {
      id: true,
      status: true,
      scope: true,
      eventId: true,
      trainingSessionId: true,
      validFrom: true,
      validUntil: true,
      targetTeamSeasonId: true,
      maxMinutes: true,
      reason: true,
    },
  },
  assignmentMatchSquadMember: {
    select: { id: true },
  },
} as const;

export async function loadCrossTeamOperationalTracksForSourceTeamSeason(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  releaseIds: string[];
  timezone: string;
}): Promise<Record<string, CrossTeamOperationalTrack[]>> {
  if (input.releaseIds.length === 0) {
    return {};
  }

  const requests = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      playerReleaseId: { in: input.releaseIds },
    },
    select: operationalRequestSelect,
    orderBy: [{ targetEvent: { startAt: "desc" } }, { updatedAt: "desc" }],
  });

  const byRelease = new Map<string, CrossTeamOperationalTrack[]>();

  for (const row of requests) {
    if (!row.targetEvent) {
      continue;
    }
    const eventType = eventTypeLabel(row.targetEvent.type);
    const releaseValid =
      eventType != null
        ? evaluateReleaseValidForActivity({
            release: row.playerRelease,
            targetTeamSeasonId: row.targetTeamSeasonId,
            targetEventId: row.targetEventId,
            targetEventType: eventType,
            targetActivityStartAt: row.targetEvent.startAt,
            timezone: input.timezone,
          })
        : false;

    const eventCancelled =
      row.targetEvent.status != null &&
      (String(row.targetEvent.status).toUpperCase() === "CANCELLED" ||
        String(row.targetEvent.status).toUpperCase() === "CANCELED");

    const assigned = Boolean(row.assignmentMatchSquadMember?.id);
    const presentation = deriveCrossTeamOperationalPresentation({
      releaseStatus: row.playerRelease.status,
      releaseValidForActivity: releaseValid,
      requestStatus: row.status,
      assigned,
      eventCancelled,
    });

    const reasonLabel = playerReleaseReasonLabel(
      row.releaseReasonSnapshot ?? row.playerRelease.reason,
    );
    const maxMinutes =
      row.releaseMaxMinutesSnapshot ?? row.playerRelease.maxMinutes;

    const track: CrossTeamOperationalTrack = {
      releaseId: row.playerReleaseId,
      requestId: row.id,
      personId: row.personId,
      targetTeamSeasonId: row.targetTeamSeasonId,
      targetTeamLabel: teamSeasonLabel(row.targetTeamSeason),
      targetEventId: row.targetEventId,
      targetEventType: eventType,
      targetActivityLabel: row.targetEvent.title,
      targetActivityStartAt: row.targetEvent.startAt.toISOString(),
      activityHref: buildTargetActivityHref({
        targetEventId: row.targetEventId,
        targetEventType: eventType,
      }),
      releaseReasonLabel: reasonLabel,
      releaseMaxMinutesLabel: formatMaxMinutesLabel(maxMinutes),
      requestStatus: row.status,
      requestStatusLabel: presentation.operationalLabel,
      assigned,
      releaseValidForActivity: releaseValid,
      eventCancelled,
      presentation,
    };

    const list = byRelease.get(row.playerReleaseId) ?? [];
    list.push(track);
    byRelease.set(row.playerReleaseId, list);
  }

  return Object.fromEntries(byRelease.entries());
}

export async function loadCrossTeamOperationalTracksForTargetInbound(input: {
  tenantId: string;
  targetTeamSeasonId: string;
  releaseIds: string[];
  timezone: string;
}): Promise<
  Map<
    string,
    {
      requestId: string;
      requestStatus: string;
      requestStatusLabel: string;
      assigned: boolean;
      operationalLabel: string;
      operationalSecondaryLabel: string | null;
      operationalTone: CrossTeamOperationalTrack["presentation"]["operationalTone"];
    } | null
  >
> {
  if (input.releaseIds.length === 0) {
    return new Map();
  }

  const requests = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: input.tenantId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      playerReleaseId: { in: input.releaseIds },
      status: { in: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] },
    },
    select: operationalRequestSelect,
    orderBy: { updatedAt: "desc" },
  });

  const byRelease = new Map<
    string,
    (typeof requests)[number]
  >();
  for (const row of requests) {
    if (!byRelease.has(row.playerReleaseId)) {
      byRelease.set(row.playerReleaseId, row);
    }
  }

  const result = new Map<
    string,
    {
      requestId: string;
      requestStatus: string;
      requestStatusLabel: string;
      assigned: boolean;
      operationalLabel: string;
      operationalSecondaryLabel: string | null;
      operationalTone: CrossTeamOperationalTrack["presentation"]["operationalTone"];
    } | null
  >();

  for (const releaseId of input.releaseIds) {
    const row = byRelease.get(releaseId);
    if (!row) {
      result.set(releaseId, null);
      continue;
    }
    if (!row.targetEvent) {
      result.set(releaseId, null);
      continue;
    }
    const eventType = eventTypeLabel(row.targetEvent.type);
    const releaseValid =
      eventType != null
        ? evaluateReleaseValidForActivity({
            release: row.playerRelease,
            targetTeamSeasonId: row.targetTeamSeasonId,
            targetEventId: row.targetEventId,
            targetEventType: eventType,
            targetActivityStartAt: row.targetEvent.startAt,
            timezone: input.timezone,
          })
        : false;
    const eventCancelled =
      row.targetEvent.status != null &&
      (String(row.targetEvent.status).toUpperCase() === "CANCELLED" ||
        String(row.targetEvent.status).toUpperCase() === "CANCELED");
    const assigned = Boolean(row.assignmentMatchSquadMember?.id);
    const presentation = deriveCrossTeamOperationalPresentation({
      releaseStatus: row.playerRelease.status,
      releaseValidForActivity: releaseValid,
      requestStatus: row.status,
      assigned,
      eventCancelled,
    });

    result.set(releaseId, {
      requestId: row.id,
      requestStatus: row.status,
      requestStatusLabel: presentation.operationalLabel,
      assigned,
      operationalLabel: presentation.operationalLabel,
      operationalSecondaryLabel: presentation.operationalSecondaryLabel,
      operationalTone: presentation.operationalTone,
    });
  }

  return result;
}
