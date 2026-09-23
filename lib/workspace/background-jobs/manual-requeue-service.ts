import {
  WorkspaceBackgroundJobStatus,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { hasWorkspaceGovernanceManagePermission } from "@/lib/workspace/governance/break-glass-session-service";

export class WorkspaceBackgroundJobRequeueError extends Error {
  readonly code:
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "NOT_DEAD"
    | "INVALID_INPUT";

  constructor(code: WorkspaceBackgroundJobRequeueError["code"], message: string) {
    super(message);
    this.name = "WorkspaceBackgroundJobRequeueError";
    this.code = code;
  }
}

export async function manuallyRequeueDeadWorkspaceBackgroundJob(input: {
  tenantId: string;
  jobId: string;
  actorUserId: string;
  permissionKeys: readonly string[];
  client?: PrismaClient;
}): Promise<{ jobId: string; status: WorkspaceBackgroundJobStatus }> {
  if (!hasWorkspaceGovernanceManagePermission(input.permissionKeys)) {
    throw new WorkspaceBackgroundJobRequeueError(
      "FORBIDDEN",
      "workspace.governance.manage required",
    );
  }

  const client = input.client ?? prisma;
  const job = await client.workspaceBackgroundJob.findFirst({
    where: { id: input.jobId, tenantId: input.tenantId },
  });

  if (!job) {
    throw new WorkspaceBackgroundJobRequeueError("NOT_FOUND", "Job not found");
  }

  if (job.status !== WorkspaceBackgroundJobStatus.DEAD) {
    throw new WorkspaceBackgroundJobRequeueError(
      "NOT_DEAD",
      "Only DEAD jobs can be manually requeued",
    );
  }

  const now = new Date();

  await client.$transaction(async (tx) => {
    await tx.workspaceBackgroundJob.update({
      where: { id: job.id },
      data: {
        status: WorkspaceBackgroundJobStatus.PENDING,
        availableAt: now,
        attemptCount: 0,
        failedAt: null,
        completedAt: null,
        lastErrorCode: null,
        leaseExpiresAt: null,
        claimedAt: null,
      },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      entityType: "WorkspaceBackgroundJob",
      entityId: job.id,
      action: WorkspaceAuditAction.BACKGROUND_JOB_RETRIED,
      source: "manual-requeue",
      afterJson: {
        previousStatus: WorkspaceBackgroundJobStatus.DEAD,
      },
    });
  });

  return { jobId: job.id, status: WorkspaceBackgroundJobStatus.PENDING };
}
