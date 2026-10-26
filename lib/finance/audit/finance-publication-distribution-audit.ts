/**
 * FIN-06E — publication distribution audit (no raw tokens or recipient emails).
 */

import { writeAuditRecord } from "@/lib/audit/audit-record";
import type { PrismaClient } from "@prisma/client";

export const FINANCE_PUBLICATION_DISTRIBUTION_AUDIT = {
  moduleKey: "finance",
  entityType: "FinancePublicationDistribution",
  actions: {
    created: "PUBLICATION_DISTRIBUTION_CREATED",
    sent: "PUBLICATION_DISTRIBUTION_SENT",
    failed: "PUBLICATION_DISTRIBUTION_FAILED",
  },
} as const;

type AuditWriter = Pick<PrismaClient, "auditLog">;

export async function auditFinancePublicationDistributionCreated(
  client: AuditWriter,
  input: {
    tenantId: string;
    actorUserId: string;
    distributionId: string;
    publicationId: string;
    publicationVersionId: string;
    versionNumber: number;
    recipientCount: number;
  },
): Promise<void> {
  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.moduleKey,
    entityType: FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.entityType,
    entityId: input.distributionId,
    action: FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.actions.created,
    metadataJson: {
      publicationId: input.publicationId,
      publicationVersionId: input.publicationVersionId,
      versionNumber: input.versionNumber,
      recipientCount: input.recipientCount,
    },
  });
}

export async function auditFinancePublicationDistributionCompleted(
  client: AuditWriter,
  input: {
    tenantId: string;
    actorUserId: string;
    distributionId: string;
    publicationId: string;
    publicationVersionId: string;
    versionNumber: number;
    sentCount: number;
    failedCount: number;
    status: string;
  },
): Promise<void> {
  const action =
    input.failedCount > 0 && input.sentCount === 0
      ? FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.actions.failed
      : FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.actions.sent;

  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.moduleKey,
    entityType: FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.entityType,
    entityId: input.distributionId,
    action,
    metadataJson: {
      publicationId: input.publicationId,
      publicationVersionId: input.publicationVersionId,
      versionNumber: input.versionNumber,
      sentCount: input.sentCount,
      failedCount: input.failedCount,
      status: input.status,
    },
  });
}
