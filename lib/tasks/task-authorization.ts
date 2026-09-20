/**
 * AUFGABEN-05-ORG-02 — canonical server-side Task authorization.
 *
 * Single source of truth for read/manage predicates and row checks.
 * Visibility is driven by persisted Task.visibilityScope + orgUnitId,
 * never inferred from context or client state.
 */

import type { Prisma } from "@prisma/client";
import { TaskVisibilityScope } from "@prisma/client";
import { loadOrgUnitIds } from "@/lib/org/queries";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskAuthScope, TaskServiceContext } from "./types";

const TASK_READ_PERMISSIONS = [
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.TASKS_VIEW_ALL,
  PERMISSIONS.TASKS_MANAGE,
] as const;

export const EMPTY_TASK_AUTH_SCOPE: TaskAuthScope = {
  memberOrgUnitIds: [],
  permissionReadOrgUnitIds: [],
  permissionManageOrgUnitIds: [],
};

export type TaskAuthorizationRecord = {
  tenantId: string;
  createdByUserId: string | null;
  assigneeUserIds: readonly string[];
  visibilityScope: TaskVisibilityScope;
  orgUnitId: string | null;
  /** When set, ORG_UNIT org-derived access requires orgUnitTenantId === task tenantId. */
  orgUnitTenantId?: string | null;
};

export type TaskSeriesAuthorizationRecord = {
  tenantId: string;
  createdByUserId: string | null;
  assigneeUserIds: readonly string[];
  visibilityScope: TaskVisibilityScope;
  orgUnitId: string | null;
};

function hasTaskPermission(ctx: TaskServiceContext, permission: string): boolean {
  return ctx.permissionKeys.includes(permission);
}

function resolveAuth(ctx: TaskServiceContext): TaskAuthScope {
  return ctx.auth ?? EMPTY_TASK_AUTH_SCOPE;
}

export function orgReadableUnitIds(auth: TaskAuthScope): string[] {
  return [
    ...new Set([...auth.memberOrgUnitIds, ...auth.permissionReadOrgUnitIds]),
  ];
}

type OrgUnitNode = { id: string; parentId: string | null };

type ScopedAssignment = {
  orgUnitId: string;
  scopeMode: "THIS_ORG_UNIT" | "THIS_ORG_UNIT_AND_DESCENDANTS" | null;
};

function expandScopedOrgUnitCoverage(
  assignments: ScopedAssignment[],
  orgUnits: OrgUnitNode[],
): string[] {
  if (assignments.length === 0) return [];

  const childrenByParent = new Map<string, string[]>();
  for (const unit of orgUnits) {
    if (!unit.parentId) continue;
    const list = childrenByParent.get(unit.parentId) ?? [];
    list.push(unit.id);
    childrenByParent.set(unit.parentId, list);
  }

  function collectDescendants(rootId: string): string[] {
    const stack = [rootId];
    const out: string[] = [];
    while (stack.length > 0) {
      const id = stack.pop()!;
      out.push(id);
      for (const child of childrenByParent.get(id) ?? []) {
        stack.push(child);
      }
    }
    return out;
  }

  const covered = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.scopeMode === "THIS_ORG_UNIT_AND_DESCENDANTS") {
      for (const id of collectDescendants(assignment.orgUnitId)) {
        covered.add(id);
      }
    } else {
      covered.add(assignment.orgUnitId);
    }
  }
  return [...covered];
}

function roleCarriesAnyTaskRead(keys: readonly string[]): boolean {
  return TASK_READ_PERMISSIONS.some((p) => keys.includes(p));
}

/**
 * Hydrates org membership + scoped task role coverage once per request.
 */
