/**
 * PR #1017 — connected Vereinsentwicklung workflow on disposable local Postgres.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClubStrategyScopeType, TaskContextType, TaskStatus, type PrismaClient } from "@prisma/client";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import {
  applyConfiguredTestDatabaseUrlToProcessEnv,
  canRunDbMutatingIntegrationTests,
} from "@/lib/test/safe-test-database";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  addClubStrategyFocusTarget,
  createClubStrategy,
  listClubStrategies,
} from "../club-strategy-service";
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

  it("links zwei Ziele, erstellt TARGET-Aufgaben, und rollt Fortschritt 1/2 auf Strategie", async () => {
    const strategy = await createClubStrategy(actor, userId, {
      title: `Rollup ${RUN}`,
      orgUnitIds: [],
    });

    const targetLinked = await admin.target.create({
      data: {
        tenantId,
        title: "Linked Ziel",
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
      },
      select: { id: true },
    });
    const targetCreated = await admin.target.create({
      data: {
        tenantId,
        title: "Created Ziel",
        status: "ACTIVE",
        category: "GOVERNANCE",
        period: "YEAR",
        createdByUserId: userId,
      },
      select: { id: true },
    });

    await addClubStrategyFocusTarget(actor, userId, targetLinked.id, strategy.id);
    await addClubStrategyFocusTarget(actor, userId, targetCreated.id, strategy.id);

    const openTask = await admin.task.create({
      data: {
        tenantId,
        title: "Offen",
        status: TaskStatus.OPEN,
        contextType: TaskContextType.TARGET,
        contextId: targetLinked.id,
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
        contextId: targetCreated.id,
        createdByUserId: userId,
        visibilityScope: TaskVisibilityScope.ORGANISATION,
      },
      select: { id: true },
    });

    const t1 = await computeTargetDeliveryProgress(actor, targetLinked.id);
    const t2 = await computeTargetDeliveryProgress(actor, targetCreated.id);
    expect(t1).toMatchObject({ completedCount: 0, totalCount: 1 });
    expect(t2).toMatchObject({ completedCount: 1, totalCount: 1 });

    const strategyRollup = await computeStrategyDeliveryProgress(actor, [targetLinked.id, targetCreated.id]);
    expect(strategyRollup.completedCount).toBe(1);
    expect(strategyRollup.totalCount).toBe(2);
    expect(strategyRollup.contributingTaskIds.sort()).toEqual([openTask.id, doneTask.id].sort());
  });
});