import type { PlatformCommunicationKind, PlatformCommunicationReminderOrigin } from "@prisma/client";
import { logAction } from "@/lib/audit/log-action";

export async function recordSmartReminderAudit(input: {
  tenantId: string;
  actorUserId: string;
  communicationId: string;
  teamId: string;
  kind: PlatformCommunicationKind;
  reminderOrigin: PlatformCommunicationReminderOrigin;
  executionIdentity?: string | null;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "PlatformCommunication",
    entityId: input.communicationId,
    action: "SMART_REMINDER_SENT",
    afterJson: {
      communicationId: input.communicationId,
      teamId: input.teamId,
      kind: input.kind,
      reminderOrigin: input.reminderOrigin,
      executionIdentity: input.executionIdentity ?? null,
    },
  });
}

export async function recordEventCommunicationAudit(input: {
  tenantId: string;
  actorUserId: string;
  communicationId: string;
  teamId: string;
  kind: PlatformCommunicationKind;
  eventContextId: string;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "PlatformCommunication",
    entityId: input.communicationId,
    action: "EVENT_COMMUNICATION_SENT",
    afterJson: {
      communicationId: input.communicationId,
      teamId: input.teamId,
      kind: input.kind,
      eventContextId: input.eventContextId,
    },
  });
}
