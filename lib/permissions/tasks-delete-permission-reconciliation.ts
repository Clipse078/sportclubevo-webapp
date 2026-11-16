/**
 * PKG-03 — idempotent tasks.delete permission backfill (proposal / controlled sync).
 *
 * Mirrors workspace.delete and initiatives.delete reconciliation patterns.
 * NOT executed automatically in deploys — run only via an explicit script after PO approval.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

const TENANT_SCOPE = "TENANT" as PermissionScope;
const TASKS_MODULE = "TASKS" as PermissionModule;

export const TASKS_DELETE_SUPER_ADMIN_ROLE_KEY = "super_admin";
export const TASKS_DELETE_CLUB_ADMIN_KEY_PREFIX = `${CLUB_ADMIN_TEMPLATE_KEY}__`;

export const TASKS_DELETE_PERMISSION_DEF = {
  key: "tasks.delete",
  name: "Permanently delete tasks",
  module: TASKS_MODULE,
  scope: TENANT_SCOPE,
  grantableByAdmin: true,
} as const;

export type TasksDeletePermissionSyncOutcome =
  | { action: "created"; key: string }
  | { action: "already_exists"; key: string }
  | { action: "updated"; key: string };

export type TasksDeleteRolePermissionSyncOutcome =
  | { action: "assigned"; roleKey: string; permissionKey: string }
  | { action: "already_assigned"; roleKey: string; permissionKey: string }
  | { action: "role_not_found"; roleKey: string; permissionKey: string }
  | { action: "permission_not_in_db"; roleKey: string; permissionKey: string };

export type TasksDeletePermissionReconciliationResult = {
  permission: TasksDeletePermissionSyncOutcome;
  superAdmin: TasksDeleteRolePermissionSyncOutcome;
  tenantClubAdminRoles: TasksDeleteRolePermissionSyncOutcome[];
};

export async function reconcileTasksDeletePermission(
  prisma: PrismaClient,
  dryRun = true,
): Promise<TasksDeletePermissionReconciliationResult> {
  const def = TASKS_DELETE_PERMISSION_DEF;

  const existing = await prisma.permission.findUnique({ where: { key: def.key } });
  const permission: TasksDeletePermissionSyncOutcome = existing
    ? { action: "already_exists", key: def.key }
    : { action: "created", key: def.key };

  if (!existing && !dryRun) {
    await prisma.permission.create({
      data: {
        key: def.key,
        name: def.name,
        module: def.module,
        scope: def.scope,
        grantableByAdmin: def.grantableByAdmin,
      },
    });
  }

  const assign = async (
    roleKey: string,
  ): Promise<TasksDeleteRolePermissionSyncOutcome> => {
    const role = await prisma.role.findFirst({ where: { key: roleKey } });
    if (!role) return { action: "role_not_found", roleKey, permissionKey: def.key };
    const permissionRow =
      existing ?? (await prisma.permission.findUnique({ where: { key: def.key } }));
    if (!permissionRow) {
      return { action: "permission_not_in_db", roleKey, permissionKey: def.key };
    }
    const rp = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, permissionId: permissionRow.id },
    });
    const outcome: TasksDeleteRolePermissionSyncOutcome = rp
      ? { action: "already_assigned", roleKey, permissionKey: def.key }
      : { action: "assigned", roleKey, permissionKey: def.key };
    if (!dryRun && !rp) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permissionRow.id },
      });
    }
    return outcome;
  };

  const superAdmin = await assign(TASKS_DELETE_SUPER_ADMIN_ROLE_KEY);

  const tenantClubAdminRoles = await prisma.role.findMany({
    where: {
      scope: "TENANT",
      isSystem: true,
      key: { startsWith: TASKS_DELETE_CLUB_ADMIN_KEY_PREFIX },
    },
    select: { key: true },
  });

  const clubAdminOutcomes: TasksDeleteRolePermissionSyncOutcome[] = [];
  for (const role of tenantClubAdminRoles) {
    clubAdminOutcomes.push(await assign(role.key));
  }

  return { permission, superAdmin, tenantClubAdminRoles: clubAdminOutcomes };
}