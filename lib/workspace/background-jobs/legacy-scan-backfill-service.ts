/**
 * WORKSPACE-08-05 — explicit tenant-scoped legacy NOT_SCANNED enqueue seam.
 * Never invoked from migrations or deployment hooks.
 */

import {
  WorkspaceDocumentVersionScanState,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { WORKSPACE_LEGACY_SCAN_BACKFILL_DEFAULT_BATCH_SIZE } from "@/lib/workspace/background-jobs/job-constants";
import { enqueueMalwareScanVersionJob } from "@/lib/workspace/background-jobs/job-enqueue";
import { createPendingWorkspaceVersionScanRecord } from "@/lib/workspace/malware-scan/version-scan-write";

export type LegacyScanBackfillSummary = {
  tenantId: string;
  scanned: number;
  enqueued: number;
  skippedExistingScan: number;
  skippedExistingJob: number;
  nextCursorVersionId: string | null;
};

export async function enqueueLegacyNotScannedVersionScanJobsForTenant(input: {
  tenantId: string;
  actorUserId: string;
  batchSize?: number;
  cursorVersionId?: string | null;
  client?: PrismaClient;
}): Promise<LegacyScanBackfillSummary> {
  const client = input.client ?? prisma;
  const tenantId = input.tenantId.trim();
  const batchSize =
    input.batchSize ?? WORKSPACE_LEGACY_SCAN_BACKFILL_DEFAULT_BATCH_SIZE;

  const versions = await client.workspaceDocumentVersion.findMany({
    where: {
      tenantId,
      ...(input.cursorVersionId
        ? { id: { gt: input.cursorVersionId } }
        : {}),
      OR: [
        { malwareScan: null },
        {
          malwareScan: {
            state: WorkspaceDocumentVersionScanState.NOT_SCANNED,
          },
        },
      ],
    },
    orderBy: { id: "asc" },
    take: batchSize,
    select: {
      id: true,
      documentId: true,
      malwareScan: { select: { state: true } },
    },
  });

  const summary: LegacyScanBackfillSummary = {
    tenantId,
    scanned: versions.length,
    enqueued: 0,
    skippedExistingScan: 0,
    skippedExistingJob: 0,
    nextCursorVersionId:
      versions.length > 0 ? versions[versions.length - 1]!.id : null,
  };

  for (const version of versions) {
    if (
      version.malwareScan &&
      version.malwareScan.state !== WorkspaceDocumentVersionScanState.NOT_SCANNED
    ) {
      summary.skippedExistingScan += 1;
      continue;
    }

    let jobCreated = false;

    await client.$transaction(async (tx) => {
      if (!version.malwareScan) {
        await createPendingWorkspaceVersionScanRecord(tx, {
          tenantId,
          workspaceDocumentVersionId: version.id,
          documentId: version.documentId,
          actorUserId: input.actorUserId,
          source: "legacy-scan-backfill",
        });
        jobCreated = true;
      } else {
        await tx.workspaceDocumentVersionScan.updateMany({
          where: {
            tenantId,
            workspaceDocumentVersionId: version.id,
            state: WorkspaceDocumentVersionScanState.NOT_SCANNED,
          },
          data: {
            state: WorkspaceDocumentVersionScanState.PENDING,
            requestedAt: new Date(),
          },
        });

        const job = await enqueueMalwareScanVersionJob(tx, {
          tenantId,
          workspaceDocumentVersionId: version.id,
          workspaceDocumentId: version.documentId,
          actorUserId: input.actorUserId,
          source: "legacy-scan-backfill",
        });
        jobCreated = job.created;
      }
    });

    if (jobCreated) {
      summary.enqueued += 1;
    } else {
      summary.skippedExistingJob += 1;
    }
  }

  if (summary.enqueued > 0) {
    await writeWorkspaceGovernanceAudit(client, {
      tenantId,
      actorUserId: input.actorUserId,
      entityType: "WorkspaceBackgroundJob",
      entityId: tenantId,
      action: WorkspaceAuditAction.SCAN_REQUESTED,
      source: "legacy-scan-backfill",
      afterJson: {
        enqueued: summary.enqueued,
        scanned: summary.scanned,
        batchSize,
      },
    });
  }

  return summary;
}