export async function loadTaskAuthScope(
  userId: string,
  tenantId: string,
): Promise<TaskAuthScope> {
  const [memberOrgUnitIds, orgUnits, userRoles] = await Promise.all([
    loadOrgUnitIds(userId, tenantId),
    prisma.orgUnit.findMany({
      where: { tenantId, status: { not: "ARCHIVED" } },
      select: { id: true, parentId: true },
    }),
    prisma.userRole.findMany({
      where: {
        userId,
        tenantId,
        orgUnitId: { not: null },
        role: {
          scope: "TENANT",
          tenantId,
          isArchived: false,
          rolePermissions: {
            some: {
              permission: {
                key: { in: [...TASK_READ_PERMISSIONS] },
                scope: "TENANT",
              },
            },
          },
        },
      },
      select: {
        orgUnitId: true,
        scopeMode: true,
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    }),
  ]);

  const readAssignments: ScopedAssignment[] = [];
  const manageAssignments: ScopedAssignment[] = [];

  for (const ur of userRoles) {
    if (!ur.orgUnitId) continue;
    const keys = ur.role.rolePermissions.map((rp) => rp.permission.key);
    if (roleCarriesAnyTaskRead(keys)) {
      readAssignments.push({
        orgUnitId: ur.orgUnitId,
        scopeMode: ur.scopeMode,
      });
    }
    if (keys.includes(PERMISSIONS.TASKS_MANAGE)) {
      manageAssignments.push({
        orgUnitId: ur.orgUnitId,
        scopeMode: ur.scopeMode,
      });
    }
  }

  return {
    memberOrgUnitIds,
    permissionReadOrgUnitIds: expandScopedOrgUnitCoverage(
      readAssignments,
      orgUnits,
    ),
    permissionManageOrgUnitIds: expandScopedOrgUnitCoverage(
      manageAssignments,
      orgUnits,
    ),
  };
}

/** Tenant-wide CLUB read (tasks.view_all / tasks.manage via tenant-wide roles only). */
export function hasTenantWideClubTaskRead(ctx: TaskServiceContext): boolean {
  return (
    hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW_ALL) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)
  );
}

export function canReadTask(
  ctx: TaskServiceContext,
  task: TaskAuthorizationRecord,
): boolean {
  if (task.tenantId !== ctx.tenantId) return false;

  if (task.createdByUserId === ctx.userId) return true;
  if (task.assigneeUserIds.includes(ctx.userId)) return true;

  switch (task.visibilityScope) {
    case TaskVisibilityScope.CLUB:
      return hasTenantWideClubTaskRead(ctx);
    case TaskVisibilityScope.ASSIGNEES_ONLY:
      return false;
    case TaskVisibilityScope.ORG_UNIT: {
      if (!task.orgUnitId) return false;
      if (
        task.orgUnitTenantId != null &&
        task.orgUnitTenantId !== ctx.tenantId
      ) {
        return false;
      }
      const readable = orgReadableUnitIds(resolveAuth(ctx));
      return readable.includes(task.orgUnitId);
    }
    default:
      return false;
  }
}

/** @deprecated Prefer canReadTask — kept for existing call sites during cutover. */
export function canViewTaskRecord(
  ctx: TaskServiceContext,
  task: {
    tenantId: string;
    createdByUserId: string | null;
    assigneeUserIds: string[];
    visibilityScope?: TaskVisibilityScope;
    orgUnitId?: string | null;
  },
): boolean {
  return canReadTask(ctx, {
    tenantId: task.tenantId,
    createdByUserId: task.createdByUserId,
    assigneeUserIds: task.assigneeUserIds,
    visibilityScope: task.visibilityScope ?? TaskVisibilityScope.CLUB,
    orgUnitId: task.orgUnitId ?? null,
  });
}

export function canManageTask(
  ctx: TaskServiceContext,
  task: TaskAuthorizationRecord,
): boolean {
  if (!canReadTask(ctx, task)) return false;

  if (task.visibilityScope === TaskVisibilityScope.CLUB) {
    return hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
  }

  if (task.visibilityScope === TaskVisibilityScope.ORG_UNIT && task.orgUnitId) {
    return resolveAuth(ctx).permissionManageOrgUnitIds.includes(task.orgUnitId);
  }

  return false;
}

export function canReadTaskSeries(
  ctx: TaskServiceContext,
  series: TaskSeriesAuthorizationRecord,
): boolean {
  return canReadTask(ctx, {
    tenantId: series.tenantId,
    createdByUserId: series.createdByUserId,
    assigneeUserIds: series.assigneeUserIds,
    visibilityScope: series.visibilityScope,
    orgUnitId: series.orgUnitId,
  });
}

