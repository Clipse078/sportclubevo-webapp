import {
  WorkspaceBackgroundJobType,
  WorkspaceSubtreeOperationStatus,
  WorkspaceSubtreeOperationType,
  type PrismaClient,
  type WorkspaceBackgroundJob,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { buildWorkspaceSystemActorMetadata } from "@/lib/workspace/audit/system-actor";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { parseWorkspaceBackgroundJobPayload } from "@/lib/workspace/background-jobs/job-payload";
import { enqueueSubtreeOperationBatchJob } from "@/lib/workspace/background-jobs/job-enqueue";
import {
  markWorkspaceBackgroundJobDead,
  markWorkspaceBackgroundJobSucceeded,
} from "@/lib/workspace/background-jobs/job-outcome";
import { evaluateWorkspaceFolderPurgeEligibility } from "@/lib/workspace/governance/folder-purge-eligibility";
import {
  purgeWorkspaceDocumentPermanently,
  WorkspaceDocumentPurgeError,
} from "@/lib/workspace/governance/workspace-document-purge-service";
import { WORKSPACE_DELETION_BLOCKED_CODE } from "@/lib/workspace/deletion/deletion-blockers";
import {
  countWorkspaceSubtreeDocumentsRemaining,
  fetchWorkspaceSubtreeDocumentIdsBatch,
  fetchWorkspaceSubtreeLeafFolderIdsBatch,
  trashWorkspaceSubtreeBatch,
} from "@/lib/workspace/subtree/subtree-planner";
import { WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE } from "@/lib/workspace/subtree/subtree-scale-config";

async function markOperationTerminal(
  client: Pick<PrismaClient, "workspaceSubtreeOperation" | "auditLog">,
  input: {
    operationId: string;
    tenantId: string;
    rootFolderId: string;
    status: WorkspaceSubtreeOperationStatus;
    lastErrorCode?: string | null;
    systemSource: string;
  },
): Promise<void> {
  const now = new Date();
  const isSuccess = input.status === WorkspaceSubtreeOperationStatus.SUCCEEDED;
  const isBlocked =
    input.status === WorkspaceSubtreeOperationStatus.PARTIALLY_BLOCKED;

  await client.workspaceSubtreeOperation.update({
    where: { id: input.operationId },
    data: {
      status: input.status,
      completedAt: isSuccess || isBlocked ? now : null,
      failedAt:
        input.status === WorkspaceSubtreeOperationStatus.FAILED ? now : null,
      lastErrorCode: input.lastErrorCode ?? null,
    },
  });

  await writeWorkspaceGovernanceAudit(client, {
    tenantId: input.tenantId,
    actorUserId: null,
    entityType: "WorkspaceSubtreeOperation",
    entityId: input.operationId,
    folderId: input.rootFolderId,
    action: isSuccess
      ? WorkspaceAuditAction.SUBTREE_OPERATION_COMPLETED
      : isBlocked
        ? WorkspaceAuditAction.SUBTREE_OPERATION_BLOCKED
        : WorkspaceAuditAction.SUBTREE_OPERATION_FAILED,
    source: input.systemSource,
    outcome: isSuccess ? "SUCCESS" : isBlocked ? "DENIED" : "FAILURE",
    reason: input.lastErrorCode ?? undefined,
    afterJson: { operationId: input.operationId, status: input.status },
  });
}

async function processFolderPermanentDeleteBatch(
  client: PrismaClient,
  operation: {
    id: string;
    tenantId: string;
    rootFolderId: string;
    requestedByUserId: string;
    processedCount: number;
    blockedCount: number;
    failedCount: number;
  },
  systemSource: string,
): Promise<"CONTINUE" | "DONE" | "BLOCKED" | "FAILED"> {
  const rootEligibility = await evaluateWorkspaceFolderPurgeEligibility(client, {
    tenantId: operation.tenantId,
    folderId: operation.rootFolderId,
  });

  if (!rootEligibility) {
    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.FAILED,
      lastErrorCode: "ROOT_NOT_FOUND",
      systemSource,
    });
    return "FAILED";
  }

  if (!rootEligibility.eligible) {
    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.FAILED,
      lastErrorCode: rootEligibility.status,
      systemSource,
    });
    return "FAILED";
  }

  const docIds = await fetchWorkspaceSubtreeDocumentIdsBatch({
    tenantId: operation.tenantId,
    rootFolderId: operation.rootFolderId,
    limit: WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE,
  });

  if (docIds.length > 0) {
    let batchProcessed = 0;
    let batchBlocked = 0;
    let batchFailed = 0;

    for (const documentId of docIds) {
      try {
        await purgeWorkspaceDocumentPermanently({
          tenantId: operation.tenantId,
          documentId,
          actorUserId: operation.requestedByUserId,
          source: "subtree-operation-batch",
          requireTrashed: true,
        });
        batchProcessed += 1;
      } catch (err) {
        if (err instanceof WorkspaceDocumentPurgeError) {
          if (err.code === WORKSPACE_DELETION_BLOCKED_CODE) {
            batchBlocked += 1;
            continue;
          }
          batchBlocked += 1;
          continue;
        }
        batchFailed += 1;
      }
    }

    await client.workspaceSubtreeOperation.update({
      where: { id: operation.id },
      data: {
        processedCount: operation.processedCount + batchProcessed,
        blockedCount: operation.blockedCount + batchBlocked,
        failedCount: operation.failedCount + batchFailed,
      },
    });

    if (batchBlocked > 0 || batchFailed > 0) {
      await markOperationTerminal(client, {
        operationId: operation.id,
        tenantId: operation.tenantId,
        rootFolderId: operation.rootFolderId,
        status: WorkspaceSubtreeOperationStatus.PARTIALLY_BLOCKED,
        lastErrorCode:
          batchBlocked > 0 ? "DESCENDANT_BLOCKED" : "DESCENDANT_PURGE_FAILED",
        systemSource,
      });
      return "BLOCKED";
    }

    return "CONTINUE";
  }

  const remainingDocs = await countWorkspaceSubtreeDocumentsRemaining({
    tenantId: operation.tenantId,
    rootFolderId: operation.rootFolderId,
  });

  if (remainingDocs > 0) {
    return "CONTINUE";
  }

  const leafFolderIds = await fetchWorkspaceSubtreeLeafFolderIdsBatch({
    tenantId: operation.tenantId,
    rootFolderId: operation.rootFolderId,
    limit: WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE,
  });

  if (leafFolderIds.length === 0) {
    const rootExists = await client.workspaceFolder.findFirst({
      where: { id: operation.rootFolderId, tenantId: operation.tenantId },
      select: { id: true },
    });
    if (!rootExists) {
      await markOperationTerminal(client, {
        operationId: operation.id,
        tenantId: operation.tenantId,
        rootFolderId: operation.rootFolderId,
        status: WorkspaceSubtreeOperationStatus.SUCCEEDED,
        systemSource,
      });
      return "DONE";
    }

    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.PARTIALLY_BLOCKED,
      lastErrorCode: "FOLDER_CYCLE_OR_BLOCKER",
      systemSource,
    });
    return "BLOCKED";
  }

  const deletedFolderCount = await client.$transaction(async (tx) => {
    await tx.workspaceBreakGlassSession.deleteMany({
      where: {
        tenantId: operation.tenantId,
        workspaceFolderId: { in: leafFolderIds },
      },
    });

    const deleted = await tx.workspaceFolder.deleteMany({
      where: { tenantId: operation.tenantId, id: { in: leafFolderIds } },
    });
    return deleted.count;
  });

  if (deletedFolderCount > 0) {
    await client.workspaceSubtreeOperation.update({
      where: { id: operation.id },
      data: {
        processedCount: {
          increment: deletedFolderCount,
        },
      },
    });
  }

  const rootStillThere = await client.workspaceFolder.findFirst({
    where: { id: operation.rootFolderId, tenantId: operation.tenantId },
    select: { id: true },
  });

  if (!rootStillThere) {
    await writeWorkspaceGovernanceAudit(client, {
      tenantId: operation.tenantId,
      actorUserId: operation.requestedByUserId,
      entityType: "WorkspaceFolder",
      entityId: operation.rootFolderId,
      folderId: operation.rootFolderId,
      action: WorkspaceAuditAction.FOLDER_PERMANENTLY_DELETED,
      source: systemSource,
      afterJson: {
        operationId: operation.id,
        asyncSubtreeDelete: true,
      },
    });

    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.SUCCEEDED,
      systemSource,
    });
    return "DONE";
  }

  return "CONTINUE";
}

