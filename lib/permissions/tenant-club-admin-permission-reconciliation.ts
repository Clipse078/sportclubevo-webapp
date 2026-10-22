/**
 * Idempotent reconciliation: align every tenant Club Admin role identity with
 * the live permission catalog (TENANT + grantableByAdmin=true, minus explicit
 * governance exclusions). Includes canonical materialized `club_admin__*`
 * rows and tenant-scoped Club Admin aliases still in use on existing tenants.
 * Does not modify custom/delegated non–Club Admin tenant roles.
 */

import type { PrismaClient } from "@prisma/client";

import {
  isTenantClubAdminDelegatablePermission,
  mergeTenantClubAdminAssignedPermissionKeys,
} from "@/lib/permissions/tenant-club-admin-permission-contract";
import { listTenantClubAdminRoleKeysForReconciliation } from "@/lib/permissions/tenant-club-admin-role-discovery";

export type RolePermissionSyncOutcome =
  | { action: "assigned"; roleKey: string; permissionKey: string }
  | { action: "already_assigned"; roleKey: string; permissionKey: string }
  | { action: "role_not_found"; roleKey: string; permissionKey: string }
  | { action: "permission_not_in_db"; roleKey: string; permissionKey: string };

export type TenantClubAdminPermissionReconciliationResult = {
  expectedDelegatablePermissionKeys: string[];
  expectedAssignedPermissionKeys: string[];
  tenantClubAdminRoles: RolePermissionSyncOutcome[];
};

export async function listExpectedTenantClubAdminDelegatablePermissionKeys(
  prisma: PrismaClient,
): Promise<string[]> {
  const permissions = await prisma.permission.findMany({
    select: { key: true, scope: true, grantableByAdmin: true },
  });

  return permissions
    .filter(isTenantClubAdminDelegatablePermission)
    .map((permission) => permission.key)
    .sort((a, b) => a.localeCompare(b));
}

export async function reconcileTenantClubAdminPermissions(
  prisma: PrismaClient,
  dryRun = false,
): Promise<TenantClubAdminPermissionReconciliationResult> {
  const expectedDelegatablePermissionKeys =
    await listExpectedTenantClubAdminDelegatablePermissionKeys(prisma);
  const expectedAssignedPermissionKeys = mergeTenantClubAdminAssignedPermissionKeys(
    expectedDelegatablePermissionKeys,
  );

  const clubAdminRoleKeys = await listTenantClubAdminRoleKeysForReconciliation(prisma);

  const tenantClubAdminRoles: RolePermissionSyncOutcome[] = [];

  for (const roleKey of clubAdminRoleKeys) {
    for (const permissionKey of expectedAssignedPermissionKeys) {
      tenantClubAdminRoles.push(
        await assignPermissionToRole(prisma, roleKey, permissionKey, dryRun),
      );
    }
  }

  return {
    expectedDelegatablePermissionKeys,
    expectedAssignedPermissionKeys,
    tenantClubAdminRoles,
  };
}

async function assignPermissionToRole(
  prisma: PrismaClient,
  roleKey: string,
  permissionKey: string,
  dryRun: boolean,
): Promise<RolePermissionSyncOutcome> {
  const role = await prisma.role.findUnique({ where: { key: roleKey }, select: { id: true } });
  if (!role) {
    return { action: "role_not_found", roleKey, permissionKey };
  }

  const permission = await prisma.permission.findUnique({
    where: { key: permissionKey },
    select: { id: true },
  });
  if (!permission) {
    return { action: "permission_not_in_db", roleKey, permissionKey };
  }

  const existing = await prisma.rolePermission.findUnique({
    where: {
      roleId_permissionId: { roleId: role.id, permissionId: permission.id },
    },
    select: { roleId: true },
  });

  const outcome: RolePermissionSyncOutcome = existing
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
