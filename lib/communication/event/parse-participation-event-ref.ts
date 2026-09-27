import type { ParticipationEventRef } from "@/lib/participation/types";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export function parseParticipationEventRefFromBody(body: {
  eventKind?: string;
  eventId?: string | null;
  trainingSessionId?: string | null;
}): ParticipationEventRef {
  const kind = body.eventKind?.trim();
  if (kind === "TRAINING") {
    const trainingSessionId = body.trainingSessionId?.trim();
    if (!trainingSessionId) {
      throw new TeamCommunicationValidationError("trainingSessionId is required");
    }
    return { eventKind: "TRAINING", trainingSessionId };
  }
  if (kind === "MATCH" || kind === "TOURNAMENT" || kind === "CLUB_EVENT") {
    const eventId = body.eventId?.trim();
    if (!eventId) throw new TeamCommunicationValidationError("eventId is required");
    return { eventKind: kind, eventId };
  }
  throw new TeamCommunicationValidationError("invalid eventKind");
}
