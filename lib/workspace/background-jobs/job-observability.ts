import {
  WorkspaceBackgroundJobStatus,
  WorkspaceBackgroundJobType,
  WorkspaceDocumentVersionScanState,
  WorkspaceSubtreeOperationStatus,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type WorkspaceBackgroundJobQueueHealth = {
  pending: number;
  running: number;
  retry: number;
  dead: number;
  oldestPendingAt: string | null;
  scanPending: number;
  scanFailed: number;
  scanInfected: number;
  purgeFinalizeBacklog: number;
  providerFailureJobs: number;
  subtreeOperationsPending: number;
  subtreeOperationsRunning: number;
  subtreeOperationsBlocked: number;
  subtreeOperationsFailed: number;
  oldestSubtreeOperationPendingAt: string | null;
};

export async function getWorkspaceBackgroundJobQueueHealth(
  tenantId: string,
  client: Pick<
    PrismaClient,
    | "workspaceBackgroundJob"
    | "workspaceDocumentVersionScan"
    | "workspaceSubtreeOperation"
  > = prisma,
): Promise<WorkspaceBackgroundJobQueueHealth> {
  const normalizedTenantId = tenantId.trim();
  if (!normalizedTenantId) {
    throw new Error("tenantId is required");
  }

  const [
    pending,
    running,
    retry,
    dead,
    oldestPending,
    scanPending,
    scanFailed,
    scanInfected,
    purgeFinalizeBacklog,
    providerFailureJobs,
    subtreeOperationsPending,
    subtreeOperationsRunning,
    subtreeOperationsBlocked,
    subtreeOperationsFailed,
    oldestSubtreeOperationPending,
  ] = await Promise.all([
    client.workspaceBackgroundJob.count({
      where: { tenantId: normalizedTenantId, status: WorkspaceBackgroundJobStatus.PENDING },
    }),
    client.workspaceBackgroundJob.count({
      where: { tenantId: normalizedTenantId, status: WorkspaceBackgroundJobStatus.RUNNING },
    }),
    client.workspaceBackgroundJob.count({
      where: { tenantId: normalizedTenantId, status: WorkspaceBackgroundJobStatus.RETRY },
    }),
    client.workspaceBackgroundJob.count({
      where: { tenantId: normalizedTenantId, status: WorkspaceBackgroundJobStatus.DEAD },
    }),
    client.workspaceBackgroundJob.findFirst({
      where: {
        tenantId: normalizedTenantId,
        status: WorkspaceBackgroundJobStatus.PENDING,
      },
      orderBy: { availableAt: "asc" },
      select: { availableAt: true },
    }),
    client.workspaceDocumentVersionScan.count({
      where: {
        tenantId: normalizedTenantId,
        state: WorkspaceDocumentVersionScanState.PENDING,
      },
    }),
    client.workspaceDocumentVersionScan.count({
      where: {
        tenantId: normalizedTenantId,
        state: WorkspaceDocumentVersionScanState.SCAN_FAILED,
      },
    }),
    client.workspaceDocumentVersionScan.count({
      where: {
        tenantId: normalizedTenantId,
        state: WorkspaceDocumentVersionScanState.INFECTED,
      },
    }),
    client.workspaceBackgroundJob.count({
      where: {
        tenantId: normalizedTenantId,
        type: WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE,
        status: {
          in: [
            WorkspaceBackgroundJobStatus.PENDING,
            WorkspaceBackgroundJobStatus.RETRY,
            WorkspaceBackgroundJobStatus.RUNNING,
          ],
        },
      },
    }),
    client.workspaceBackgroundJob.count({
      where: {
        tenantId: normalizedTenantId,
        status: {
          in: [
            WorkspaceBackgroundJobStatus.RETRY,
            WorkspaceBackgroundJobStatus.DEAD,
          ],
        },
        lastErrorCode: {
          in: ["SCANNER_NOT_CONFIGURED", "PROVIDER_OUTAGE", "PROVIDER_TIMEOUT"],
        },
      },
    }),
    client.workspaceSubtreeOperation.count({
      where: {
        tenantId: normalizedTenantId,
        status: WorkspaceSubtreeOperationStatus.PENDING,
      },
    }),
    client.workspaceSubtreeOperation.count({
      where: {
        tenantId: normalizedTenantId,
        status: WorkspaceSubtreeOperationStatus.RUNNING,
      },
    }),
    client.workspaceSubtreeOperation.count({
      where: {
        tenantId: normalizedTenantId,
        status: WorkspaceSubtreeOperationStatus.PARTIALLY_BLOCKED,
      },
    }),
    client.workspaceSubtreeOperation.count({
      where: {
        tenantId: normalizedTenantId,
        status: WorkspaceSubtreeOperationStatus.FAILED,
      },
    }),
    client.workspaceSubtreeOperation.findFirst({
      where: {
        tenantId: normalizedTenantId,
        status: WorkspaceSubtreeOperationStatus.PENDING,
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    pending,
    running,
    retry,
    dead,
    oldestPendingAt: oldestPending?.availableAt.toISOString() ?? null,
    scanPending,
    scanFailed,
    scanInfected,
    purgeFinalizeBacklog,
    providerFailureJobs,
    subtreeOperationsPending,
    subtreeOperationsRunning,
    subtreeOperationsBlocked,
    subtreeOperationsFailed,
    oldestSubtreeOperationPendingAt:
      oldestSubtreeOperationPending?.createdAt.toISOString() ?? null,
  };
}