async function processFolderTrashBatch(
  client: PrismaClient,
  operation: {
    id: string;
    tenantId: string;
    rootFolderId: string;
    requestedByUserId: string;
  },
  systemSource: string,
): Promise<"CONTINUE" | "DONE" | "FAILED"> {
  const root = await client.workspaceFolder.findFirst({
    where: { id: operation.rootFolderId, tenantId: operation.tenantId },
    select: { id: true, trashedAt: true },
  });

  if (!root) {
    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.FAILED,
      lastErrorCode: "ROOT_NOT_FOUND",
      systemSource,
    });
    return "FAILED";
  }

  if (root.trashedAt) {
    await writeWorkspaceGovernanceAudit(client, {
      tenantId: operation.tenantId,
      actorUserId: operation.requestedByUserId,
      entityType: "WorkspaceFolder",
      entityId: operation.rootFolderId,
      folderId: operation.rootFolderId,
      action: WorkspaceAuditAction.FOLDER_TRASHED,
      source: systemSource,
      afterJson: { operationId: operation.id, asyncSubtreeTrash: true },
    });

    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.SUCCEEDED,
      systemSource,
    });
    return "DONE";
  }

  const trashedAt = new Date();
  const batch = await trashWorkspaceSubtreeBatch({
    tenantId: operation.tenantId,
    rootFolderId: operation.rootFolderId,
    actorUserId: operation.requestedByUserId,
    trashedAt,
    folderBatchSize: WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE,
    documentBatchSize: WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE,
  });

  if (batch.trashedFolders === 0 && batch.trashedDocuments === 0) {
    await writeWorkspaceGovernanceAudit(client, {
      tenantId: operation.tenantId,
      actorUserId: operation.requestedByUserId,
      entityType: "WorkspaceFolder",
      entityId: operation.rootFolderId,
      folderId: operation.rootFolderId,
      action: WorkspaceAuditAction.FOLDER_TRASHED,
      source: systemSource,
      afterJson: { operationId: operation.id, asyncSubtreeTrash: true },
    });

    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.SUCCEEDED,
      systemSource,
    });
    return "DONE";
  }

  await client.workspaceSubtreeOperation.update({
    where: { id: operation.id },
    data: {
      processedCount: {
        increment: batch.trashedFolders + batch.trashedDocuments,
      },
    },
  });

  return "CONTINUE";
}

