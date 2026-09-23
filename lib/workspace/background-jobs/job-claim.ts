import { type PrismaClient, type WorkspaceBackgroundJob } from "@prisma/client";

import {
  WORKSPACE_BACKGROUND_JOB_DISPATCH_BATCH_SIZE,
  WORKSPACE_BACKGROUND_JOB_DISPATCH_PER_TENANT_CAP,
  WORKSPACE_BACKGROUND_JOB_LEASE_MS,
} from "@/lib/workspace/background-jobs/job-constants";
export type ClaimedWorkspaceBackgroundJob = WorkspaceBackgroundJob;

export async function claimWorkspaceBackgroundJobs(
  client: PrismaClient,
  input?: {
    now?: Date;
    globalLimit?: number;
    perTenantLimit?: number;
    leaseMs?: number;
  },
): Promise<ClaimedWorkspaceBackgroundJob[]> {
  const now = input?.now ?? new Date();
  const globalLimit =
    input?.globalLimit ?? WORKSPACE_BACKGROUND_JOB_DISPATCH_BATCH_SIZE;
  const perTenantLimit =
    input?.perTenantLimit ?? WORKSPACE_BACKGROUND_JOB_DISPATCH_PER_TENANT_CAP;
  const leaseMs = input?.leaseMs ?? WORKSPACE_BACKGROUND_JOB_LEASE_MS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  const rows = await client.$queryRaw<ClaimedWorkspaceBackgroundJob[]>`
    WITH ranked AS (
      SELECT
        j."id",
        ROW_NUMBER() OVER (
          PARTITION BY j."tenantId"
          ORDER BY j."availableAt" ASC, j."createdAt" ASC
        ) AS rn
      FROM "WorkspaceBackgroundJob" j
      WHERE (
        (
          j."status" IN ('PENDING', 'RETRY')
          AND j."availableAt" <= ${now}
        )
        OR (
          j."status" = 'RUNNING'
          AND j."leaseExpiresAt" IS NOT NULL
          AND j."leaseExpiresAt" < ${now}
        )
      )
    ),
    picked AS (
      SELECT r."id"
      FROM ranked r
      WHERE r.rn <= ${perTenantLimit}
      ORDER BY r."id"
      LIMIT ${globalLimit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "WorkspaceBackgroundJob" AS j
    SET
      "status" = 'RUNNING',
      "claimedAt" = ${now},
      "leaseExpiresAt" = ${leaseExpiresAt},
      "attemptCount" = CASE
        WHEN j."status" IN ('PENDING', 'RETRY') THEN j."attemptCount" + 1
        ELSE j."attemptCount"
      END,
      "updatedAt" = ${now}
    FROM picked
    WHERE j."id" = picked."id"
    RETURNING j.*;
  `;

  return rows;
}
