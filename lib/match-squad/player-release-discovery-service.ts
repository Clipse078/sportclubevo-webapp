/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D — release-driven discovery for a target activity.
 */

import type { ParticipationResponseStatus, PlayerReleaseRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import { mapParticipationStatusToMatchAvailability } from "@/lib/match-squad/availability-adapter";
import { getMatchParticipationStatusPresentation } from "@/lib/match-squad/match-availability-presentation";
import { loadPersonActivityConflictHints } from "@/lib/match-squad/person-activity-conflict-hints";
import {
  formatMaxMinutesLabel,
  playerReleaseReasonLabel,
} from "@/lib/match-squad/player-release-presentation";
import { isPlayerReleaseValidForTargetActivity } from "@/lib/match-squad/player-release-target-validity";
import {
  resolvePlayerReleaseTargetTeams,
  type PlayerReleaseTargetEligibilityState,
} from "@/lib/match-squad/player-release-target-discovery";

export type ReleasedPlayerSuitabilityState =
  | "POTENTIALLY_SUITABLE"
  | "CHECK_REQUIRED"
  | "NOT_SUITABLE";

export type ReleasedPlayerDiscoveryItem = {
  releaseId: string;
  personId: string;
  personDisplayName: string;
  sourceTeamSeasonId: string;
  sourceTeamLabel: string;
  releaseReason: string;
  releaseReasonCode: string;
  maxMinutes: number | null;
  maxMinutesLabel: string | null;
  validityLabel: string;
  suitabilityState: ReleasedPlayerSuitabilityState;
  suitabilityLabel: string;
  eligibilityState: PlayerReleaseTargetEligibilityState;
  availabilityLabel: string;
  availabilityTone: "success" | "danger" | "warning" | "muted";
  availabilityBlocksRequest: boolean;
  conflictHints: { level: string; message: string }[];
  hasHardConflict: boolean;
  request: {
    id: string;
    status: PlayerReleaseRequestStatus;
    statusLabel: string;
    requestedMinutes: number | null;
    version: string;
  } | null;
  canRequest: boolean;
  requestBlockedReason: string | null;
  sortPriority: number;
};

const requestStatusLabel: Record<PlayerReleaseRequestStatus, string> = {
  PENDING: "Angefragt",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Zurückgezogen",
};

function suitabilityFromEligibility(state: PlayerReleaseTargetEligibilityState): {
  suitabilityState: ReleasedPlayerSuitabilityState;
  suitabilityLabel: string;
} {
  if (state === "ELIGIBLE") {
    return {
      suitabilityState: "POTENTIALLY_SUITABLE",
      suitabilityLabel: "Potenziell passend",
    };
  }
  if (state === "UNKNOWN") {
    return {
      suitabilityState: "CHECK_REQUIRED",
      suitabilityLabel: "Prüfung erforderlich",
    };
  }
  return {
    suitabilityState: "NOT_SUITABLE",
    suitabilityLabel: "Nicht als passend erkannt",
  };
}

function availabilitySortPriority(label: string): number {
  switch (label) {
    case "Verfügbar":
      return 1;
    case "Unsicher":
      return 2;
    case "Offen":
      return 3;
    case "Nicht verfügbar":
      return 4;
    default:
      return 5;
  }
}

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

export async function discoverReleasedPlayersForTargetActivity(input: {
  tenantId: string;
  targetTeamSeasonId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetActivityStartAt: Date;
  targetEndAt: Date | null;
  timezone: string;
}): Promise<ReleasedPlayerDiscoveryItem[]> {
  const releases = await prisma.playerRelease.findMany({
    where: {
      tenantId: input.tenantId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      personId: true,
      sourceTeamSeasonId: true,
      targetTeamSeasonId: true,
      scope: true,
      eventId: true,
      trainingSessionId: true,
      validFrom: true,
      validUntil: true,
      maxMinutes: true,
      reason: true,
      status: true,
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
  });

  const applicable = releases.filter((release) =>
    isPlayerReleaseValidForTargetActivity({
      release,
      targetTeamSeasonId: input.targetTeamSeasonId,
      targetEventId: input.targetEventId,
      targetEventType: input.targetEventType,
      targetActivityStartAt: input.targetActivityStartAt,
      timezone: input.timezone,
    }),
  );

  if (applicable.length === 0) {
    return [];
  }

  const personIds = [...new Set(applicable.map((row) => row.personId))];
  const releaseIds = applicable.map((row) => row.id);

  const [participationRows, requestRows] = await Promise.all([
    prisma.participationResponse.findMany({
      where: {
        tenantId: input.tenantId,
        eventId: input.targetEventId,
        personId: { in: personIds },
      },
      select: { personId: true, status: true },
    }),
    prisma.playerReleaseRequest.findMany({
      where: {
        tenantId: input.tenantId,
        targetEventId: input.targetEventId,
        OR: [{ playerReleaseId: { in: releaseIds } }, { personId: { in: personIds } }],
      },
      select: {
        id: true,
        playerReleaseId: true,
        personId: true,
        status: true,
        requestedMinutes: true,
        updatedAt: true,
      },
    }),
  ]);

  const participationByPerson = new Map<string, ParticipationResponseStatus>();
  for (const row of participationRows) {
    participationByPerson.set(row.personId, row.status);
  }

  const requestByRelease = new Map<string, (typeof requestRows)[number]>();
  for (const row of requestRows) {
    const existing = requestByRelease.get(row.playerReleaseId);
    if (!existing || row.updatedAt > existing.updatedAt) {
      requestByRelease.set(row.playerReleaseId, row);
    }
  }

  const eligibilityCache = new Map<string, PlayerReleaseTargetEligibilityState>();

  async function eligibilityForRelease(release: (typeof applicable)[number]) {
    const cacheKey = `${release.personId}:${release.sourceTeamSeasonId}`;
    if (eligibilityCache.has(cacheKey)) {
      return eligibilityCache.get(cacheKey)!;
    }
    const rows = await resolvePlayerReleaseTargetTeams({
      tenantId: input.tenantId,
      personId: release.personId,
      sourceTeamSeasonId: release.sourceTeamSeasonId,
      includeUnknown: true,
      includeIneligible: true,
    });
    const match = rows.find((row) => row.teamSeasonId === input.targetTeamSeasonId);
    const state = match?.eligibilityState ?? "UNKNOWN";
    eligibilityCache.set(cacheKey, state);
    return state;
  }

  const items: ReleasedPlayerDiscoveryItem[] = [];

  for (const release of applicable) {
    const participationStatus = participationByPerson.get(release.personId) ?? null;
    const availability = mapParticipationStatusToMatchAvailability(participationStatus);
    const presentation = getMatchParticipationStatusPresentation(participationStatus, {
      availability,
    });

    const conflictHints = await loadPersonActivityConflictHints({
      tenantId: input.tenantId,
      personId: release.personId,
      targetEventId: input.targetEventId,
      targetStartAt: input.targetActivityStartAt,
      targetEndAt: input.targetEndAt,
    });
    const hasHardConflict = conflictHints.some((hint) => hint.level === "HARD");

    const eligibilityState = await eligibilityForRelease(release);
    const suitability = suitabilityFromEligibility(eligibilityState);

    const existingRequest = requestByRelease.get(release.id) ?? null;

    const availabilityBlocksRequest = presentation.label === "Nicht verfügbar";
    let canRequest = true;
    let requestBlockedReason: string | null = null;

    if (existingRequest?.status === "PENDING") {
      canRequest = false;
      requestBlockedReason = "Es besteht bereits eine offene Anfrage.";
    } else if (existingRequest?.status === "APPROVED") {
      canRequest = false;
      requestBlockedReason = "Anfrage wurde bereits genehmigt.";
    } else if (hasHardConflict) {
      canRequest = false;
      requestBlockedReason = conflictHints.find((h) => h.level === "HARD")?.message ?? null;
    } else if (availabilityBlocksRequest) {
      canRequest = false;
      requestBlockedReason =
        "Spieler ist für diese Aktivität als nicht verfügbar gemeldet.";
    } else if (suitability.suitabilityState === "NOT_SUITABLE") {
      canRequest = false;
      requestBlockedReason = "Freigegeben ≠ Einsatzberechtigt — Ziel passt nicht.";
    }

    const validityLabel = `${release.validFrom.toISOString().slice(0, 10)} – ${release.validUntil.toISOString().slice(0, 10)}`;

    items.push({
      releaseId: release.id,
      personId: release.personId,
      personDisplayName: formatPersonName(release.person),
      sourceTeamSeasonId: release.sourceTeamSeasonId,
      sourceTeamLabel: teamSeasonLabel(release.sourceTeamSeason),
      releaseReason: playerReleaseReasonLabel(release.reason),
      releaseReasonCode: release.reason,
      maxMinutes: release.maxMinutes,
      maxMinutesLabel: formatMaxMinutesLabel(release.maxMinutes),
      validityLabel,
      suitabilityState: suitability.suitabilityState,
      suitabilityLabel: suitability.suitabilityLabel,
      eligibilityState,
      availabilityLabel: presentation.label,
      availabilityTone: presentation.tone,
      availabilityBlocksRequest,
      conflictHints: conflictHints.map((hint) => ({
        level: hint.level,
        message: hint.message,
      })),
      hasHardConflict,
      request: existingRequest
        ? {
            id: existingRequest.id,
            status: existingRequest.status,
            statusLabel: requestStatusLabel[existingRequest.status],
            requestedMinutes: existingRequest.requestedMinutes,
            version: existingRequest.updatedAt.toISOString(),
          }
        : null,
      canRequest,
      requestBlockedReason,
      sortPriority:
        (suitability.suitabilityState === "POTENTIALLY_SUITABLE" ? 0 : suitability.suitabilityState === "CHECK_REQUIRED" ? 1 : 2) *
          10 +
        (hasHardConflict ? 5 : 0) +
        availabilitySortPriority(presentation.label),
    });
  }

  items.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) {
      return a.sortPriority - b.sortPriority;
    }
    return a.personDisplayName.localeCompare(b.personDisplayName, "de");
  });

  return items;
}