export async function executeSubtreeOperationBatchJob(
  job: WorkspaceBackgroundJob,
  deps?: { client?: PrismaClient },
): Promise<void> {
  const client = deps?.client ?? prisma;
  const systemMeta = buildWorkspaceSystemActorMetadata({
    jobType: "subtree-operation-batch",
  });

  if (job.type !== WorkspaceBackgroundJobType.SUBTREE_OPERATION_BATCH) {
    await markWorkspaceBackgroundJobDead(client, job, {
      errorCode: "INVALID_JOB_TYPE",
    });
    return;
  }

  let payload;
  try {
    payload = parseWorkspaceBackgroundJobPayload(
      WorkspaceBackgroundJobType.SUBTREE_OPERATION_BATCH,
      job.payloadJson,
    );
  } catch {
    await markWorkspaceBackgroundJobDead(client, job, {
      errorCode: "INVALID_PAYLOAD",
    });
    return;
  }

  const operation = await client.workspaceSubtreeOperation.findFirst({
    where: { id: payload.operationId, tenantId: job.tenantId },
  });

  if (!operation) {
    await markWorkspaceBackgroundJobSucceeded(client, job);
    return;
  }

  if (
    operation.status === WorkspaceSubtreeOperationStatus.SUCCEEDED ||
    operation.status === WorkspaceSubtreeOperationStatus.FAILED ||
    operation.status === WorkspaceSubtreeOperationStatus.PARTIALLY_BLOCKED
  ) {
    await markWorkspaceBackgroundJobSucceeded(client, job);
    return;
  }

  if (operation.status === WorkspaceSubtreeOperationStatus.PENDING) {
    await client.workspaceSubtreeOperation.update({
      where: { id: operation.id },
      data: {
        status: WorkspaceSubtreeOperationStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    await writeWorkspaceGovernanceAudit(client, {
      tenantId: operation.tenantId,
      actorUserId: null,
      entityType: "WorkspaceSubtreeOperation",
      entityId: operation.id,
      folderId: operation.rootFolderId,
      action: WorkspaceAuditAction.SUBTREE_OPERATION_STARTED,
      source: systemMeta.source,
      afterJson: { operationId: operation.id },
    });
  }

  let batchOutcome: "CONTINUE" | "DONE" | "BLOCKED" | "FAILED" = "CONTINUE";

  if (operation.type === WorkspaceSubtreeOperationType.FOLDER_PERMANENT_DELETE) {
    batchOutcome = await processFolderPermanentDeleteBatch(
      client,
      operation,
      systemMeta.source,
    );
  } else if (operation.type === WorkspaceSubtreeOperationType.FOLDER_TRASH) {
    const trashOutcome = await processFolderTrashBatch(
      client,
      operation,
      systemMeta.source,
    );
    batchOutcome = trashOutcome;
  } else {
    await markOperationTerminal(client, {
      operationId: operation.id,
      tenantId: operation.tenantId,
      rootFolderId: operation.rootFolderId,
      status: WorkspaceSubtreeOperationStatus.FAILED,
      lastErrorCode: "UNSUPPORTED_OPERATION_TYPE",
      systemSource: systemMeta.source,
    });
    batchOutcome = "FAILED";
  }

  if (batchOutcome === "CONTINUE") {
    await enqueueSubtreeOperationBatchJob(client, {
      tenantId: job.tenantId,
      operationId: operation.id,
      source: systemMeta.source,
    });
  }

  await markWorkspaceBackgroundJobSucceeded(client, job);
}
