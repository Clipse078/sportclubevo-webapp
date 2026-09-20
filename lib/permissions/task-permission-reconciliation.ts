/**
 * AUFGABEN — idempotent task permission reconciliation.
 *
 * Testable core for scripts/sync-task-permissions.ts.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

const TASKS_MODULE = "TASKS" as PermissionModule;
const TENANT_SCOPE = "TENANT" as PermissionScope;

export const TASK_PERMISSION_DEFS = [
  { key: "tasks.view", name: "View tasks", module: TASKS_MODULE },
  { key: "tasks.create", name: "Create tasks", module: TASKS_MODULE },
  { key: "tasks.assign", name: "Assign tasks", module: TASKS_MODULE },
  { key: "tasks.view_all", name: "View all tasks in tenant", module: TASKS_MODULE },
  { key: "tasks.manage", name: "Manage tasks", module: TASKS_MODULE },
] as const;

export const TASK_PERMISSION_KEYS = TASK_PERMISSION_DEFS.map((p) => p.key);

export const TASK_SUPER_ADMIN_ROLE_KEY = "super_admin";
export const TASK_TENANT_CLUB_ADMIN_KEY_PREFIX = `${CLUB_ADMIN_TEMPLATE_KEY}__`;

/** Full task capability set for canonical tenant Club Admin roles. */
export const TASK_CLUB_ADMIN_PERMISSION_KEYS = TASK_PERMISSION_KEYS;

/** super_admin receives full task permissions for bootstrap. */
export const TASK_ROLE_ASSIGNMENTS = [
  {
    roleKey: TASK_SUPER_ADMIN_ROLE_KEY,
    permissionKeys: TASK_PERMISSION_KEYS,
  },
] as const;

export type PermissionSyncOutcome =
  | { action: "created"; key: string }
  | { action: "already_exists"; key: string }
  | { action: "updated"; key: string };

export type RolePermissionSyncOutcome =
  | { action: "assigned"; roleKey: string; permissionKey: string }
  | { action: "already_assigned"; roleKey: string; permissionKey: string }
  | { action: "role_not_found"; roleKey: string; permissionKey: string }
  | { action: "permission_not_in_db"; roleKey: string; permissionKey: string };

export type TaskPermissionReconciliationResult = {
  permissions: PermissionSyncOutcome[];
  rolePermissions: RolePermissionSyncOutcome[];
  tenantClubAdminRoles: RolePermissionSyncOutcome[];
};

export async function reconcileTaskPermissions(
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<TaskPermissionReconciliationResult> {
  const permissions: PermissionSyncOutcome[] = [];
  const rolePermissions: RolePermissionSyncOutcome[] = [];
  const tenantClubAdminRoles: RolePermissionSyncOutcome[] = [];

  for (const def of TASK_PERMISSION_DEFS) {
    const existing = await prisma.permission.findUnique({ where: { key: def.key } });
    if (!existing) {
      permissions.push({ action: "created", key: def.key });
      if (!dryRun) {
        await prisma.permission.create({
          data: {
            key: def.key,
            name: def.name,
            module: def.module,
            scope: TENANT_SCOPE,
            grantableByAdmin: true,
          },
        });
      }
    } else {
      permissions.push({ action: "already_exists", key: def.key });
    }
  }

  for (const assignment of TASK_ROLE_ASSIGNMENTS) {
    for (const permissionKey of assignment.permissionKeys) {
      rolePermissions.push(
        await assignPermissionToRole(prisma, assignment.roleKey, permissionKey, dryRun),
      );
    }
  }

  const materializedClubAdminRoles = await prisma.role.findMany({
    where: {
      scope: "TENANT",
      isSystem: true,
      key: { startsWith: TASK_TENANT_CLUB_ADMIN_KEY_PREFIX },
    },
    select: { key: true },
  });

  for (const role of materializedClubAdminRoles) {
    for (const permissionKey of TASK_CLUB_ADMIN_PERMISSION_KEYS) {
      tenantClubAdminRoles.push(
        await assignPermissionToRole(prisma, role.key, permissionKey, dryRun),
      );
    }
  }

  return { permissions, rolePermissions, tenantClubAdminRoles };
}

async function assignPermissionToRole(
  prisma: PrismaClient,
  roleKey: string,
  permissionKey: string,
  dryRun: boolean,
): Promise<RolePermissionSyncOutcome> {
  const role = await prisma.role.findFirst({ where: { key: roleKey } });
  if (!role) {
    return { action: "role_not_found", roleKey, permissionKey };
  }

  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) {
    return { action: "permission_not_in_db", roleKey, permissionKey };
  }

  const existingRp = await prisma.rolePermission.findFirst({
    where: { roleId: role.id, permissionId: permission.id },
  });

  const outcome: RolePermissionSyncOutcome = existingRp
    ? { action: "already_assigned", roleKey, permissionKey }
    : { action: "assigned", roleKey, permissionKey };

  if (!dryRun) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  return outcome;
}
