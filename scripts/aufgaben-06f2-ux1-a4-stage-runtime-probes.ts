/**
 * AUFGABEN-06F2-UX1-A4 — STAGE post-migration runtime authorization probes (S1–S10).
 * Creates ephemeral acceptance fixtures and cleans up. Read-only on existing rows except cleanup scope.
 */
import "dotenv/config";

import { TaskVisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  maskDatabaseUrl,
  parseDatabaseTarget,
} from "@/lib/test/safe-test-database";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  loadTaskAuthScope,
} from "@/lib/tasks/task-authorization";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { TaskAccessGrantSubjectType } from "@prisma/client";

const FIXTURE_PREFIX = "UX1-A4-ACCEPT-";

function hostFingerprint(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const h = new URL(url.trim()).hostname;
    return `${h.slice(0, 8)}…${h.slice(-14)}`;
  } catch {
    return null;
  }
}

function ctx(
  tenantId: string,
  userId: string,
  permissionKeys: string[],
  auth: Awaited<ReturnType<typeof loadTaskAuthScope>>,
): TaskServiceContext {
  return { tenantId, userId, permissionKeys, auth };
}

function basePerms(): string[] {
  return [PERMISSIONS.TASKS_VIEW];
}

async function assertStageTarget(): Promise<void> {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
    APP_ENV: process.env.APP_ENV ?? "stage",
  });
  const db = process.env.DATABASE_URL?.trim();
  const stageRef = process.env.STAGE_DB_URL?.trim();
  const dbHost = db ? parseDatabaseTarget(db).hostname : null;
  const stageHost = stageRef ? parseDatabaseTarget(stageRef).hostname : null;
  const match = Boolean(dbHost && stageHost && dbHost === stageHost);
  if (!runtime.isStage || !match) {
    throw new Error(
      `Refusing probes: stage target not proven (isStage=${runtime.isStage}, hostMatch=${match}, db=${maskDatabaseUrl(db)})`,
    );
  }
}

