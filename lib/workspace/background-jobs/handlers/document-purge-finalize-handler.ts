import {
  WorkspaceBackgroundJobType,
  type PrismaClient,
  type WorkspaceBackgroundJob,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { buildWorkspaceSystemActorMetadata } from "@/lib/workspace/audit/system-actor";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { parseWorkspaceBackgroundJobPayload } from "@/lib/workspace/background-jobs/job-payload";
import {
  markWorkspaceBackgroundJobDead,
  markWorkspaceBackgroundJobRetry,
  markWorkspaceBackgroundJobSucceeded,
} from "@/lib/workspace/background-jobs/job-outcome";
import { evaluateWorkspaceDocumentPurgeEligibility } from "@/lib/workspace/governance/purge-eligibility";
import { normalizeWorkspaceStorageProviderId } from "@/lib/workspace/storage/provider-identity";
import { purgeWorkspaceVersionStorageKeys } from "@/lib/workspace/governance/workspace-purge-storage";

export async function executeDocumentPurgeFinalizeJob(
  job: WorkspaceBackgroundJob,
  deps?: { client?: PrismaClient },
): Promise<void> {
  const client = deps?.client ?? prisma;
  const systemMeta = buildWorkspaceSystemActorMetadata({
    jobType: "document-purge-finalize",
  });

  if (job.type !== WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE) {
    await markWorkspaceBackgroundJobDead(client, job, {
      errorCode: "INVALID_JOB_TYPE",
    });
    return;
  }

  let payload;
  try {
    payload = parseWorkspaceBackgroundJobPayload(
      WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE,
      job.payloadJson,
    );
  } catch {
    await markWorkspaceBackgroundJobDead(client, job, {
      errorCode: "INVALID_PAYLOAD",
    });
    return;
  }

  const documentId = payload.workspaceDocumentId;

  const eligibility = await evaluateWorkspaceDocumentPurgeEligibility(client, {
    tenantId: job.tenantId,
    documentId,
    requireTrashed: true,
  });

  if (eligibility === null) {
    await markWorkspaceBackgroundJobSucceeded(client, job);
    return;
  }

  if (!eligibility.eligible) {
    await writeWorkspaceGovernanceAudit(client, {
      tenantId: job.tenantId,
      actorUserId: null,
      entityType: "WorkspaceDocument",
      entityId: documentId,
      documentId,
      action: WorkspaceAuditAction.PURGE_BLOCKED,
      outcome: "DENIED",
      reason: eligibility.status,
      source: systemMeta.source,
      afterJson: { status: eligibility.status, jobId: job.id },
    });

    await markWorkspaceBackgroundJobDead(client, job, {
      errorCode: "PURGE_NOT_ELIGIBLE",
      source: systemMeta.source,
    });
    return;
  }

  const document = await client.workspaceDocument.findFirst({
    where: { id: documentId, tenantId: job.tenantId },
    select: {
      id: true,
      versions: { select: { storageKey: true, storageProvider: true } },
    },
  });

  if (!document) {
    await markWorkspaceBackgroundJobSucceeded(client, job);
    return;
  }

  const storageLocators = document.versions.map((v) => ({
    storageKey: v.storageKey,
    storageProvider: normalizeWorkspaceStorageProviderId(v.storageProvider),
  }));

  if (!payload.storagePhaseCompleted) {
    const storageResult = await purgeWorkspaceVersionStorageKeys(
      client,
      job.tenantId,
      documentId,
      storageLocators,
    );

    if (!storageResult.ok) {
      await markWorkspaceBackgroundJobRetry(client, job, {
        errorCode: storageResult.kind,
        source: systemMeta.source,
      });
      return;
    }
  }

  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT "id" FROM "WorkspaceDocument"
        WHERE "id" = ${documentId} AND "tenantId" = ${job.tenantId}
        FOR UPDATE
      `;

      const lockedEligibility = await evaluateWorkspaceDocumentPurgeEligibility(
        tx,
        {
          tenantId: job.tenantId,
          documentId,
          requireTrashed: true,
        },
      );

      if (!lockedEligibility?.eligible) {
        throw new Error("PURGE_NOT_ELIGIBLE");
      }

      await tx.workspaceBreakGlassSession.deleteMany({
        where: { tenantId: job.tenantId, workspaceDocumentId: documentId },
      });

      await writeWorkspaceGovernanceAudit(tx, {
        tenantId: job.tenantId,
        actorUserId: null,
        entityType: "WorkspaceDocument",
        entityId: documentId,
        documentId,
        action: WorkspaceAuditAction.PURGE_COMPLETED,
        source: systemMeta.source,
        afterJson: {
          versionCount: storageLocators.length,
          recoveredViaBackgroundJob: true,
          jobId: job.id,
        },
      });

      await tx.workspaceDocument.delete({
        where: { id: documentId },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB_PURGE_FAILED";
    if (message.includes("PURGE_NOT_ELIGIBLE")) {
      await markWorkspaceBackgroundJobDead(client, job, {
        errorCode: "PURGE_NOT_ELIGIBLE",
        source: systemMeta.source,
      });
      return;
    }

    await markWorkspaceBackgroundJobRetry(client, job, {
      errorCode: "DB_PURGE_FAILED",
      source: systemMeta.source,
    });
    return;
  }

  await markWorkspaceBackgroundJobSucceeded(client, job);
}
