/**
 * SCE-COMM-18 — minimal safeguarding audit payloads (no DOB/contact leakage).
 */

import { logAction } from "@/lib/audit/log-action";

export async function recordCommunicationSafeguardingAudit(input: {
  tenantId: string;
  actorUserId: string | null;
  action: string;
  subjectPersonId: string;
  safeguardingReasonCode: string;
  communicationId?: string;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "COMMUNICATION_SAFEGUARDING",
    entityId: input.communicationId ?? input.subjectPersonId,
    action: input.action,
    afterJson: {
      subjectPersonId: input.subjectPersonId,
      safeguardingReasonCode: input.safeguardingReasonCode,
      communicationId: input.communicationId ?? null,
    },
  });
}
