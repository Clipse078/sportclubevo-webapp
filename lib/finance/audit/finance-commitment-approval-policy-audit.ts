/**
 * FIN-07D — governance audit for commitment approval policy configuration.
 */

import { writeAuditRecord } from "@/lib/audit/audit-record";
import type { PrismaClient } from "@prisma/client";

type AuditWriter = Pick<PrismaClient, "auditLog">;

export const FINANCE_COMMITMENT_APPROVAL_POLICY_AUDIT = {
  moduleKey: "finance",
  entityType: "FinanceCommitmentApprovalPolicy",
  actions: ["COMMITMENT_APPROVAL_POLICY_UPDATED"] as const,
} as const;

export async function auditFinanceCommitmentApprovalPolicyUpdated(
  client: AuditWriter,
  input: {
    tenantId: string;
    actorUserId: string;
    policyId: string;
    before: { enabled: boolean; thresholdAmountMinor: number; thresholdCurrency: string };
    after: { enabled: boolean; thresholdAmountMinor: number; thresholdCurrency: string };
  },
): Promise<void> {
  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: FINANCE_COMMITMENT_APPROVAL_POLICY_AUDIT.moduleKey,
    entityType: FINANCE_COMMITMENT_APPROVAL_POLICY_AUDIT.entityType,
    entityId: input.policyId,
    action: "COMMITMENT_APPROVAL_POLICY_UPDATED",
    beforeJson: input.before,
    afterJson: input.after,
  });
}