export function canManageTaskSeries(
  ctx: TaskServiceContext,
  series: TaskSeriesAuthorizationRecord,
): boolean {
  return canManageTask(ctx, {
    tenantId: series.tenantId,
    createdByUserId: series.createdByUserId,
    assigneeUserIds: series.assigneeUserIds,
    visibilityScope: series.visibilityScope,
    orgUnitId: series.orgUnitId,
  });
}

function directTaskAccessWhere(
  ctx: TaskServiceContext,
): Prisma.TaskWhereInput[] {
  return [
    { createdByUserId: ctx.userId },
    {
      assignees: {
        some: { userId: ctx.userId, tenantId: ctx.tenantId },
      },
    },
  ];
}

/**
 * Prisma predicate for authorized Task reads (lists, search, counts, KPIs).
 */
export function buildTaskReadWhere(ctx: TaskServiceContext): Prisma.TaskWhereInput {
  const auth = resolveAuth(ctx);
  const orgIds = orgReadableUnitIds(auth);
  const orBranches: Prisma.TaskWhereInput[] = [...directTaskAccessWhere(ctx)];

  if (hasTenantWideClubTaskRead(ctx)) {
    orBranches.push({ visibilityScope: TaskVisibilityScope.CLUB });
  }

  if (orgIds.length > 0) {
    orBranches.push({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: { in: orgIds },
      orgUnit: { tenantId: ctx.tenantId },
    });
  }

  return {
    tenantId: ctx.tenantId,
    OR: orBranches,
  };
}

/** @deprecated Alias — use buildTaskReadWhere */
export function buildTaskVisibilityWhere(
  ctx: TaskServiceContext,
): Prisma.TaskWhereInput {
  return buildTaskReadWhere(ctx);
}

const PARENT_TASK_SELECT = {
  id: true,
  title: true,
  tenantId: true,
  createdByUserId: true,
  visibilityScope: true,
  orgUnitId: true,
  orgUnit: { select: { tenantId: true } },
  assignees: { select: { userId: true } },
} satisfies Prisma.TaskSelect;

type ParentTaskAuthRow = Prisma.TaskGetPayload<{ select: typeof PARENT_TASK_SELECT }>;

function parentRowToAuthRecord(row: ParentTaskAuthRow): TaskAuthorizationRecord {
  return {
    tenantId: row.tenantId,
    createdByUserId: row.createdByUserId,
    assigneeUserIds: row.assignees?.map((a) => a.userId) ?? [],
    visibilityScope: row.visibilityScope,
    orgUnitId: row.orgUnitId,
    orgUnitTenantId: row.orgUnit?.tenantId ?? null,
  };
}

/** Parent titles are omitted when the actor cannot read the parent Task. */
export async function loadAuthorizedParentTaskRefs(
  ctx: TaskServiceContext,
  parentIds: string[],
): Promise<Map<string, { id: string; title: string }>> {
  if (parentIds.length === 0) return new Map();

  const parents = await prisma.task.findMany({
    where: { tenantId: ctx.tenantId, id: { in: parentIds } },
    select: PARENT_TASK_SELECT,
  });

  const map = new Map<string, { id: string; title: string }>();
  for (const row of parents) {
    if (canReadTask(ctx, parentRowToAuthRecord(row))) {
      map.set(row.id, { id: row.id, title: row.title });
    }
  }
  return map;
}

export function buildTaskSeriesReadWhere(
  ctx: TaskServiceContext,
): Prisma.TaskSeriesWhereInput {
  const auth = resolveAuth(ctx);
  const orgIds = orgReadableUnitIds(auth);

  const scopeBranches: Prisma.TaskSeriesWhereInput[] = [
    { createdByUserId: ctx.userId },
    {
      assigneeTemplates: {
        some: { userId: ctx.userId, tenantId: ctx.tenantId },
      },
    },
  ];

  if (hasTenantWideClubTaskRead(ctx)) {
    scopeBranches.push({ visibilityScope: TaskVisibilityScope.CLUB });
  }

  if (orgIds.length > 0) {
    scopeBranches.push({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: { in: orgIds },
      orgUnit: { tenantId: ctx.tenantId },
    });
  }

  return {
    tenantId: ctx.tenantId,
    OR: scopeBranches,
  };
}
