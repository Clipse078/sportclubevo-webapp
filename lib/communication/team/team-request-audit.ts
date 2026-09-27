import { logAction } from "@/lib/audit/log-action";

export type TeamRequestAuditAction =
  | "REQUEST_CREATED"
  | "REQUEST_PUBLISHED"
  | "REQUEST_CLOSED"
  | "REQUEST_SLOT_CLAIMED"
  | "REQUEST_SLOT_UNCLAIMED";

export async function recordTeamRequestAudit(input: {
  tenantId: string;
  actorUserId: string | null;
  action: TeamRequestAuditAction;
  communicationId: string;
  teamId?: string;
  requestId?: string;
  slotId?: string;
  recipientSnapshotId?: string;
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
      requestId: input.requestId,
      slotId: input.slotId,
      recipientSnapshotId: input.recipientSnapshotId,
    },
  });
}
