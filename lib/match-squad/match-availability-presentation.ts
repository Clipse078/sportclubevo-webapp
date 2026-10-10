/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A-R4 — unified Match availability presentation.
 * Persistence remains ParticipationResponse; domain availability adapter unchanged.
 */

import type { ParticipationResponseStatus } from "@prisma/client";
import type { MatchPlayerAvailability } from "@/lib/match-squad/availability-adapter";

export type MatchParticipationPresentationStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "MAYBE"
  | "OPEN";

export type MatchAvailabilityTone = "success" | "danger" | "warning" | "muted";

export type MatchParticipationStatusPresentation = {
  status: MatchParticipationPresentationStatus;
  label: string;
  tone: MatchAvailabilityTone;
  icon: "check" | "x" | "help" | "circle";
  isDefinitive: boolean;
  isConflictRelevant: boolean;
};

export function mapParticipationStatusToMatchPresentationStatus(
  status: ParticipationResponseStatus | null | undefined,
): MatchParticipationPresentationStatus {
  if (!status || status === "OPEN") {
    return "OPEN";
  }
  if (status === "YES") {
    return "AVAILABLE";
  }
  if (status === "NO") {
    return "UNAVAILABLE";
  }
  if (status === "MAYBE") {
    return "MAYBE";
  }
  return "OPEN";
}

export function getMatchParticipationStatusPresentation(
  status: ParticipationResponseStatus | null | undefined,
  context?: {
    selected?: boolean;
    availability?: MatchPlayerAvailability;
  },
): MatchParticipationStatusPresentation {
  const presentationStatus = mapParticipationStatusToMatchPresentationStatus(status);
  const selected = context?.selected ?? false;
  const availability = context?.availability;

  const base: Omit<MatchParticipationStatusPresentation, "isConflictRelevant"> = (() => {
    switch (presentationStatus) {
      case "AVAILABLE":
        return {
          status: "AVAILABLE",
          label: "Verfügbar",
          tone: "success",
          icon: "check",
          isDefinitive: true,
        };
      case "UNAVAILABLE":
        return {
          status: "UNAVAILABLE",
          label: "Nicht verfügbar",
          tone: "danger",
          icon: "x",
          isDefinitive: true,
        };
      case "MAYBE":
        return {
          status: "MAYBE",
          label: "Unsicher",
          tone: "warning",
          icon: "help",
          isDefinitive: false,
        };
      case "OPEN":
      default:
        return {
          status: "OPEN",
          label: "Offen",
          tone: "muted",
          icon: "circle",
          isDefinitive: false,
        };
    }
  })();

  const isConflictRelevant =
    selected &&
    (availability === "UNAVAILABLE" || presentationStatus === "UNAVAILABLE");

  return { ...base, isConflictRelevant };
}
