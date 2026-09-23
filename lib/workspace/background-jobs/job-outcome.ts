import {
  WorkspaceBackgroundJobStatus,
  type PrismaClient,
  type WorkspaceBackgroundJob,
} from "@prisma/client";

import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { assertLegalWorkspaceBackgroundJobTransition } from "@/lib/workspace/background-jobs/job-status";
import {
  classifyJobExecutionErrorCode,
  computeWorkspaceBackgroundJobRetryAvailableAt,
} from "@/lib/workspace/background-jobs/retry-policy";

type OutcomeWriter = Pick<PrismaClient, "workspaceBackgroundJob" | "auditLog">;

function truncateErrorCode(code: string): string {
  const normalized = code.trim().slice(0, 120);
  return normalized || "UNKNOWN";
}

export async function markWorkspaceBackgroundJobSucceeded(
  client: OutcomeWriter,
  job: Pick<WorkspaceBackgroundJob, "id" | "tenantId" | "status">,
): Promise<void> {
  const now = new Date();
  assertLegalWorkspaceBackgroundJobTransition({
    from: job.status,
    to: WorkspaceBackgroundJobStatus.SUCCEEDED,
  });

  await client.workspaceBackgroundJob.update({
    where: { id: job.id },
    data: {
      status: WorkspaceBackgroundJobStatus.SUCCEEDED,
      completedAt: now,
      leaseExpiresAt: null,
      lastErrorCode: null,
    },
  });
}

export async function markWorkspaceBackgroundJobRetry(
  client: OutcomeWriter,
  job: WorkspaceBackgroundJob,
  input: {
    errorCode: string;
    source?: string;
  },
): Promise<void> {
  const failureClass = classifyJobExecutionErrorCode(input.errorCode);
  const now = new Date();

  if (
    failureClass === "NON_RETRYABLE" ||
    job.attemptCount >= job.maxAttempts
  ) {
    await markWorkspaceBackgroundJobDead(client, job, input);
    return;
  }

  assertLegalWorkspaceBackgroundJobTransition({
    from: job.status,
    to: WorkspaceBackgroundJobStatus.RETRY,
  });

  const availableAt = computeWorkspaceBackgroundJobRetryAvailableAt(
    job.attemptCount,
    now,
  );

  await client.workspaceBackgroundJob.update({
    where: { id: job.id },
    data: {
      status: WorkspaceBackgroundJobStatus.RETRY,
      availableAt,
      leaseExpiresAt: null,
      lastErrorCode: truncateErrorCode(input.errorCode),
    },
  });

  await writeWorkspaceGovernanceAudit(client, {
    tenantId: job.tenantId,
    actorUserId: null,
    entityType: "WorkspaceBackgroundJob",
    entityId: job.id,
    action: WorkspaceAuditAction.BACKGROUND_JOB_RETRIED,
    source: input.source ?? "worker",
    afterJson: {
      errorCode: truncateErrorCode(input.errorCode),
      attemptCount: job.attemptCount,
      availableAt: availableAt.toISOString(),
    },
  });
}

export async function markWorkspaceBackgroundJobDead(
  client: OutcomeWriter,
  job: Pick<
    WorkspaceBackgroundJob,
    "id" | "tenantId" | "status" | "attemptCount" | "maxAttempts"
  >,
  input: {
    errorCode: string;
    source?: string;
  },
): Promise<void> {
  const now = new Date();
  assertLegalWorkspaceBackgroundJobTransition({
    from: job.status,
    to: WorkspaceBackgroundJobStatus.DEAD,
  });

  await client.workspaceBackgroundJob.update({
    where: { id: job.id },
    data: {
      status: WorkspaceBackgroundJobStatus.DEAD,
      failedAt: now,
      leaseExpiresAt: null,
      lastErrorCode: truncateErrorCode(input.errorCode),
    },
  });

  await writeWorkspaceGovernanceAudit(client, {
    tenantId: job.tenantId,
    actorUserId: null,
    entityType: "WorkspaceBackgroundJob",
    entityId: job.id,
    action: WorkspaceAuditAction.BACKGROUND_JOB_DEAD,
    source: input.source ?? "worker",
    afterJson: {
      errorCode: truncateErrorCode(input.errorCode),
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
    },
  });
}
