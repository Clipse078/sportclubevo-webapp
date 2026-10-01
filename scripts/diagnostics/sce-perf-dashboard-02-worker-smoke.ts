import "./sce-perf-preload.mjs";
import "dotenv/config";
import { schedulePersonalDashboardReadModelRebuild } from "@/lib/dashboard/read-model/invalidate";
import { dispatchWorkspaceBackgroundJobs } from "@/lib/workspace/background-jobs/workspace-background-job-dispatcher";
import { prisma } from "@/lib/db/prisma";
import { WorkspaceBackgroundJobType } from "@prisma/client";

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: "fc-allschwil" },
    select: { id: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: "it@fcallschwil.ch" },
    select: { id: true },
  });
  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "FIXTURE_MISSING" }));
    process.exit(2);
  }

  const before = await prisma.personalDashboardReadModel.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    select: { updatedAt: true, builtAt: true },
  });

  await schedulePersonalDashboardReadModelRebuild({
    tenantId: tenant.id,
    userId: user.id,
  });
  await schedulePersonalDashboardReadModelRebuild({
    tenantId: tenant.id,
    userId: user.id,
  });

  const pending = await prisma.workspaceBackgroundJob.findMany({
    where: {
      tenantId: tenant.id,
      type: WorkspaceBackgroundJobType.PERSONAL_DASHBOARD_REBUILD,
      status: { in: ["PENDING", "RUNNING", "RETRY"] },
    },
    select: { id: true, deduplicationKey: true },
  });

  const summary = await dispatchWorkspaceBackgroundJobs({ globalLimit: 10 });

  const job = await prisma.workspaceBackgroundJob.findFirst({
    where: {
      tenantId: tenant.id,
      type: WorkspaceBackgroundJobType.PERSONAL_DASHBOARD_REBUILD,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, deduplicationKey: true },
  });

  const after = await prisma.personalDashboardReadModel.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    select: {
      updatedAt: true,
      builtAt: true,
      projectionVersion: true,
      payloadJson: true,
    },
  });

  const payload = after?.payloadJson as {
    programme?: { items?: unknown[] };
    personalWork?: { taskCount?: number };
  } | null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        before,
        dedupePendingCount: pending.length,
        dispatch: summary,
        job,
        after: {
          updatedAt: after?.updatedAt,
          builtAt: after?.builtAt,
          projectionVersion: after?.projectionVersion,
          programmeCount: payload?.programme?.items?.length ?? null,
          personalWorkTaskCount: payload?.personalWork?.taskCount ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
