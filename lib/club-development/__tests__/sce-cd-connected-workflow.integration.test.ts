/**
 * PR #1017 — connected Vereinsentwicklung workflow on disposable local Postgres.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
import { computeStrategyDeliveryProgress, computeTargetDeliveryProgress } from "../vereinsentwicklung-workspace-progress";

const describeIntegration = canRunDbMutatingIntegrationTests() ? describe : describe.skip;

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

    actor = {
      tenantId,
      userId,
      permissionKeys: [PERMISSIONS.TARGETS_MANAGE, PERMISSIONS.TARGETS_VIEW, PERMISSIONS.TASKS_MANAGE],
      roleKeys: [],
      teamIds: [],
      orgUnitIds: [],
      personId: null,
    } as ActorContext;
  });

  afterAll(async () => {
    if (tenantId) {
      await admin.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    }
    await admin.$disconnect();
    await pool.end();
  });

  it("creates one strategy assigned to two Org-Einheiten and filters through both", async () => {
    const created = await createClubStrategy(actor, userId, {
      title: `Strategie ${RUN}`,
      orgUnitIds: [orgA, orgB],
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
  });
});