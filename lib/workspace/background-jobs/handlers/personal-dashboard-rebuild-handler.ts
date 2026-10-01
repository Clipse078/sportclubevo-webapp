import {
  WorkspaceBackgroundJobType,
  type PrismaClient,
  type WorkspaceBackgroundJob,
} from "@prisma/client";

import { rebuildPersonalDashboardReadModel } from "@/lib/dashboard/read-model/rebuild";
import { parseWorkspaceBackgroundJobPayload } from "@/lib/workspace/background-jobs/job-payload";
import {
  markWorkspaceBackgroundJobDead,
  markWorkspaceBackgroundJobSucceeded,
} from "@/lib/workspace/background-jobs/job-outcome";

export async function executePersonalDashboardRebuildJob(
  job: WorkspaceBackgroundJob,
  ctx: { client: PrismaClient },
): Promise<void> {
  if (job.type !== WorkspaceBackgroundJobType.PERSONAL_DASHBOARD_REBUILD) {
    await markWorkspaceBackgroundJobDead(ctx.client, job, {
      errorCode: "WRONG_JOB_TYPE",
    });
    return;
  }

  let payload;
  try {
    payload = parseWorkspaceBackgroundJobPayload(
      WorkspaceBackgroundJobType.PERSONAL_DASHBOARD_REBUILD,
      job.payloadJson,
    );
  } catch {
    await markWorkspaceBackgroundJobDead(ctx.client, job, {
      errorCode: "INVALID_PAYLOAD",
    });
    return;
  }

  const tenant = await ctx.client.tenant.findUnique({
    where: { id: job.tenantId },
    select: { locale: true, timezone: true },
  });

  try {
    await rebuildPersonalDashboardReadModel({
      tenantId: job.tenantId,
      userId: payload.userId,
      fmtCfg: {
        locale: tenant?.locale ?? "de-CH",
        timezone: tenant?.timezone ?? "Europe/Zurich",
      },
    });
    await markWorkspaceBackgroundJobSucceeded(ctx.client, job);
  } catch (error) {
    await markWorkspaceBackgroundJobDead(ctx.client, job, {
      errorCode: "REBUILD_FAILED",
    });
  }
}