async function main(): Promise<void> {
  await assertStageTarget();

  const tenant =
    (await prisma.tenant.findFirst({
      where: { key: "fc-allschwil" },
      select: { id: true, key: true },
    })) ??
    (await prisma.tenant.findFirst({
      where: { tasks: { some: {} } },
      select: { id: true, key: true },
    }));
  if (!tenant) throw new Error("No tenant with tasks on STAGE");

  const users = await prisma.user.findMany({
    where: {
      tenantMemberships: { some: { tenantId: tenant.id, isActive: true } },
    },
    take: 6,
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (users.length < 2) throw new Error("Need at least 2 active users");

  const orgUnits = await prisma.orgUnit.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
    take: 2,
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const creator = users[0]!;
  const assignee = users[1]!;
  const outsider = users[2] ?? users[1]!;

  const creatorAuth = await loadTaskAuthScope(creator.id, tenant.id);
  const assigneeAuth = await loadTaskAuthScope(assignee.id, tenant.id);
  const outsiderAuth = await loadTaskAuthScope(outsider.id, tenant.id);

  const creatorCtx = ctx(tenant.id, creator.id, basePerms(), creatorAuth);
  const assigneeCtx = ctx(tenant.id, assignee.id, basePerms(), assigneeAuth);
  const outsiderCtx = ctx(tenant.id, outsider.id, basePerms(), outsiderAuth);
  const elevatedOutsiderCtx = ctx(
    tenant.id,
    outsider.id,
    [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TASKS_MANAGE,
    ],
    outsiderAuth,
  );

  const results: Record<string, boolean | string> = {};

  const clubExisting = await prisma.task.findFirst({
    where: { tenantId: tenant.id, visibilityScope: TaskVisibilityScope.CLUB },
    include: { assignees: { select: { userId: true } } },
  });
  if (!clubExisting) throw new Error("No CLUB task on STAGE");

  results.S1_club_authorized_read = canReadTask(creatorCtx, {
    tenantId: tenant.id,
    createdByUserId: clubExisting.createdByUserId,
    assigneeUserIds: clubExisting.assignees.map((a) => a.userId),
    visibilityScope: clubExisting.visibilityScope,
    orgUnitId: clubExisting.orgUnitId,
  });

  const createdIds: string[] = [];

  const assigneesOnly = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      title: `${FIXTURE_PREFIX}ASSIGNEES_ONLY`,
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      createdByUserId: creator.id,
      assignees: {
        create: {
          tenantId: tenant.id,
          userId: assignee.id,
          assignedByUserId: creator.id,
        },
      },
    },
  });
  createdIds.push(assigneesOnly.id);

  results.S5_assignees_only_creator_reads = canReadTask(creatorCtx, {
    tenantId: tenant.id,
    createdByUserId: creator.id,
    assigneeUserIds: [assignee.id],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
  });

  results.S6_assignees_only_assignee_reads = canReadTask(assigneeCtx, {
    tenantId: tenant.id,
    createdByUserId: creator.id,
    assigneeUserIds: [assignee.id],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
  });

  results.S7_view_all_denied_confidential = !canReadTask(elevatedOutsiderCtx, {
    tenantId: tenant.id,
    createdByUserId: creator.id,
    assigneeUserIds: [assignee.id],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
  });

  results.S8_manage_denied_confidential = !canReadTask(elevatedOutsiderCtx, {
    tenantId: tenant.id,
    createdByUserId: creator.id,
    assigneeUserIds: [assignee.id],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
  });

  const outsiderAssigneeRow = await prisma.taskAssignee.findFirst({
    where: { taskId: assigneesOnly.id, userId: outsider.id },
  });
  results.viewer_only_not_in_my_tasks = !outsiderAssigneeRow;

  if (orgUnits.length >= 1) {
    const orgA = orgUnits[0]!;
    const orgUnitTask = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        title: `${FIXTURE_PREFIX}ORG_UNIT`,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: orgA.id,
        createdByUserId: creator.id,
        assignees: {
          create: {
            tenantId: tenant.id,
            userId: assignee.id,
            assignedByUserId: creator.id,
          },
        },
        accessGrants: {
          create: {
            tenantId: tenant.id,
            subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
            orgUnitId: orgA.id,
          },
        },
      },
    });
    createdIds.push(orgUnitTask.id);

    const grant = await prisma.taskAccessGrant.findFirst({
      where: { taskId: orgUnitTask.id, orgUnitId: orgA.id },
    });
    results.S2_legacy_org_unit_grant_present = Boolean(grant);

    const memberInOrg = creatorAuth.memberOrgUnitIds.includes(orgA.id);
    results.S2_org_unit_member_reads = memberInOrg
      ? canReadTask(creatorCtx, {
          tenantId: tenant.id,
          createdByUserId: creator.id,
          assigneeUserIds: [assignee.id],
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: orgA.id,
          accessGrants: { orgUnitIds: [orgA.id], viewerUserIds: [] },
        })
      : "skipped_no_membership";

    if (orgUnits.length >= 2) {
      const orgB = orgUnits[1]!;
      const unrelatedMember = !outsiderAuth.memberOrgUnitIds.includes(orgA.id);
      results.S3_unrelated_org_denied = unrelatedMember
        ? !canReadTask(outsiderCtx, {
            tenantId: tenant.id,
            createdByUserId: creator.id,
            assigneeUserIds: [assignee.id],
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: orgA.id,
            accessGrants: { orgUnitIds: [orgA.id], viewerUserIds: [] },
          })
        : "skipped_outsider_in_org";
      void orgB;
    }
  } else {
    results.S2_legacy_org_unit_grant_present = "skipped_no_org_units";
  }

  const foreignTenant = await prisma.tenant.findFirst({
    where: { NOT: { id: tenant.id } },
    select: { id: true },
  });
  results.S10_tenant_boundary = !canReadTask(
    ctx(tenant.id, creator.id, basePerms(), creatorAuth),
    {
      tenantId: foreignTenant?.id ?? "foreign-tenant-id",
      createdByUserId: clubExisting.createdByUserId,
      assigneeUserIds: clubExisting.assignees.map((a) => a.userId),
      visibilityScope: clubExisting.visibilityScope,
      orgUnitId: clubExisting.orgUnitId,
    },
  );

  const notificationCount = await prisma.notification.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      type: "TASK_ASSIGNED",
      title: { contains: FIXTURE_PREFIX },
    },
  });
  results.USER_GRANT_BROADCAST = notificationCount === 0;

  await prisma.task.deleteMany({
    where: { id: { in: createdIds } },
  });

  const failed = Object.entries(results).filter(
    ([, v]) => v === false,
  );

  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        tenantId: tenant.id,
        databaseHostFingerprint: hostFingerprint(process.env.DATABASE_URL),
        results,
        failed: failed.map(([k]) => k),
        cleanedFixtureTaskIds: createdIds,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) process.exit(1);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));
