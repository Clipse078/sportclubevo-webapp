/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A-R1 — domain adapter over canonical ParticipationResponse.
 * Match availability is independent from trainer selection (MatchSquadMember).
 */

import type { ParticipationResponseStatus } from "@prisma/client";

export type MatchPlayerAvailability = "UNKNOWN" | "AVAILABLE" | "UNAVAILABLE";

export function mapParticipationStatusToMatchAvailability(
  status: ParticipationResponseStatus | null | undefined,
): MatchPlayerAvailability {
  if (!status || status === "OPEN") {
    return "UNKNOWN";
  }
  if (status === "YES") {
    return "AVAILABLE";
  }
  if (status === "NO") {
    return "UNAVAILABLE";
  }
  if (status === "MAYBE") {
    return "UNKNOWN";
  }
  return "UNKNOWN";
}

export function hasMatchAvailabilityConflict(input: {
  selected: boolean;
  availability: MatchPlayerAvailability;
}): boolean {
  return input.selected && input.availability === "UNAVAILABLE";
}

export function canSelectForMatchSquad(input: {
  rosterEligible: boolean;
  editable: boolean;
  availability: MatchPlayerAvailability;
}): boolean {
  if (!input.rosterEligible || !input.editable) {
    return false;
  }
  return input.availability !== "UNAVAILABLE";
}

export function canRemoveFromMatchSquad(input: {
  selected: boolean;
  editable: boolean;
}): boolean {
  return input.selected && input.editable;
}
