import { logAction } from "@/lib/audit/log-action";

export type PlatformTemplateAuditAction =
  | "PLATFORM_COMMUNICATION_TEMPLATE_CREATED"
  | "PLATFORM_COMMUNICATION_TEMPLATE_UPDATED"
  | "PLATFORM_COMMUNICATION_TEMPLATE_DUPLICATED"
  | "PLATFORM_COMMUNICATION_TEMPLATE_ARCHIVED"
  | "PLATFORM_COMMUNICATION_TEMPLATE_USED";

export async function recordPlatformTemplateAudit(input: {
  tenantId: string;
  actorUserId: string;
  templateId: string;
  action: PlatformTemplateAuditAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "PlatformCommunicationTemplate",
    entityId: input.templateId,
    action: input.action,
    afterJson: {
      templateId: input.templateId,
      ...(input.metadata ?? {}),
    },
  });
}
