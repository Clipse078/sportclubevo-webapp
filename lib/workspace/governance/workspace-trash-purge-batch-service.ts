/**
 * WORKSPACE-08-03 — bounded tenant-scoped trash purge batches (cron-safe).
 */

import { prisma } from "@/lib/db/prisma";
import { buildWorkspaceSystemActorMetadata } from "@/lib/workspace/audit/system-actor";
import { workspaceTrashedDocumentPurgeCandidateWhere } from "@/lib/workspace/governance/purge-eligibility";
import { resolveWorkspaceTrashRetentionDays } from "@/lib/workspace/governance/trash-retention-policy-service";
import {
  purgeWorkspaceDocumentPermanently,
  WorkspaceDocumentPurgeError,
} from "@/lib/workspace/governance/workspace-document-purge-service";

export const WORKSPACE_TRASH_PURGE_DEFAULT_BATCH_SIZE = 25;

export type WorkspaceTrashPurgeBatchSummary = {
  tenantId: string;
  scanned: number;
  purged: number;
  skipped: number;
  alreadyPurged: number;
  failed: number;
};

export async function purgeExpiredTrashedWorkspaceDocumentsForTenant(input: {
  tenantId: string;
  batchSize?: number;
  now?: Date;
}): Promise<WorkspaceTrashPurgeBatchSummary> {
  const batchSize = input.batchSize ?? WORKSPACE_TRASH_PURGE_DEFAULT_BATCH_SIZE;
  const retentionDays = await resolveWorkspaceTrashRetentionDays(
    prisma,
    input.tenantId,
  );

  const candidates = await prisma.workspaceDocument.findMany({
    where: {
      tenantId: input.tenantId,
      ...workspaceTrashedDocumentPurgeCandidateWhere(
        retentionDays,
        input.now,
      ),
    },
    select: { id: true },
    orderBy: { trashedAt: "asc" },
    take: batchSize,
  });

  const summary: WorkspaceTrashPurgeBatchSummary = {
    tenantId: input.tenantId,
    scanned: candidates.length,
    purged: 0,
    skipped: 0,
    alreadyPurged: 0,
    failed: 0,
  };

  const systemMeta = buildWorkspaceSystemActorMetadata({ jobType: "workspace-trash-purge" });

  for (const candidate of candidates) {
    try {
      const result = await purgeWorkspaceDocumentPermanently({
        tenantId: input.tenantId,
        documentId: candidate.id,
        actorUserId: null,
        source: systemMeta.source,
        requireTrashed: true,
        skipIfAlreadyMissing: true,
      });

      if (result.alreadyPurged) {
        summary.alreadyPurged += 1;
      } else {
        summary.purged += 1;
      }
    } catch (err) {
      if (err instanceof WorkspaceDocumentPurgeError) {
        if (err.code === "NOT_ELIGIBLE" || err.code === "RESOURCE_REFERENCED") {
          summary.skipped += 1;
          continue;
        }
      }
      summary.failed += 1;
    }
  }

  return summary;
}

export async function purgeExpiredTrashedWorkspaceDocumentsAllTenants(input?: {
  batchSizePerTenant?: number;
  maxTenants?: number;
}): Promise<{ tenants: WorkspaceTrashPurgeBatchSummary[] }> {
  const batchSize = input?.batchSizePerTenant ?? WORKSPACE_TRASH_PURGE_DEFAULT_BATCH_SIZE;
  const maxTenants = input?.maxTenants ?? 50;

  const tenantRows = await prisma.workspaceDocument.findMany({
    where: { status: "TRASHED", trashedAt: { not: null } },
    distinct: ["tenantId"],
    select: { tenantId: true },
    take: maxTenants,
  });

  const tenants: WorkspaceTrashPurgeBatchSummary[] = [];
  for (const row of tenantRows) {
    tenants.push(
      await purgeExpiredTrashedWorkspaceDocumentsForTenant({
        tenantId: row.tenantId,
        batchSize,
      }),
    );
  }

  return { tenants };
}
