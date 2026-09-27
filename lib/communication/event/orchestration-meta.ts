/**
 * SCE-COMM-10 — reminder orchestration metadata persisted on PlatformCommunication.
 */

import type { PlatformCommunicationReminderOrigin } from "@prisma/client";

export type EventParticipationAnchorRef =
  | {
      eventKind: "TRAINING";
      trainingSessionId: string;
      teamSeasonId: string;
      contextEventId: string;
    }
  | {
      eventKind: "MATCH" | "TOURNAMENT" | "CLUB_EVENT";
      eventId: string;
      teamSeasonId: string | null;
      contextEventId: string;
    };

export type CommunicationOrchestrationMeta = {
  reminderOrigin: PlatformCommunicationReminderOrigin;
  sourceCommunicationId?: string | null;
  eventAnchor?: EventParticipationAnchorRef | null;
  requestSlotIds?: string[] | null;
  manualActionKey?: string | null;
};

export function parseOrchestrationMeta(value: unknown): CommunicationOrchestrationMeta | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const origin = row.reminderOrigin;
  if (typeof origin !== "string") return null;
  return {
    reminderOrigin: origin as PlatformCommunicationReminderOrigin,
    sourceCommunicationId:
      typeof row.sourceCommunicationId === "string" ? row.sourceCommunicationId : null,
    eventAnchor: (row.eventAnchor as EventParticipationAnchorRef | null | undefined) ?? null,
    requestSlotIds: Array.isArray(row.requestSlotIds)
      ? row.requestSlotIds.filter((id): id is string => typeof id === "string")
      : null,
    manualActionKey: typeof row.manualActionKey === "string" ? row.manualActionKey : null,
  };
}
