import { logAction } from "@/lib/audit/log-action";

export type PlatformCommunicationAuditAction =
  | "COMMUNICATION_CREATED"
  | "COMMUNICATION_UPDATED"
  | "COMMUNICATION_PUBLISHED"
  | "COMMUNICATION_ARCHIVED"
  | "COMMUNICATION_ACKNOWLEDGED"
  | "COMMUNICATION_EMAIL_ENQUEUED";

export async function recordPlatformCommunicationAudit(input: {
  tenantId: string;
  actorUserId: string | null;
  action: PlatformCommunicationAuditAction;
  communicationId: string;
  teamId?: string;
  kind?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "PlatformCommunication",
    entityId: input.communicationId,
    action: input.action,
    afterJson: {
      communicationId: input.communicationId,
      teamId: input.teamId,
      kind: input.kind,
      status: input.status,
      ...(input.metadata ?? {}),
    },
  });
}
