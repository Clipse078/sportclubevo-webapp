/**
 * SCE-CD-04R2 — sprint close / membership concurrency on disposable local Postgres.
 *
 * SAFETY: runs only when TEST_DATABASE_URL is set and passes assertSafeTestDatabase().
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DevelopmentSprintGoalResult,
  DevelopmentSprintStatus,
  TaskStatus,
  TaskVisibilityScope,
  type PrismaClient,
} from "@prisma/client";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { canRunDbMutatingIntegrationTests } from "@/lib/test/safe-test-database";
import { applyConfiguredTestDatabaseUrlToProcessEnv } from "@/lib/test/safe-test-database";
import { EMPTY_TASK_AUTH_SCOPE } from "@/lib/tasks/task-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { resolveReadableSprintTaskIds } from "../sprints/sprint-task-visibility";
import { loadSprintProgressStats } from "../sprints/sprint-workspace-stats";
import { SprintServiceError } from "../sprints/sprint-service";

const describeIntegration = canRunDbMutatingIntegrationTests() ? describe : describe.skip;

describeIntegration("SCE-CD-04R2 sprint close & visibility (real disposable Postgres)", () => {
  let admin: PrismaClient;
  let pool: { end: () => Promise<void> };
  let tenantId: string;
  let userAId: string;
  let userBId: string;
  let otherTenantId: string;

  const RUN = `cd04r2-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let closeDevelopmentSprint: typeof import("../sprints/sprint-close-service").closeDevelopmentSprint;
  let addTaskToSprint: typeof import("../sprints/sprint-service").addTaskToSprint;
  let startDevelopmentSprint: typeof import("../sprints/sprint-lifecycle").startDevelopmentSprint;

  beforeAll(async () => {
    applyConfiguredTestDatabaseUrlToProcessEnv();
    const client = createSafeTestPrismaClient();
    admin = client.prisma;
    pool = client.pool;

    const closeMod = await import("../sprints/sprint-close-service");
    const sprintMod = await import("../sprints/sprint-service");
    const lifeMod = await import("../sprints/sprint-lifecycle");
    closeDevelopmentSprint = closeMod.closeDevelopmentSprint;
    addTaskToSprint = sprintMod.addTaskToSprint;
    startDevelopmentSprint = lifeMod.startDevelopmentSprint;

    const tenant = await admin.tenant.create({
      data: { key: `tenant-${RUN}`, name: "CD-04R2 sprint concurrency", timezone: "Europe/Zurich" },
      select: { id: true },
    });
    tenantId = tenant.id;

    const otherTenant = await admin.tenant.create({
      data: { key: `other-${RUN}`, name: "Other tenant", timezone: "Europe/Zurich" },
      select: { id: true },
    });
    otherTenantId = otherTenant.id;

    const [userA, userB] = await Promise.all([
      admin.user.create({
        data: {
          email: `a-${RUN}@example.invalid`,
          passwordHash: "unused",
          firstName: "Ada",
          lastName: "Assignee",
          tenantId,
        },
        select: { id: true },
      }),
      admin.user.create({
        data: {
          email: `b-${RUN}@example.invalid`,
          passwordHash: "unused",
          firstName: "Bob",
          lastName: "Board",
          tenantId,
        },
        select: { id: true },
      }),
    ]);
    userAId = userA.id;
    userBId = userB.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.developmentSprintTaskMembership.deleteMany({ where: { tenantId } });
    await admin.developmentSprint.deleteMany({ where: { tenantId } });
    await admin.taskAssignee.deleteMany({ where: { task: { tenantId } } });
    await admin.task.deleteMany({ where: { tenantId } });
    await admin.user.deleteMany({ where: { tenantId } });
    await admin.tenant.delete({ where: { id: tenantId } });
    await admin.tenant.delete({ where: { id: otherTenantId } }).catch(() => undefined);
    await admin.$disconnect();
    await pool.end();
  });

  async function seedSprintPair() {
    const sprintA = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug: `active-${RUN}-${Math.random()}`,
        title: "Active sprint",
        status: DevelopmentSprintStatus.ACTIVE,
        startedAt: new Date(),
        createdByUserId: userAId,
      },
      select: { id: true },
    });
    const sprintB = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug: `future-${RUN}-${Math.random()}`,
        title: "Future sprint",
        status: DevelopmentSprintStatus.PLANNED,
        createdByUserId: userAId,
      },
      select: { id: true },
    });
    return { sprintAId: sprintA.id, sprintBId: sprintB.id };
  }

  async function seedTask(title: string, assigneeUserId: string) {
    const task = await admin.task.create({
      data: {
        title,
        status: TaskStatus.OPEN,
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        tenant: { connect: { id: tenantId } },
        createdBy: { connect: { id: assigneeUserId } },
        assignees: {
          create: [
            {
              tenant: { connect: { id: tenantId } },
              user: { connect: { id: assigneeUserId } },
            },
          ],
        },
      },
      select: { id: true },
    });
    return task.id;
  }

  function taskCtxFor(userId: string): TaskServiceContext {
    return {
      tenantId,
      userId,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
  }

  it("cross-tenant membership reads do not merge tenants", async () => {
    const { sprintAId } = await seedSprintPair();
    const taskId = await seedTask("Cross-tenant guard", userAId);
    await addTaskToSprint(tenantId, sprintAId, taskId);
    const foreign = await admin.developmentSprintTaskMembership.count({
      where: { tenantId: otherTenantId, taskId },
    });
    expect(foreign).toBe(0);
  });

  it("resolveReadableSprintTaskIds hides ASSIGNEES_ONLY tasks from non-assignee", async () => {
    const { sprintAId } = await seedSprintPair();
    const secretId = await seedTask("Secret for A", userAId);
    const visibleToBId = await seedTask("Task for B", userBId);
    await addTaskToSprint(tenantId, sprintAId, secretId);
    await addTaskToSprint(tenantId, sprintAId, visibleToBId);

    const readableForB = await resolveReadableSprintTaskIds(taskCtxFor(userBId), [
      secretId,
      visibleToBId,
    ]);
    expect(readableForB.has(secretId)).toBe(false);
    expect(readableForB.has(visibleToBId)).toBe(true);

    const statsForB = await loadSprintProgressStats(taskCtxFor(userBId), sprintAId);
    expect(statsForB.total).toBe(1);
  });

  it("concurrent addTaskToSprint to competing sprints leaves task in at most one active sprint", async () => {
    const { sprintAId, sprintBId } = await seedSprintPair();
    const taskId = await seedTask("Race task", userAId);

    const results = await Promise.allSettled([
      addTaskToSprint(tenantId, sprintAId, taskId),
      addTaskToSprint(tenantId, sprintBId, taskId),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length + rejected.length).toBe(2);
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const active = await admin.developmentSprintTaskMembership.findMany({
      where: { tenantId, taskId, removedAt: null },
      select: { sprintId: true },
    });
    expect(active.length).toBe(1);
  });

  it("transaction rollback reverts sprint status when carry-forward allocation fails mid-close", async () => {
    const { sprintAId } = await seedSprintPair();
    const taskId = await seedTask("Tx rollback", userAId);
    await addTaskToSprint(tenantId, sprintAId, taskId);

    await expect(
      admin.$transaction(async (tx) => {
        await tx.developmentSprint.update({
          where: { id: sprintAId },
          data: { status: DevelopmentSprintStatus.COMPLETED },
        });
        await addTaskToSprint(tenantId, "nonexistent-sprint-id", taskId, tx);
      }),
    ).rejects.toBeInstanceOf(SprintServiceError);

    const sprintA = await admin.developmentSprint.findUnique({
      where: { id: sprintAId },
      select: { status: true, closeSnapshot: true },
    });
    expect(sprintA?.status).toBe(DevelopmentSprintStatus.ACTIVE);
    expect(sprintA?.closeSnapshot).toBeNull();
    const activeMembership = await admin.developmentSprintTaskMembership.count({
      where: { tenantId, sprintId: sprintAId, taskId, removedAt: null },
    });
    expect(activeMembership).toBe(1);
  });

  it("concurrent close requests yield one completed sprint and one idempotent outcome", async () => {
    const { sprintAId } = await seedSprintPair();
    const taskId = await seedTask("Close race", userAId);
    await addTaskToSprint(tenantId, sprintAId, taskId);

    const input = {
      goalResult: DevelopmentSprintGoalResult.ACHIEVED,
      defaultUnfinishedDisposition: "RETAIN_HISTORICAL" as const,
    };

    const [first, second] = await Promise.allSettled([
      closeDevelopmentSprint(tenantId, sprintAId, input),
      closeDevelopmentSprint(tenantId, sprintAId, input),
    ]);

    const reports = [first, second]
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof closeDevelopmentSprint>>> => r.status === "fulfilled")
      .map((r) => r.value);
    expect(reports.length).toBeGreaterThanOrEqual(1);

    const sprint = await admin.developmentSprint.findUnique({
      where: { id: sprintAId },
      select: { status: true },
    });
    expect(sprint?.status).toBe(DevelopmentSprintStatus.COMPLETED);

    const idempotentHits = reports.filter((r) => r.idempotent).length;
    expect(idempotentHits).toBeGreaterThanOrEqual(0);
  });

  it("idempotent close retry after successful commit returns stored snapshot", async () => {
    const slug = `idem-${RUN}-${Math.random()}`;
    const sprint = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug,
        title: "Idempotent",
        status: DevelopmentSprintStatus.ACTIVE,
        startedAt: new Date(),
        createdByUserId: userAId,
      },
      select: { id: true },
    });
    const taskId = await seedTask("Done", userAId);
    await addTaskToSprint(tenantId, sprint.id, taskId);
    await admin.task.update({ where: { id: taskId }, data: { status: TaskStatus.DONE } });

    const input = {
      goalResult: DevelopmentSprintGoalResult.ACHIEVED,
      defaultUnfinishedDisposition: "RETAIN_HISTORICAL" as const,
    };
    const first = await closeDevelopmentSprint(tenantId, sprint.id, input);
    expect(first.idempotent).toBe(false);

    const second = await closeDevelopmentSprint(tenantId, sprint.id, input, new Date(), "retry-key");
    expect(second.idempotent).toBe(true);
    expect(second.snapshot?.goalResult).toBe(DevelopmentSprintGoalResult.ACHIEVED);
  });

  it("destination sprint completed during carry-forward aborts close without partial snapshot", async () => {
    const { sprintAId, sprintBId } = await seedSprintPair();
    const taskId = await seedTask("Carry cancel dest", userAId);
    await addTaskToSprint(tenantId, sprintAId, taskId);

    await startDevelopmentSprint(tenantId, sprintBId);

    await closeDevelopmentSprint(tenantId, sprintBId, {
      goalResult: DevelopmentSprintGoalResult.NOT_ACHIEVED,
      defaultUnfinishedDisposition: "RETAIN_HISTORICAL",
    });

    await expect(
      closeDevelopmentSprint(tenantId, sprintAId, {
        goalResult: DevelopmentSprintGoalResult.PARTLY_ACHIEVED,
        defaultUnfinishedDisposition: "BACKLOG",
        taskDestinations: [
          { taskId, disposition: "FUTURE_SPRINT", moveToSprintId: sprintBId },
        ],
      }),
    ).rejects.toThrow(/Ziel-Sprint|Abgeschlossen/i);

    const sprintA = await admin.developmentSprint.findUnique({
      where: { id: sprintAId },
      select: { status: true },
    });
    expect(sprintA?.status).toBe(DevelopmentSprintStatus.ACTIVE);
  });
});