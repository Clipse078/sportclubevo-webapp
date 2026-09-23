import {
  WorkspaceBackgroundJobStatus,
  WorkspaceBackgroundJobType,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { WORKSPACE_BACKGROUND_JOB_DEFAULT_MAX_ATTEMPTS } from "@/lib/workspace/background-jobs/job-constants";
import {
  assertWorkspaceBackgroundJobPayloadSafeForPersistence,
  buildDocumentPurgeFinalizeDeduplicationKey,
  buildMalwareScanVersionDeduplicationKey,
  type ParsedWorkspaceBackgroundJobPayload,
} from "@/lib/workspace/background-jobs/job-payload";

type JobWriter = Pick<PrismaClient, "workspaceBackgroundJob" | "auditLog">;

export type EnqueueWorkspaceBackgroundJobInput<
  T extends WorkspaceBackgroundJobType,
> = {
  tenantId: string;
  type: T;
  payload: ParsedWorkspaceBackgroundJobPayload<T>;
  deduplicationKey?: string | null;
  correlationId?: string | null;
  maxAttempts?: number;
  availableAt?: Date;
  actorUserId?: string | null;
  source?: string;
};

export async function enqueueWorkspaceBackgroundJob<
  T extends WorkspaceBackgroundJobType,
>(
  client: JobWriter,
  input: EnqueueWorkspaceBackgroundJobInput<T>,
): Promise<{ id: string; created: boolean }> {
  const tenantId = input.tenantId.trim();
  if (!tenantId) {
    throw new Error("tenantId is required");
  }

  assertWorkspaceBackgroundJobPayloadSafeForPersistence(input.payload);

  const payloadJson = input.payload as Prisma.InputJsonValue;
  const deduplicationKey = input.deduplicationKey?.trim() || null;

  if (deduplicationKey) {
    const existing = await client.workspaceBackgroundJob.findFirst({
      where: {
        tenantId,
        deduplicationKey,
        status: {
          in: [
            WorkspaceBackgroundJobStatus.PENDING,
            WorkspaceBackgroundJobStatus.RUNNING,
            WorkspaceBackgroundJobStatus.RETRY,
          ],
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { id: existing.id, created: false };
    }
  }

  const created = await client.workspaceBackgroundJob.create({
    data: {
      tenantId,
      type: input.type,
      status: WorkspaceBackgroundJobStatus.PENDING,
      payloadJson,
      deduplicationKey,
      correlationId: input.correlationId?.trim() || null,
      maxAttempts:
        input.maxAttempts ?? WORKSPACE_BACKGROUND_JOB_DEFAULT_MAX_ATTEMPTS,
      availableAt: input.availableAt ?? new Date(),
    },
    select: { id: true },
  });

  await writeWorkspaceGovernanceAudit(client, {
    tenantId,
    actorUserId: input.actorUserId ?? null,
    entityType: "WorkspaceBackgroundJob",
    entityId: created.id,
    action: WorkspaceAuditAction.BACKGROUND_JOB_CREATED,
    source: input.source ?? "system",
    afterJson: {
      type: input.type,
      deduplicationKey,
    },
  });

  return { id: created.id, created: true };
}

export async function enqueueMalwareScanVersionJob(
  client: JobWriter,
  input: {
    tenantId: string;
    workspaceDocumentVersionId: string;
    workspaceDocumentId: string;
    actorUserId?: string | null;
    source?: string;
  },
): Promise<{ id: string; created: boolean }> {
  return enqueueWorkspaceBackgroundJob(client, {
    tenantId: input.tenantId,
    type: WorkspaceBackgroundJobType.MALWARE_SCAN_VERSION,
    payload: {
      v: 1,
      workspaceDocumentVersionId: input.workspaceDocumentVersionId,
      workspaceDocumentId: input.workspaceDocumentId,
    },
    deduplicationKey: buildMalwareScanVersionDeduplicationKey(
      input.workspaceDocumentVersionId,
    ),
    actorUserId: input.actorUserId,
    source: input.source,
  });
}

export async function enqueueDocumentPurgeFinalizeJob(
  client: JobWriter,
  input: {
    tenantId: string;
    workspaceDocumentId: string;
    storagePhaseCompleted: boolean;
    actorUserId?: string | null;
    source?: string;
  },
): Promise<{ id: string; created: boolean }> {
  return enqueueWorkspaceBackgroundJob(client, {
    tenantId: input.tenantId,
    type: WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE,
    payload: {
      v: 1,
      workspaceDocumentId: input.workspaceDocumentId,
      storagePhaseCompleted: input.storagePhaseCompleted,
    },
    deduplicationKey: buildDocumentPurgeFinalizeDeduplicationKey(
      input.workspaceDocumentId,
    ),
    actorUserId: input.actorUserId,
    source: input.source,
  });
}
