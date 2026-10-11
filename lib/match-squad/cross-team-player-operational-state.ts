/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01F — presentation-only cross-team operational state.
 * Derives labels from independent domain signals; never mutates canonical data.
 */

import type { PlayerReleaseRequestStatus, PlayerReleaseStatus } from "@prisma/client";
import { isPlayerReleaseOperationallyActive } from "@/lib/match-squad/player-release-lifecycle";
import { playerReleaseAssignmentAufgebotHref } from "@/lib/match-squad/player-release-assignment-copy";
import { isPlayerReleaseValidForTargetActivity } from "@/lib/match-squad/player-release-target-validity";

export type OperationalPresentationTone =
  | "success"
  | "warning"
  | "muted"
  | "danger"
  | "default";

export type CrossTeamOperationalPresentation = {
  operationalKey: string;
  operationalLabel: string;
  operationalSecondaryLabel: string | null;
  operationalTone: OperationalPresentationTone;
};

export type CrossTeamOperationalTrack = {
  releaseId: string;
  requestId: string | null;
  personId: string;
  targetTeamSeasonId: string;
  targetTeamLabel: string;
  targetEventId: string | null;
  targetEventType: "MATCH" | "TOURNAMENT" | null;
  targetActivityLabel: string | null;
  targetActivityStartAt: string | null;
  activityHref: string | null;
  releaseReasonLabel: string | null;
  releaseMaxMinutesLabel: string | null;
  requestStatus: PlayerReleaseRequestStatus | null;
  requestStatusLabel: string | null;
  assigned: boolean;
  releaseValidForActivity: boolean;
  eventCancelled: boolean;
  presentation: CrossTeamOperationalPresentation;
};

const requestStatusLabels: Record<PlayerReleaseRequestStatus, string> = {
  PENDING: "Angefragt",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Zurückgezogen",
};

function isEventCancelledStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  return normalized === "CANCELLED" || normalized === "CANCELED";
}

export function deriveCrossTeamOperationalPresentation(input: {
  releaseStatus: PlayerReleaseStatus;
  releaseValidForActivity: boolean;
  requestStatus: PlayerReleaseRequestStatus | null;
  assigned: boolean;
  eventCancelled: boolean;
}): CrossTeamOperationalPresentation {
  if (input.eventCancelled && input.requestStatus === "APPROVED") {
    return {
      operationalKey: "EVENT_CANCELLED",
      operationalLabel: "Aktivität abgesagt",
      operationalSecondaryLabel: null,
      operationalTone: "muted",
    };
  }

  if (
    input.requestStatus === "APPROVED" &&
    (!input.releaseValidForActivity || input.releaseStatus !== "ACTIVE")
  ) {
    return {
      operationalKey: "INVALID_AFTER_DECISION",
      operationalLabel: "Nicht mehr gültig",
      operationalSecondaryLabel: "Freigabe oder Termin hat sich geändert",
      operationalTone: "warning",
    };
  }

  if (!input.requestStatus) {
    return {
      operationalKey: "RELEASED",
      operationalLabel: "Freigegeben",
      operationalSecondaryLabel: "Noch nicht angefragt",
      operationalTone: "default",
    };
  }

  switch (input.requestStatus) {
    case "PENDING":
      return {
        operationalKey: "REQUEST_PENDING",
        operationalLabel: requestStatusLabels.PENDING,
        operationalSecondaryLabel: null,
        operationalTone: "warning",
      };
    case "REJECTED":
      return {
        operationalKey: "REQUEST_REJECTED",
        operationalLabel: requestStatusLabels.REJECTED,
        operationalSecondaryLabel: null,
        operationalTone: "muted",
      };
    case "CANCELLED":
      return {
        operationalKey: "REQUEST_CANCELLED",
        operationalLabel: requestStatusLabels.CANCELLED,
        operationalSecondaryLabel: null,
        operationalTone: "muted",
      };
    case "APPROVED":
      if (input.assigned) {
        return {
          operationalKey: "ASSIGNED",
          operationalLabel: "Aufgeboten",
          operationalSecondaryLabel: null,
          operationalTone: "success",
        };
      }
      return {
        operationalKey: "APPROVED_UNASSIGNED",
        operationalLabel: requestStatusLabels.APPROVED,
        operationalSecondaryLabel: "Noch nicht aufgeboten",
        operationalTone: "success",
      };
    default:
      return {
        operationalKey: "UNKNOWN",
        operationalLabel: "Unbekannt",
        operationalSecondaryLabel: null,
        operationalTone: "default",
      };
  }
}

export function buildTargetActivityHref(input: {
  targetEventId: string | null;
  targetEventType: "MATCH" | "TOURNAMENT" | null;
}): string | null {
  if (!input.targetEventId || !input.targetEventType) {
    return null;
  }
  return playerReleaseAssignmentAufgebotHref({
    eventType: input.targetEventType,
    eventId: input.targetEventId,
  });
}

export function evaluateReleaseValidForActivity(input: {
  release: {
    status: PlayerReleaseStatus;
    scope: string;
    targetTeamSeasonId: string;
    eventId: string | null;
    trainingSessionId: string | null;
    validFrom: Date;
    validUntil: Date;
  };
  targetTeamSeasonId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetActivityStartAt: Date;
  timezone: string;
}): boolean {
  return isPlayerReleaseValidForTargetActivity({
    release: {
      status: input.release.status,
      scope: input.release.scope as "PERIOD" | "ACTIVITY",
      targetTeamSeasonId: input.release.targetTeamSeasonId,
      eventId: input.release.eventId,
      trainingSessionId: input.release.trainingSessionId,
      validFrom: input.release.validFrom,
      validUntil: input.release.validUntil,
    },
    targetTeamSeasonId: input.targetTeamSeasonId,
    targetEventId: input.targetEventId,
    targetEventType: input.targetEventType,
    targetActivityStartAt: input.targetActivityStartAt,
    timezone: input.timezone,
  });
}

export function isReleaseOperationallyVisible(input: {
  status: PlayerReleaseStatus;
  validFrom: Date;
  validUntil: Date;
  timezone: string;
}): boolean {
  if (input.status === "REVOKED") {
    return true;
  }
  return (
    isPlayerReleaseOperationallyActive({
      status: input.status,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      timezone: input.timezone,
    }) || input.status === "ACTIVE"
  );
}

export { requestStatusLabels as crossTeamRequestStatusLabels };
