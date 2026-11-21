/**
 * Connected Vereinsentwicklung workflow on disposable local Postgres.
 * Requires TaskStatus::WAITING on TEST_DATABASE_URL (see cd-task-status:disposable-migration-verify).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ClubStrategyScopeType,
  TaskContextType,
  TaskStatus,
  TaskVisibilityScope,
  VisibilityScope,
  type PrismaClient,
} from "@prisma/client";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import {
  applyConfiguredTestDatabaseUrlToProcessEnv,
  canRunDbMutatingIntegrationTests,
} from "@/lib/test/safe-test-database";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  addClubStrategyFocusTarget,
  canManageClubStrategy,
  createClubStrategy,
  listClubStrategies,
  replaceClubStrategyOrgUnitAssignments,
} from "../club-strategy-service";
import { patchDevelopmentSprintMetadata } from "../sprints/sprint-lifecycle";
import { addTaskToSprint, removeTaskFromSprint } from "../sprints/sprint-service";
import {
  loadUnplannedTaskRankMap,
  persistUnplannedTaskOrder,
} from "../sprints/unplanned-task-rank";
import {
  computeStrategyDeliveryProgress,
  computeStrategyGoalAchievementProgress,
  computeTargetDeliveryProgress,
} from "../vereinsentwicklung-workspace-progress";
import { buildTaskServiceContextForActor, getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadVorhabenWorkspace } from "../vorhaben-workspace";
import { patchVereinsentwicklungTaskStatus } from "../vereinsentwicklung-task-status-mutation";
import { loadSprintBoard } from "../sprints/sprint-board";
import { mapTaskStatusToBoardColumn } from "../sprints/sprint-board";

vi.mock("@/lib/tasks/server-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/server-context")>();
  return {
    ...actual,
    getTaskServiceContext: vi.fn(),
  };
});

const describeIntegration = canRunDbMutatingIntegrationTests() ? describe : describe.skip;

const VL_INTEGRATION_PERMISSION_KEYS = [
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.TARGETS_VIEW,
  PERMISSIONS.TASKS_MANAGE,
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.INITIATIVES_VIEW,
  PERMISSIONS.INITIATIVES_MANAGE,
] as const;

async function attachPermissionsToRole(
  adminClient: PrismaClient,
  roleId: string,
  keys: readonly string[],
): Promise<void> {
  for (const key of keys) {
    const permission = await adminClient.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: key,
        module: "TEAMS",
        scope: "TENANT",
        grantableByAdmin: true,
      },
      select: { id: true },
    });
    await adminClient.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id },
    });
  }
}

describeIntegration("PR #1017 connected workspace workflow (disposable Postgres)", () => {
  let admin: PrismaClient;
  let pool: { end: () => Promise<void> };
  let tenantId: string;
  let userId: string;
  let orgA: string;
  let orgB: string;
  let actor: ActorContext;

  const RUN = `cd-connected-${Date.now()}`;

  beforeAll(async () => {
    applyConfiguredTestDatabaseUrlToProcessEnv();
    const client = createSafeTestPrismaClient();
    admin = client.prisma;
    pool = client.pool;

    const waitingEnum = await admin.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'TaskStatus' AND e.enumlabel = 'WAITING'
    `;
    if (waitingEnum.length === 0) {
      throw new Error(
        "TaskStatus::WAITING is missing on TEST_DATABASE_URL. " +
          "Run: TEST_DATABASE_URL=... npm run cd-task-status:disposable-migration-verify",
      );
    }

    const tenant = await admin.tenant.create({
      data: { key: `tenant-${RUN}`, name: "Connected workflow", timezone: "Europe/Zurich" },
      select: { id: true },
    });
    tenantId = tenant.id;

    const user = await admin.user.create({
      data: {
        email: `admin-${RUN}@example.invalid`,
        passwordHash: "unused",
        firstName: "Admin",
        lastName: "Tester",
        tenantId,
      },
      select: { id: true },
    });
    userId = user.id;

    const club = await admin.orgUnit.create({
      data: { tenantId, key: "club", name: "Verein", type: "CLUB", level: 0 },
      select: { id: true },
    });

    const [unitA, unitB] = await Promise.all([
      admin.orgUnit.create({
        data: {
          tenantId,
          parentId: club.id,
          key: `junioren-a-${RUN}`,
          name: "Junioren A",
          type: "DEPARTMENT",
          level: 1,
        },
        select: { id: true },
      }),
      admin.orgUnit.create({
        data: {
          tenantId,
          parentId: club.id,
          key: `junioren-b-${RUN}`,
          name: "Junioren B",
          type: "DEPARTMENT",
          level: 1,
        },
        select: { id: true },
      }),
    ]);
    orgA = unitA.id;
    orgB = unitB.id;

    await admin.tenantMembership.create({
      data: { tenantId, userId, isActive: true },
    });

    const vlRole = await admin.role.create({
      data: {
        key: `vl-${RUN}`,
        name: "VL Integration",
        scope: "TENANT",
        tenantId,
        canAccessVereinsleitung: true,
      },
      select: { id: true },
    });
    await admin.userRole.create({
      data: { userId, roleId: vlRole.id, tenantId },
    });
    await attachPermissionsToRole(admin, vlRole.id, VL_INTEGRATION_PERMISSION_KEYS);

    actor = {
      tenantId,
      userId,
      permissionKeys: [
        PERMISSIONS.TARGETS_MANAGE,
        PERMISSIONS.TARGETS_VIEW,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.TASKS_VIEW,
      ],
      roleKeys: [],
      teamIds: [],
      orgUnitIds: [],
      personId: null,
    } as ActorContext;

    const taskCtx = await buildTaskServiceContextForActor(userId, tenantId);
    vi.mocked(getTaskServiceContext).mockResolvedValue(taskCtx);
  });

  afterAll(async () => {
    if (tenantId) {
      await admin.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    }
    await admin.$disconnect();
    await pool.end();
  });

  it("rejects create when org scope is omitted", async () => {
    await expect(createClubStrategy(actor, userId, { title: `No scope ${RUN}` })).rejects.toThrow(
      /ORG_SCOPE_REQUIRED/i,
    );
  });

  it("creates club-wide strategy only with explicit scopeClubWide", async () => {
    await admin.clubStrategy.deleteMany({ where: { tenantId } });
    const created = await createClubStrategy(actor, userId, {
      title: `Club wide ${RUN}`,
      scopeClubWide: true,
    });

    const row = await admin.clubStrategy.findUniqueOrThrow({
      where: { id: created.id },
      include: { orgUnitAssignments: true },
    });
    expect(row.scopeType).toBe(ClubStrategyScopeType.CLUB);
    expect(row.scopeOrgUnitId).toBeNull();
    expect(row.orgUnitAssignments).toHaveLength(0);
  });

  it("allows a second titled Gesamtverein strategy while preserving the legacy row", async () => {
    await admin.clubStrategy.deleteMany({ where: { tenantId } });
    const legacy = await admin.clubStrategy.create({
      data: {
        tenantId,
        scopeType: ClubStrategyScopeType.CLUB,
        scopeOrgUnitId: null,
        title: `Legacy Gesamtverein ${RUN}`,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
      select: { id: true },
    });

    const created = await createClubStrategy(actor, userId, {
      title: `Test Strategie 1 ${RUN}`,
      scopeClubWide: true,
    });

    const clubWideRows = await admin.clubStrategy.findMany({
      where: { tenantId, scopeType: ClubStrategyScopeType.CLUB, scopeOrgUnitId: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    });
    expect(clubWideRows.map((row) => row.id)).toEqual(
      expect.arrayContaining([legacy.id, created.id]),
    );
    expect(clubWideRows).toHaveLength(2);

    const focusTarget = await admin.target.create({
      data: {
        tenantId,
        title: `Linked Ziel ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });
    await addClubStrategyFocusTarget(actor, userId, focusTarget.id, legacy.id);
    const link = await admin.clubStrategyFocusTarget.findFirst({
      where: { tenantId, targetId: focusTarget.id },
      select: { clubStrategyId: true },
    });
    expect(link?.clubStrategyId).toBe(legacy.id);
  });

  it("creates one strategy assigned to two Org-Einheiten and filters through both", async () => {
    await admin.clubStrategy.deleteMany({ where: { tenantId } });
    const created = await createClubStrategy(actor, userId, {
      title: `Strategie ${RUN}`,
      orgUnitIds: [orgA, orgB],
      scopeClubWide: false,
    });

    const visibleA = await listClubStrategies(actor, { orgUnitId: orgA });
    const visibleB = await listClubStrategies(actor, { orgUnitId: orgB });
    expect(visibleA.some((s) => s.id === created.id)).toBe(true);
    expect(visibleB.some((s) => s.id === created.id)).toBe(true);
    expect(visibleA.filter((s) => s.id === created.id)).toHaveLength(1);
  });

  it("resolves legacy scopeOrgUnitId strategies without junction rows for reads", async () => {
    const legacy = await admin.clubStrategy.create({
      data: {
        tenantId,
        scopeType: ClubStrategyScopeType.ORG_UNIT,
        scopeOrgUnitId: orgA,
        title: `Legacy ${RUN}`,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
      select: { id: true },
    });

    const visible = await listClubStrategies(actor, { orgUnitId: orgA });
    expect(visible.some((s) => s.id === legacy.id)).toBe(true);
  });

  it("denies strategy management without TARGETS_MANAGE", async () => {
    const viewOnly: ActorContext = {
      ...actor,
      permissionKeys: [PERMISSIONS.TARGETS_VIEW],
    };
    expect(canManageClubStrategy(viewOnly)).toBe(false);
    await expect(
      createClubStrategy(viewOnly, userId, { title: "Forbidden", orgUnitIds: [orgA] }),
    ).rejects.toThrow(/FORBIDDEN/i);
  });

  it("denies org-scoped strategy create for Org-Einheit outside task-manage scope", async () => {
    const scopedRole = await admin.role.create({
      data: {
        key: `vl-scoped-${RUN}`,
        name: "VL Scoped",
        scope: "TENANT",
        tenantId,
        canAccessVereinsleitung: true,
      },
      select: { id: true },
    });
    await attachPermissionsToRole(admin, scopedRole.id, [
      PERMISSIONS.TARGETS_MANAGE,
      PERMISSIONS.TARGETS_VIEW,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.TASKS_VIEW,
    ]);

    const scopedUser = await admin.user.create({
      data: {
        email: `scoped-${RUN}@example.invalid`,
        passwordHash: "unused",
        firstName: "Scoped",
        lastName: "Manager",
        tenantId,
      },
      select: { id: true },
    });
    await admin.tenantMembership.create({
      data: { tenantId, userId: scopedUser.id, isActive: true },
    });
    await admin.userRole.create({
      data: { userId: scopedUser.id, roleId: scopedRole.id, tenantId, orgUnitId: orgA },
    });

    const scopedActor: ActorContext = {
      tenantId,
      userId: scopedUser.id,
      permissionKeys: [PERMISSIONS.TARGETS_MANAGE, PERMISSIONS.TASKS_MANAGE],
      roleKeys: [],
      teamIds: [],
      orgUnitIds: [orgA],
      personId: null,
    };

    await expect(
      createClubStrategy(scopedActor, scopedUser.id, {
        title: `Forbidden org ${RUN}`,
        orgUnitIds: [orgB],
      }),
    ).rejects.toThrow(/ORG_UNIT_FORBIDDEN/i);
  });

  it("replaces Org-Einheit assignments on an existing strategy", async () => {
    const dual = await admin.clubStrategy.findFirstOrThrow({
      where: { tenantId, title: `Strategie ${RUN}` },
      select: { id: true },
    });
    await replaceClubStrategyOrgUnitAssignments(actor, userId, {
      clubStrategyId: dual.id,
      orgUnitIds: [orgB],
    });

    const assignments = await admin.clubStrategyOrgUnitAssignment.findMany({
      where: { tenantId, clubStrategyId: dual.id },
      select: { orgUnitId: true },
    });
    expect(assignments.map((row) => row.orgUnitId).sort()).toEqual([orgB]);

    await replaceClubStrategyOrgUnitAssignments(actor, userId, {
      clubStrategyId: dual.id,
      orgUnitIds: [orgA, orgB],
    });
    const restored = await admin.clubStrategyOrgUnitAssignment.findMany({
      where: { tenantId, clubStrategyId: dual.id },
      select: { orgUnitId: true },
    });
    expect(restored.map((row) => row.orgUnitId).sort()).toEqual([orgA, orgB].sort());
  });

  it("links focus targets to the tenant club-wide strategy when an Org-Einheit strategy also exists", async () => {
    const clubWide = await admin.clubStrategy.findFirstOrThrow({
      where: {
        tenantId,
        scopeType: ClubStrategyScopeType.CLUB,
        scopeOrgUnitId: null,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    await admin.clubStrategy.create({
      data: {
        tenantId,
        scopeType: ClubStrategyScopeType.ORG_UNIT,
        scopeOrgUnitId: orgB,
        title: `Org B only ${RUN}`,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });

    const target = await admin.target.create({
      data: {
        tenantId,
        title: `Canonical pick ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    await addClubStrategyFocusTarget(actor, userId, target.id);
    const link = await admin.clubStrategyFocusTarget.findFirst({
      where: { tenantId, targetId: target.id },
      select: { clubStrategyId: true },
    });
    expect(link?.clubStrategyId).toBe(clubWide.id);
  });

  it("lists TARGET-context tasks in Vorhaben workspace reads", async () => {
    const target = await admin.target.create({
      data: {
        tenantId,
        title: `Task list target ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true, title: true },
    });
    const task = await admin.task.create({
      data: {
        tenantId,
        title: `TARGET task ${RUN}`,
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: target.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.CLUB,
      },
      select: { id: true },
    });

    const snapshot = await loadVorhabenWorkspace(actor, {});
    const row = snapshot.tasks.find((entry) => entry.id === task.id);
    expect(row).toBeDefined();
    expect(row?.targetTitle).toBe(target.title);
    expect(row?.targetId).toBe(target.id);
  });

  it("edits phase metadata in place while preserving slug and memberships", async () => {
    const sprint = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug: `phase-edit-${RUN}`,
        title: "Vorher",
        goal: "Alt",
        createdByUserId: userId,
      },
      select: { id: true, slug: true },
    });

  const task = await admin.task.create({
      data: {
        tenantId,
        title: "Membership probe",
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: (
          await admin.target.create({
            data: {
              tenantId,
              title: "Ziel",
              status: "ACTIVE",
              category: "GOVERNANCE",
              period: "YEAR",
              createdByUserId: userId,
            },
            select: { id: true },
          })
        ).id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    await admin.developmentSprintTaskMembership.create({
      data: { tenantId, sprintId: sprint.id, taskId: task.id },
    });

    const updated = await patchDevelopmentSprintMetadata(tenantId, sprint.id, {
      title: "Nachher",
      goal: "Neues Phasenziel",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-03-31T00:00:00.000Z"),
    });

    expect(updated?.slug).toBe(sprint.slug);
    expect(updated?.title).toBe("Nachher");
    expect(updated?.goal).toBe("Neues Phasenziel");

    const membershipCount = await admin.developmentSprintTaskMembership.count({
      where: { tenantId, sprintId: sprint.id, removedAt: null },
    });
    expect(membershipCount).toBe(1);
  });

  it("persists Ungeplant task order across reload", async () => {
    const target = await admin.target.create({
      data: {
        tenantId,
        title: `Unplanned rank target ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });
    const [taskA, taskB] = await Promise.all(
      ["Alpha", "Beta"].map(async (label) =>
        admin.task.create({
          data: {
            tenantId,
            title: `Unplanned ${label} ${RUN}`,
            status: TaskStatus.OPEN,
            contextType: TaskContextType.TARGET,
            contextId: target.id,
            createdByUserId: userId,
            visibilityScope: TaskVisibilityScope.ORGANISATION,
          },
          select: { id: true },
        }),
      ),
    );

    const allowed = new Set([taskA.id, taskB.id]);
    await persistUnplannedTaskOrder(tenantId, [taskB.id, taskA.id], allowed);

    const firstLoad = await loadUnplannedTaskRankMap(tenantId, [taskA.id, taskB.id]);
    expect(firstLoad.get(taskB.id)).toBeLessThan(firstLoad.get(taskA.id)!);

    const secondLoad = await loadUnplannedTaskRankMap(tenantId, [taskA.id, taskB.id]);
    expect(secondLoad).toEqual(firstLoad);
  });

  it("keeps task identity and links when moving into a phase and back to unplanned", async () => {
    const target = await admin.target.create({
      data: {
        tenantId,
        title: `Phase hop target ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });
    const task = await admin.task.create({
      data: {
        tenantId,
        title: `Phase hop task ${RUN}`,
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: target.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true, contextType: true, contextId: true },
    });
    const sprint = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug: `phase-hop-${RUN}`,
        title: "Hop phase",
        createdByUserId: userId,
      },
      select: { id: true },
    });

    await addTaskToSprint(tenantId, sprint.id, task.id);
    await removeTaskFromSprint(tenantId, sprint.id, task.id);

    const after = await admin.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { id: true, contextType: true, contextId: true },
    });
    expect(after).toEqual({
      id: task.id,
      contextType: task.contextType,
      contextId: task.contextId,
    });

    const activeMembership = await admin.developmentSprintTaskMembership.count({
      where: { tenantId, taskId: task.id, removedAt: null },
    });
    expect(activeMembership).toBe(0);
  });

  it("rolls target progress as 0/1, 1/1, and strategy aggregate 1/2", async () => {
    const strategy = await admin.clubStrategy.findFirstOrThrow({
      where: { tenantId, title: `Strategie ${RUN}` },
      select: { id: true },
    });

    const targetOpen = await admin.target.create({
      data: {
        tenantId,
        title: "Open Ziel",
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });
    const targetDone = await admin.target.create({
      data: {
        tenantId,
        title: "Done Ziel",
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    await addClubStrategyFocusTarget(actor, userId, targetOpen.id, strategy.id);
    await addClubStrategyFocusTarget(actor, userId, targetDone.id, strategy.id);

    const openTask = await admin.task.create({
      data: {
        tenantId,
        title: "Offen",
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: targetOpen.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });
    const doneTask = await admin.task.create({
      data: {
        tenantId,
        title: "Erledigt",
        status: TaskStatus.DONE,
        contextType: TaskContextType.TARGET,
        contextId: targetDone.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    const openRollup = await computeTargetDeliveryProgress(actor, targetOpen.id);
    const doneRollup = await computeTargetDeliveryProgress(actor, targetDone.id);
    expect(openRollup).toMatchObject({ completedCount: 0, totalCount: 1 });
    expect(doneRollup).toMatchObject({ completedCount: 1, totalCount: 1 });

    const strategyRollup = await computeStrategyDeliveryProgress(actor, [targetOpen.id, targetDone.id]);
    expect(strategyRollup).toMatchObject({ completedCount: 1, totalCount: 2 });
    expect(strategyRollup.contributingTaskIds.sort()).toEqual([openTask.id, doneTask.id].sort());

    const targetCompleted = await admin.target.create({
      data: {
        tenantId,
        title: `Completed goal ${RUN}`,
        status: "COMPLETED",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });
    const goalRollup = await computeStrategyGoalAchievementProgress(actor, [
      targetOpen.id,
      targetCompleted.id,
    ]);
    expect(goalRollup).toMatchObject({ completedCount: 1, totalCount: 2, percent: 50 });
  });

  it("transitions linked task Offen→In Arbeit→Wartet→Erledigt; only DONE completes; reopen reverses", async () => {
    const taskCtx = await buildTaskServiceContextForActor(userId, tenantId);
    expect(taskCtx).toBeTruthy();

    const target = await admin.target.create({
      data: {
        tenantId,
        title: `Status target ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    const task = await admin.task.create({
      data: {
        tenantId,
        title: "Status probe",
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: target.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true, status: true },
    });

    const sprint = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug: `status-phase-${RUN}`,
        title: "Status Phase",
        createdByUserId: userId,
      },
      select: { id: true },
    });
    await admin.developmentSprintTaskMembership.create({
      data: { tenantId, sprintId: sprint.id, taskId: task.id },
    });

    const steps = [
      TaskStatus.IN_PROGRESS,
      TaskStatus.WAITING,
      TaskStatus.DONE,
    ] as const;

    let currentStatus = TaskStatus.OPEN;
    for (const step of steps) {
      const updated = await patchVereinsentwicklungTaskStatus(taskCtx!, task.id, step, currentStatus);
      currentStatus = updated.status;
      const rollup = await computeTargetDeliveryProgress(actor, target.id);
      if (step === TaskStatus.DONE) {
        expect(rollup).toMatchObject({ completedCount: 1, totalCount: 1 });
      } else {
        expect(rollup).toMatchObject({ completedCount: 0, totalCount: 1 });
      }
    }

    const boardAfterDone = await loadSprintBoard(taskCtx!, sprint.id);
    expect(boardAfterDone.columns.DONE.some((card) => card.taskId === task.id)).toBe(true);

    await patchVereinsentwicklungTaskStatus(taskCtx!, task.id, TaskStatus.OPEN, TaskStatus.DONE);
    expect(await computeTargetDeliveryProgress(actor, target.id)).toMatchObject({ completedCount: 0 });

    const reopened = await admin.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { status: true },
    });
    expect(reopened.status).toBe(TaskStatus.OPEN);
    expect(mapTaskStatusToBoardColumn(reopened.status)).toBe("OPEN");
  });

  it("maps CANCELLED tasks to Abgebrochen board column (not Offen)", async () => {
    const taskCtx = await buildTaskServiceContextForActor(userId, tenantId);
    expect(taskCtx).toBeTruthy();

    const sprint = await admin.developmentSprint.create({
      data: {
        tenantId,
        slug: `cancelled-phase-${RUN}`,
        title: "Cancelled Phase",
        createdByUserId: userId,
      },
      select: { id: true },
    });

    const task = await admin.task.create({
      data: {
        tenantId,
        title: "Cancelled probe",
        status: TaskStatus.CANCELLED,
        contextType: TaskContextType.TARGET,
        contextId: (
          await admin.target.create({
            data: {
              tenantId,
              title: "Cancel Ziel",
              status: "ACTIVE",
              category: "GOVERNANCE",
              period: "YEAR",
              createdByUserId: userId,
            },
            select: { id: true },
          })
        ).id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    await admin.developmentSprintTaskMembership.create({
      data: { tenantId, sprintId: sprint.id, taskId: task.id },
    });

    const board = await loadSprintBoard(taskCtx!, sprint.id);
    expect(board.columns.CANCELLED.some((c) => c.taskId === task.id)).toBe(true);
    expect(board.columns.OPEN.some((c) => c.taskId === task.id)).toBe(false);
    expect(mapTaskStatusToBoardColumn(TaskStatus.CANCELLED)).toBe("CANCELLED");
  });

  it("reads stored WAITING after migration and preserves label on workspace reload", async () => {
    const taskCtx = await buildTaskServiceContextForActor(userId, tenantId);
    const target = await admin.target.create({
      data: {
        tenantId,
        title: `Waiting reload ${RUN}`,
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
        visibilityScope: VisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    const task = await admin.task.create({
      data: {
        tenantId,
        title: "Waiting stored",
        status: TaskStatus.WAITING,
        contextType: TaskContextType.TARGET,
        contextId: target.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    const snapshot = await loadVorhabenWorkspace(actor, {});
    const row = snapshot.tasks.find((t) => t.id === task.id);
    expect(row?.status).toBe(TaskStatus.WAITING);
    expect(row?.statusLabel).toBe("Wartet");

    await patchVereinsentwicklungTaskStatus(taskCtx!, task.id, TaskStatus.OPEN, TaskStatus.WAITING);
    const reopened = await loadVorhabenWorkspace(actor, {});
    expect(reopened.tasks.find((t) => t.id === task.id)?.status).toBe(TaskStatus.OPEN);
  });

  it("denies status mutation for read-only tasks view", async () => {
    const viewer = await admin.user.create({
      data: {
        email: `viewer-${RUN}@example.invalid`,
        passwordHash: "unused",
        firstName: "View",
        lastName: "Only",
        tenantId,
      },
      select: { id: true },
    });

    const viewerRole = await admin.role.create({
      data: { tenantId, key: `viewer-${RUN}`, name: "Viewer" },
      select: { id: true },
    });
    await attachPermissionsToRole(admin, viewerRole.id, [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.INITIATIVES_VIEW,
    ]);
    await admin.userRole.create({
      data: { tenantId, userId: viewer.id, roleId: viewerRole.id },
    });

    const task = await admin.task.create({
      data: {
        tenantId,
        title: "Read-only probe",
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: (
          await admin.target.create({
            data: {
              tenantId,
              title: "RO Ziel",
              status: "ACTIVE",
              category: "GOVERNANCE",
              period: "YEAR",
              createdByUserId: userId,
            },
            select: { id: true },
          })
        ).id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    const viewerCtx = await buildTaskServiceContextForActor(viewer.id, tenantId);
    expect(viewerCtx).toBeTruthy();
    await expect(
      patchVereinsentwicklungTaskStatus(viewerCtx!, task.id, TaskStatus.DONE),
    ).rejects.toThrow(/Berechtigung/i);
  });
});