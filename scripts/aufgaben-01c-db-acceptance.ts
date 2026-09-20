/**
 * AUFGABEN-01C — read/write acceptance against configured DATABASE_URL.
 * Creates ephemeral rows and cleans up. Exits non-zero on failure.
 */
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  completeTask,
  createSubtask,
  createTask,
  getTask,
  listMyTasks,
  countMyOpenTasks,
} from "@/lib/tasks/task-service";
import {
  createTaskSeries,
  endTaskSeries,
  generateTaskOccurrences,
  pauseTaskSeries,
  resumeTaskSeries,
} from "@/lib/tasks/task-series-service";
import { ParentHasOpenSubtasksError } from "@/lib/tasks/errors";

function ctx(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    permissionKeys: Object.values(PERMISSIONS),
  };
}

async function main() {
  const tenants = await prisma.tenant.findMany({ take: 2, select: { id: true } });
  if (tenants.length < 1) throw new Error("Need at least one tenant");

  const tenantA = tenants[0]!.id;
  const tenantB = tenants[1]?.id ?? tenants[0]!.id;

  const userA = await prisma.user.findFirst({
    where: { tenantMemberships: { some: { tenantId: tenantA, isActive: true } } },
  });
  const userB = await prisma.user.findFirst({
    where: {
      tenantMemberships: { some: { tenantId: tenantA, isActive: true } },
      NOT: { id: userA?.id },
    },
  });
  const userC = userB ?? userA;
  if (!userA) throw new Error("Need user in tenant A");

  const cA = ctx(tenantA, userA.id);
  const cB = ctx(tenantA, userC!.id);

  const parent = await createTask(cA, {
    title: "01C Parent",
    assigneeUserIds: [userA.id],
  });
  const child = await createSubtask(cA, parent.id, {
    title: "01C Child",
    assigneeUserIds: [userC!.id],
  });

  const myA = await listMyTasks(cA, { openOnly: true });
  const myB = await listMyTasks(cB, { openOnly: true });
  if (!myA.some((t) => t.id === parent.id)) throw new Error("User A missing parent");
  if (!myB.some((t) => t.id === child.id && t.parentTask?.id === parent.id)) {
    throw new Error("User B missing child with parent context");
  }

  try {
    await completeTask(cA, parent.id);
    throw new Error("Parent completion should fail with open child");
  } catch (e) {
    if (!(e instanceof ParentHasOpenSubtasksError)) throw e;
  }

  await completeTask(cB, child.id);
  await completeTask(cA, parent.id);

  if (tenantA !== tenantB) {
    await expectDenied(getTask(ctx(tenantB, userA.id), parent.id));
  } else {
    const foreign = await prisma.task.findFirst({
      where: { NOT: { tenantId: tenantA } },
      select: { id: true, tenantId: true },
    });
    if (foreign) {
      await expectDenied(getTask(ctx(foreign.tenantId === tenantA ? tenantB : foreign.tenantId, userA.id), foreign.id));
    }
  }

  const series = await createTaskSeries(cA, {
    title: "01C Weekly",
    frequency: "WEEKLY",
    weekday: "SUNDAY",
    timezone: "Europe/Zurich",
    assigneeUserIds: [userA.id],
    subtaskTemplates: [
      { title: "Spielplan", dueOffsetDays: -2, assigneeUserIds: [userA.id] },
      { title: "Final", dueOffsetDays: 0, assigneeUserIds: [userA.id] },
    ],
  });

  const gen1 = await generateTaskOccurrences(cA, series.id);
  const gen2 = await generateTaskOccurrences(cA, series.id);
  if (gen1.generatedTaskIds.length === 0) throw new Error("Expected generated occurrences");
  if (gen1.generatedTaskIds.length !== gen2.generatedTaskIds.length) {
    throw new Error("Idempotent generation changed occurrence count");
  }

  await pauseTaskSeries(cA, series.id);
  await expectDenied(generateTaskOccurrences(cA, series.id));
  const pausedBulk = await generateTaskOccurrences(cA);
  if (pausedBulk.generatedTaskIds.length !== 0) {
    throw new Error("PAUSED series must not generate via bulk run");
  }

  await resumeTaskSeries(cA, series.id);
  await endTaskSeries(cA, series.id);
  await expectDenied(generateTaskOccurrences(cA, series.id));
  const endedBulk = await generateTaskOccurrences(cA);
  if (endedBulk.generatedTaskIds.length !== 0) {
    throw new Error("ENDED series must not generate via bulk run");
  }

  const count = await countMyOpenTasks(cA);
  if (typeof count !== "number") throw new Error("countMyOpenTasks failed");

  const auditCount = await prisma.auditLog.count({
    where: {
      moduleKey: "tasks",
      action: { in: ["TASK_CREATED", "TASK_OCCURRENCE_GENERATED", "TASK_SERIES_CREATED"] },
      tenantId: tenantA,
    },
  });
  if (auditCount < 1) throw new Error("Expected task audit rows");

  await prisma.task.deleteMany({
    where: {
      OR: [
        { id: { in: [parent.id, child.id, ...gen1.generatedTaskIds] } },
        { parentTaskId: { in: gen1.generatedTaskIds } },
      ],
    },
  });
  await prisma.taskSeries.delete({ where: { id: series.id } });

  console.log(
    JSON.stringify(
      {
        ok: true,
        myTasksA: myA.length,
        myTasksB: myB.length,
        generatedOccurrences: gen1.generatedTaskIds.length,
        auditCount,
        openTaskCount: count,
      },
      null,
      2,
    ),
  );
}

async function expectDenied(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("Expected cross-tenant denial");
  } catch (e) {
    if (e instanceof Error && e.message === "Expected cross-tenant denial") throw e;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
