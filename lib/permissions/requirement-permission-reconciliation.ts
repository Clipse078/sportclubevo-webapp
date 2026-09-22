/**
 * AUFGABEN-06G1 — idempotent requirements permission reconciliation.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

const REQUIREMENTS_MODULE = "REQUIREMENTS" as PermissionModule;
const TENANT_SCOPE = "TENANT" as PermissionScope;

export const REQUIREMENT_PERMISSION_DEFS = [
  { key: "requirements.view", name: "View requirements", module: REQUIREMENTS_MODULE },
  { key: "requirements.create", name: "Create requirements", module: REQUIREMENTS_MODULE },
  { key: "requirements.manage", name: "Manage requirements", module: REQUIREMENTS_MODULE },
  {
    key: "requirements.view_aggregate",
    name: "View requirement aggregate progress",
    module: REQUIREMENTS_MODULE,
  },
] as const;

export const REQUIREMENT_PERMISSION_KEYS = REQUIREMENT_PERMISSION_DEFS.map((p) => p.key);

export const REQUIREMENT_SUPER_ADMIN_ROLE_KEY = "super_admin";
export const REQUIREMENT_TENANT_CLUB_ADMIN_KEY_PREFIX = `${CLUB_ADMIN_TEMPLATE_KEY}__`;

export const REQUIREMENT_CLUB_ADMIN_PERMISSION_KEYS = REQUIREMENT_PERMISSION_KEYS;

export const REQUIREMENT_ROLE_ASSIGNMENTS = [
  {
    roleKey: REQUIREMENT_SUPER_ADMIN_ROLE_KEY,
    permissionKeys: REQUIREMENT_PERMISSION_KEYS,
  },
] as const;

export type RequirementPermissionReconciliationResult = {
  permissions: Array<{ action: string; key: string }>;
  rolePermissions: Array<{ action: string; roleKey: string; permissionKey: string }>;
  tenantClubAdminRoles: Array<{ action: string; roleKey: string; permissionKey: string }>;
};

async function assignPermissionToRole(
  prisma: PrismaClient,
  roleKey: string,
  permissionKey: string,
  dryRun: boolean,
) {
  const role = await prisma.role.findFirst({ where: { key: roleKey } });
  if (!role) {
    return { action: "role_not_found", roleKey, permissionKey };
  }
  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) {
    return { action: "permission_not_in_db", roleKey, permissionKey };
  }
  const existing = await prisma.rolePermission.findFirst({
    where: { roleId: role.id, permissionId: permission.id },
  });
  if (existing) {
    return { action: "already_assigned", roleKey, permissionKey };
  }
  if (!dryRun) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }
  return { action: "assigned", roleKey, permissionKey };
}

export async function reconcileRequirementPermissions(
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<RequirementPermissionReconciliationResult> {
  const permissions: RequirementPermissionReconciliationResult["permissions"] = [];
  const rolePermissions: RequirementPermissionReconciliationResult["rolePermissions"] = [];
  const tenantClubAdminRoles: RequirementPermissionReconciliationResult["tenantClubAdminRoles"] = [];

  for (const def of REQUIREMENT_PERMISSION_DEFS) {
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

  for (const assignment of REQUIREMENT_ROLE_ASSIGNMENTS) {
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
      key: { startsWith: REQUIREMENT_TENANT_CLUB_ADMIN_KEY_PREFIX },
    },
    select: { key: true },
  });

  for (const role of materializedClubAdminRoles) {
    for (const permissionKey of REQUIREMENT_CLUB_ADMIN_PERMISSION_KEYS) {
      tenantClubAdminRoles.push(
        await assignPermissionToRole(prisma, role.key, permissionKey, dryRun),
      );
    }
  }

  return { permissions, rolePermissions, tenantClubAdminRoles };
}
