/**
 * AUFGABEN-01 — idempotent task permission reconciliation.
 *
 * Testable core for scripts/sync-task-permissions.ts.
 */

import type { PermissionModule, PrismaClient } from "@prisma/client";

const TASKS_MODULE = "TASKS" as PermissionModule;

export const TASK_PERMISSION_DEFS = [
  { key: "tasks.view", name: "View tasks", module: TASKS_MODULE },
  { key: "tasks.create", name: "Create tasks", module: TASKS_MODULE },
  { key: "tasks.manage", name: "Manage tasks", module: TASKS_MODULE },
  { key: "tasks.assign", name: "Assign tasks", module: TASKS_MODULE },
] as const;

/** super_admin receives full task permissions for bootstrap until club roles are configured. */
export const TASK_ROLE_ASSIGNMENTS = [
  {
    roleKey: "super_admin",
    permissionKeys: [
      "tasks.view",
      "tasks.create",
      "tasks.manage",
      "tasks.assign",
    ] as const,
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

export async function reconcileTaskPermissions(
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<{
  permissions: PermissionSyncOutcome[];
  rolePermissions: RolePermissionSyncOutcome[];
}> {
  const permissions: PermissionSyncOutcome[] = [];
  const rolePermissions: RolePermissionSyncOutcome[] = [];

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
            scope: "TENANT",
            grantableByAdmin: true,
          },
        });
      }
    } else {
      permissions.push({ action: "already_exists", key: def.key });
    }
  }

  for (const assignment of TASK_ROLE_ASSIGNMENTS) {
    const role = await prisma.role.findFirst({ where: { key: assignment.roleKey } });
    if (!role) {
      for (const permissionKey of assignment.permissionKeys) {
        rolePermissions.push({
          action: "role_not_found",
          roleKey: assignment.roleKey,
          permissionKey,
        });
      }
      continue;
    }

    for (const permissionKey of assignment.permissionKeys) {
      const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
      if (!permission) {
        rolePermissions.push({
          action: "permission_not_in_db",
          roleKey: assignment.roleKey,
          permissionKey,
        });
        continue;
      }

      const existingRp = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: permission.id },
      });

      if (existingRp) {
        rolePermissions.push({
          action: "already_assigned",
          roleKey: assignment.roleKey,
          permissionKey,
        });
      } else {
        rolePermissions.push({
          action: "assigned",
          roleKey: assignment.roleKey,
          permissionKey,
        });
        if (!dryRun) {
          await prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: permission.id },
          });
        }
      }
    }
  }

  return { permissions, rolePermissions };
}
