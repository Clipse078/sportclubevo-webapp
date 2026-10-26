/**
 * FIN-07A — commitment audit (no full obligation payloads).
 */

import { writeAuditRecord } from "@/lib/audit/audit-record";
import type { PrismaClient } from "@prisma/client";
import { FINANCE_COMMITMENT_AUDIT_MODEL } from "@/lib/finance/commitment/finance-commitment-architecture-contract";

type AuditWriter = Pick<PrismaClient, "auditLog">;

export async function auditFinanceCommitmentLifecycle(
  client: AuditWriter,
  input: {
    tenantId: string;
    actorUserId: string;
    commitmentId: string;
    action: (typeof FINANCE_COMMITMENT_AUDIT_MODEL.auditedActions)[number];
    metadataJson?: Record<string, unknown>;
  },
): Promise<void> {
  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: FINANCE_COMMITMENT_AUDIT_MODEL.moduleKey,
    entityType: FINANCE_COMMITMENT_AUDIT_MODEL.commitmentEntityType,
    entityId: input.commitmentId,
    action: input.action,
    metadataJson: input.metadataJson ?? {},
  });
}
