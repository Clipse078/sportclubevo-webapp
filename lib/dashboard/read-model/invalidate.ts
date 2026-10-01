import { prisma } from "@/lib/db/prisma";
import { WorkspaceBackgroundJobType } from "@prisma/client";
import { enqueueWorkspaceBackgroundJob } from "@/lib/workspace/background-jobs/job-enqueue";
import { buildPersonalDashboardRebuildDeduplicationKey } from "@/lib/workspace/background-jobs/job-payload";

export async function schedulePersonalDashboardReadModelRebuild(args: {
  tenantId: string;
  userId: string;
  correlationId?: string | null;
}): Promise<void> {
  const tenantId = args.tenantId.trim();
  const userId = args.userId.trim();
  if (!tenantId || !userId) return;

  try {
    await enqueueWorkspaceBackgroundJob(prisma, {
      tenantId,
      type: WorkspaceBackgroundJobType.PERSONAL_DASHBOARD_REBUILD,
      payload: { v: 1, userId },
      deduplicationKey: buildPersonalDashboardRebuildDeduplicationKey(userId),
      correlationId: args.correlationId,
      source: "personal-dashboard-read-model",
    });
  } catch (error) {
    console.error("[personal-dashboard-read-model] enqueue rebuild failed", {
      tenantId,
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function invalidatePersonalDashboardReadModelsForPerson(args: {
  tenantId: string;
  personId: string;
}): Promise<void> {
  const linked = await prisma.person.findFirst({
    where: { id: args.personId, tenantId: args.tenantId },
    select: { userId: true },
  });
  if (linked?.userId) {
    await schedulePersonalDashboardReadModelRebuild({
      tenantId: args.tenantId,
      userId: linked.userId,
    });
    return;
  }

  const rows = await prisma.personalDashboardReadModel.findMany({
    where: { tenantId: args.tenantId, personId: args.personId },
    select: { userId: true },
  });
  await Promise.all(
    rows.map((row) =>
      schedulePersonalDashboardReadModelRebuild({
        tenantId: args.tenantId,
        userId: row.userId,
      }),
    ),
  );
}

/** Domain mutation seam — enqueue rebuild for the affected user (never blocks canonical writes). */
export async function notifyPersonalDashboardDomainMutation(args: {
  tenantId: string;
  userId?: string | null;
  personId?: string | null;
}): Promise<void> {
  if (args.userId) {
    await schedulePersonalDashboardReadModelRebuild({
      tenantId: args.tenantId,
      userId: args.userId,
    });
    return;
  }
  if (args.personId) {
    await invalidatePersonalDashboardReadModelsForPerson({
      tenantId: args.tenantId,
      personId: args.personId,
    });
  }
}
