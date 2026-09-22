import type { ParticipationEventRef } from "@/lib/participation/types";

export function buildTaskPersonalActionId(taskId: string): string {
  return `task:${taskId}`;
}

export function buildRequirementPersonalActionId(requirementRecipientId: string): string {
  return `requirement:${requirementRecipientId}`;
}

export function buildParticipationPersonalActionId(
  personId: string,
  event: Pick<ParticipationEventRef, "eventKind"> & {
    trainingSessionId?: string;
    eventId?: string;
  },
): string {
  const eventKey =
    event.eventKind === "TRAINING"
      ? event.trainingSessionId
      : event.eventId;
  if (!eventKey) {
    throw new Error("Participation action identity requires event key");
  }
  return `participation:${personId}:${event.eventKind}:${eventKey}`;
}
