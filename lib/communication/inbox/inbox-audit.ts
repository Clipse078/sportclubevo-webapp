import { logAction } from "@/lib/audit/log-action";

export async function recordCommunicationCenterAudit(input: {
  tenantId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const safeMetadata = { ...(input.metadata ?? {}) };
  for (const forbidden of ["credential", "password", "credentialEncrypted", "secret"]) {
    delete safeMetadata[forbidden];
  }
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: input.targetType,
    entityId: input.targetId,
    action: input.action,
    afterJson: safeMetadata,
  });
}
