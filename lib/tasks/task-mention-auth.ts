/**
 * AUFGABEN-06B — mention eligibility via canonical canReadTask (never grants access).
 */

import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskValidationError } from "./errors";
import {
  canReadTask,
  loadTaskAuthScope,
  orgReadableUnitIds,
  type TaskAuthorizationRecord,
} from "./task-authorization";
import { taskAuthorizationFromRow, type VisibleTaskRow } from "./task-access";
import type { TaskAuthScope, TaskServiceContext } from "./types";
import { MAX_TASK_COMMENT_MENTIONS } from "./constants";

const TASK_READ_PERMISSIONS = [
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.TASKS_VIEW_ALL,
  PERMISSIONS.TASKS_MANAGE,
] as const;

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

function buildAuthScopeForUser(
  userId: string,
  memberOrgUnitIds: string[],
  userRoles: Array<{
    userId: string;
    orgUnitId: string | null;
    scopeMode: "THIS_ORG_UNIT" | "THIS_ORG_UNIT_AND_DESCENDANTS" | null;
    role: { rolePermissions: Array<{ permission: { key: string } }> };
  }>,
  orgUnits: OrgUnitNode[],
): TaskAuthScope {
  const readAssignments: ScopedAssignment[] = [];
  const manageAssignments: ScopedAssignment[] = [];

  for (const ur of userRoles) {
    if (ur.userId !== userId || !ur.orgUnitId) continue;
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
    permissionReadOrgUnitIds: expandScopedOrgUnitCoverage(readAssignments, orgUnits),
    permissionManageOrgUnitIds: expandScopedOrgUnitCoverage(manageAssignments, orgUnits),
  };
}

export async function loadTaskServiceContextsForUsers(
  tenantId: string,
  userIds: readonly string[],
): Promise<Map<string, TaskServiceContext>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const result = new Map<string, TaskServiceContext>();
  if (unique.length === 0) return result;

  const now = new Date();
  const resolver = createEffectivePermissionResolver(prisma);

  const [orgUnits, orgMemberships, userRoles, permissionsByUser] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { tenantId, status: { not: "ARCHIVED" } },
      select: { id: true, parentId: true },
    }),
    prisma.orgUnitMembership.findMany({
      where: {
        tenantId,
        userId: { in: unique },
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        orgUnit: { status: { not: "ARCHIVED" } },
      },
      select: { userId: true, orgUnitId: true },
    }),
    prisma.userRole.findMany({
      where: {
        userId: { in: unique },
        tenantId,
        orgUnitId: { not: null },
        role: {
          scope: "TENANT",
          tenantId,
          isArchived: false,
          rolePermissions: {
            some: {
              permission: {
                key: { in: [...TASK_READ_PERMISSIONS, PERMISSIONS.TASKS_MANAGE] },
                scope: "TENANT",
              },
            },
          },
        },
      },
      select: {
        userId: true,
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
    Promise.all(
      unique.map(async (userId) => {
        const perms = await resolver.getEffectivePermissions({ userId, tenantId });
        return [userId, [...perms.platform, ...perms.tenant]] as const;
      }),
    ),
  ]);

  const memberOrgByUser = new Map<string, string[]>();
  for (const row of orgMemberships) {
    if (!row.userId || !row.orgUnitId) continue;
    const list = memberOrgByUser.get(row.userId) ?? [];
    list.push(row.orgUnitId);
    memberOrgByUser.set(row.userId, list);
  }

  const permissionKeysByUser = new Map(permissionsByUser);

  for (const userId of unique) {
    result.set(userId, {
      tenantId,
      userId,
      permissionKeys: permissionKeysByUser.get(userId) ?? [],
      auth: buildAuthScopeForUser(
        userId,
        memberOrgByUser.get(userId) ?? [],
        userRoles,
        orgUnits,
      ),
    });
  }

  return result;
}

export function normalizeMentionedUserIds(raw: string[] | undefined): string[] {
  const unique = [...new Set((raw ?? []).map((id) => id.trim()).filter(Boolean))];
  if (unique.length > MAX_TASK_COMMENT_MENTIONS) {
    throw new TaskValidationError(
      `Es können höchstens ${MAX_TASK_COMMENT_MENTIONS} Erwähnungen pro Kommentar gesetzt werden.`,
    );
  }
  return unique;
}

export async function validateMentionedUsersForTask(
  ctx: TaskServiceContext,
  task: VisibleTaskRow,
  mentionedUserIds: string[],
): Promise<string[]> {
  const normalized = normalizeMentionedUserIds(mentionedUserIds);
  if (normalized.length === 0) return [];

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId: ctx.tenantId,
      isActive: true,
      userId: { in: normalized },
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { userId: true },
  });

  const allowedTenantUsers = new Set(memberships.map((m) => m.userId));
  const missingMembership = normalized.filter((id) => !allowedTenantUsers.has(id));
  if (missingMembership.length > 0) {
    throw new TaskForbiddenError("Erwähnte Benutzer sind für diese Aufgabe nicht berechtigt.");
  }

  const authRecord = taskAuthorizationFromRow(task);
  const contexts = await loadTaskServiceContextsForUsers(ctx.tenantId, normalized);

  const eligible: string[] = [];
  for (const userId of normalized) {
    const userCtx = contexts.get(userId);
    if (!userCtx || !canReadTask(userCtx, authRecord)) {
      throw new TaskForbiddenError("Erwähnte Benutzer sind für diese Aufgabe nicht berechtigt.");
    }
    eligible.push(userId);
  }

  return eligible;
}

export async function filterUserIdsWhoCanReadTask(
  tenantId: string,
  task: TaskAuthorizationRecord,
  userIds: readonly string[],
): Promise<string[]> {
  const contexts = await loadTaskServiceContextsForUsers(tenantId, userIds);
  return userIds.filter((userId) => {
    const userCtx = contexts.get(userId);
    return userCtx ? canReadTask(userCtx, task) : false;
  });
}

/** Revalidate recipient authorization at notification time (fresh read semantics). */
export async function canUserReadTaskNow(
  tenantId: string,
  userId: string,
  task: TaskAuthorizationRecord,
): Promise<boolean> {
  const contexts = await loadTaskServiceContextsForUsers(tenantId, [userId]);
  const userCtx = contexts.get(userId);
  if (!userCtx) {
    const auth = await loadTaskAuthScope(userId, tenantId);
    const resolver = createEffectivePermissionResolver(prisma);
    const perms = await resolver.getEffectivePermissions({ userId, tenantId });
    const fallbackCtx: TaskServiceContext = {
      tenantId,
      userId,
      permissionKeys: [...perms.platform, ...perms.tenant],
      auth,
    };
    return canReadTask(fallbackCtx, task);
  }
  return canReadTask(userCtx, task);
}

export function directTaskParticipantUserIds(task: TaskAuthorizationRecord): string[] {
  return [
    ...new Set(
      [task.createdByUserId, ...task.assigneeUserIds].filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      ),
    ),
  ];
}

export function orgUnitReadableUserIdsFromAuth(auth: TaskAuthScope, orgUnitId: string): boolean {
  return orgReadableUnitIds(auth).includes(orgUnitId);
}
