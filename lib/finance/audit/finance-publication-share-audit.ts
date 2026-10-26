/**
 * FIN-06D — publication share lifecycle audit (no raw tokens).
 */

import { writeAuditRecord } from "@/lib/audit/audit-record";
import type { PrismaClient } from "@prisma/client";

export const FINANCE_PUBLICATION_SHARE_AUDIT = {
  moduleKey: "finance",
  entityType: "FinancePublicationShare",
  actions: {
    created: "SHARE_CREATED",
    revoked: "SHARE_REVOKED",
    accessed: "SHARE_ACCESSED",
  },
} as const;

type AuditWriter = Pick<PrismaClient, "auditLog">;

export async function auditFinancePublicationShareCreated(
  client: AuditWriter,
  input: {
    tenantId: string;
    actorUserId: string;
    shareId: string;
    publicationId: string;
    publicationVersionId: string;
    versionNumber: number;
    expiresAt: Date | null;
  },
): Promise<void> {
  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: FINANCE_PUBLICATION_SHARE_AUDIT.moduleKey,
    entityType: FINANCE_PUBLICATION_SHARE_AUDIT.entityType,
    entityId: input.shareId,
    action: FINANCE_PUBLICATION_SHARE_AUDIT.actions.created,
    metadataJson: {
      publicationId: input.publicationId,
      publicationVersionId: input.publicationVersionId,
      versionNumber: input.versionNumber,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    },
  });
}

export async function auditFinancePublicationShareRevoked(
  client: AuditWriter,
  input: {
    tenantId: string;
    actorUserId: string;
    shareId: string;
    publicationId: string;
    publicationVersionId: string;
    versionNumber: number;
  },
): Promise<void> {
  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: FINANCE_PUBLICATION_SHARE_AUDIT.moduleKey,
    entityType: FINANCE_PUBLICATION_SHARE_AUDIT.entityType,
    entityId: input.shareId,
    action: FINANCE_PUBLICATION_SHARE_AUDIT.actions.revoked,
    metadataJson: {
      publicationId: input.publicationId,
      publicationVersionId: input.publicationVersionId,
      versionNumber: input.versionNumber,
    },
  });
}

export async function auditFinancePublicationShareAccessed(
  client: AuditWriter,
  input: {
    tenantId: string;
    shareId: string;
    publicationId: string;
    publicationVersionId: string;
    versionNumber: number;
    accessCount: number;
  },
): Promise<void> {
  await writeAuditRecord(client, {
    tenantId: input.tenantId,
    actorUserId: null,
    moduleKey: FINANCE_PUBLICATION_SHARE_AUDIT.moduleKey,
    entityType: FINANCE_PUBLICATION_SHARE_AUDIT.entityType,
    entityId: input.shareId,
    action: FINANCE_PUBLICATION_SHARE_AUDIT.actions.accessed,
    metadataJson: {
      publicationId: input.publicationId,
      publicationVersionId: input.publicationVersionId,
      versionNumber: input.versionNumber,
      accessCount: input.accessCount,
    },
  });
}
