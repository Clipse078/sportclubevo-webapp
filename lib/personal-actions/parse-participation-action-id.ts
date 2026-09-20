import type { ParticipationEventRef } from "@/lib/participation/types";

const SUPPORTED_KINDS = new Set(["TRAINING", "MATCH", "TOURNAMENT"]);

export type ParsedParticipationPersonalActionId = {
  personId: string;
  event: ParticipationEventRef;
};

/**
 * Parses stable participation PersonalAction ids:
 * participation:{personId}:{TRAINING|MATCH|TOURNAMENT}:{sessionOrEventId}
 */
export function parseParticipationPersonalActionId(
  personalActionId: string,
): ParsedParticipationPersonalActionId | null {
  if (!personalActionId.startsWith("participation:")) {
    return null;
  }

  const rest = personalActionId.slice("participation:".length);
  const parts = rest.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const [personId, rawKind, eventKey] = parts;
  if (!personId?.trim() || !eventKey?.trim() || !SUPPORTED_KINDS.has(rawKind)) {
    return null;
  }

  if (rawKind === "TRAINING") {
    return {
      personId,
      event: { eventKind: "TRAINING", trainingSessionId: eventKey },
    };
  }

  if (rawKind === "MATCH") {
    return {
      personId,
      event: { eventKind: "MATCH", eventId: eventKey },
    };
  }

  return {
    personId,
    event: { eventKind: "TOURNAMENT", eventId: eventKey },
  };
}
