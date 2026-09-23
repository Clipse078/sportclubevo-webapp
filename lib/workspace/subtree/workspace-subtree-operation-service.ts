/**
 * WORKSPACE-08-07 — durable subtree operation identity + enqueue.
 */

import {
  WorkspaceSubtreeOperationStatus,
  WorkspaceSubtreeOperationType,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { enqueueSubtreeOperationBatchJob } from "@/lib/workspace/background-jobs/job-enqueue";
import { probeWorkspaceSubtreeNodeCount } from "@/lib/workspace/subtree/subtree-planner";
import {
  workspaceSubtreeRequiresAsyncExecution,
  type WorkspaceSubtreeNodeCount,
} from "@/lib/workspace/subtree/subtree-scale-config";
import type { WorkspaceSubtreeOperationStatusDto } from "@/lib/workspace/subtree/subtree-operation-dto";

export class WorkspaceSubtreeOperationError extends Error {
  readonly code:
    | "INVALID_INPUT"
    | "ROOT_NOT_FOUND"
    | "TENANT_FORBIDDEN"
    | "DUPLICATE_ACTIVE"
    | "OPERATION_NOT_FOUND";

  constructor(
    code: WorkspaceSubtreeOperationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceSubtreeOperationError";
    this.code = code;
  }
}

export function buildWorkspaceSubtreeOperationDeduplicationKey(input: {
  type: WorkspaceSubtreeOperationType;
  rootFolderId: string;
}): string {
  return `SUBTREE_OP:${input.type}:${input.rootFolderId.trim()}`;
}

export async function planWorkspaceSubtreeOperation(input: {
  tenantId: string;
  rootFolderId: string;
}): Promise<WorkspaceSubtreeNodeCount> {
  return probeWorkspaceSubtreeNodeCount({
    tenantId: input.tenantId,
    rootFolderId: input.rootFolderId,
  });
}

export function shouldExecuteWorkspaceSubtreeAsync(
  count: WorkspaceSubtreeNodeCount,
): boolean {
  return workspaceSubtreeRequiresAsyncExecution(count);
}

export async function createWorkspaceSubtreeOperation(input: {
  tenantId: string;
  rootFolderId: string;
  type: WorkspaceSubtreeOperationType;
  requestedByUserId: string;
  totalEstimated?: number | null;
  client?: Pick<
    PrismaClient,
    | "workspaceSubtreeOperation"
    | "auditLog"
    | "workspaceBackgroundJob"
    | "workspaceFolder"
  >;
}): Promise<{ operationId: string; created: boolean }> {
  const tenantId = input.tenantId.trim();
  const rootFolderId = input.rootFolderId.trim();
  const requestedByUserId = input.requestedByUserId.trim();

  if (!tenantId || !rootFolderId || !requestedByUserId) {
    throw new WorkspaceSubtreeOperationError(
      "INVALID_INPUT",
      "tenantId, rootFolderId, and requestedByUserId are required.",
    );
  }

  const client = input.client ?? prisma;

  const root = await client.workspaceFolder.findFirst({
    where: { id: rootFolderId, tenantId },
    select: { id: true },
  });

  if (!root) {
    throw new WorkspaceSubtreeOperationError(
      "ROOT_NOT_FOUND",
      "Root folder not found.",
    );
  }

  const active = await client.workspaceSubtreeOperation.findFirst({
    where: {
      tenantId,
      rootFolderId,
      type: input.type,
      status: {
        in: [
          WorkspaceSubtreeOperationStatus.PENDING,
          WorkspaceSubtreeOperationStatus.RUNNING,
        ],
      },
    },
    select: { id: true },
  });

  if (active) {
    return { operationId: active.id, created: false };
  }

  const operation = await client.workspaceSubtreeOperation.create({
    data: {
      tenantId,
      rootFolderId,
      type: input.type,
      status: WorkspaceSubtreeOperationStatus.PENDING,
      requestedByUserId,
      totalEstimated: input.totalEstimated ?? null,
    },
    select: { id: true },
  });

  await writeWorkspaceGovernanceAudit(client, {
    tenantId,
    actorUserId: requestedByUserId,
    entityType: "WorkspaceSubtreeOperation",
    entityId: operation.id,
    folderId: rootFolderId,
    action: WorkspaceAuditAction.SUBTREE_OPERATION_REQUESTED,
    afterJson: {
      operationId: operation.id,
      type: input.type,
      rootFolderId,
    },
  });

  await enqueueSubtreeOperationBatchJob(client, {
    tenantId,
    operationId: operation.id,
    actorUserId: requestedByUserId,
    source: "subtree-operation-create",
  });

  return { operationId: operation.id, created: true };
}

export function toWorkspaceSubtreeOperationStatusDto(
  row: {
    id: string;
    type: WorkspaceSubtreeOperationType;
    status: WorkspaceSubtreeOperationStatus;
    processedCount: number;
    totalEstimated: number | null;
    blockedCount: number;
    failedCount: number;
    createdAt: Date;
    completedAt: Date | null;
  },
): WorkspaceSubtreeOperationStatusDto {
  return {
    operationId: row.id,
    type: row.type,
    status: row.status,
    processedCount: row.processedCount,
    totalEstimated: row.totalEstimated,
    blockedCount: row.blockedCount,
    failedCount: row.failedCount,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}
