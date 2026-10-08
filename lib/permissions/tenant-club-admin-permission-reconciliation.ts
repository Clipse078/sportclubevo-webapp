/**
 * Idempotent reconciliation: align every canonical tenant Club Admin role with
 * the live permission catalog (TENANT + grantableByAdmin=true, minus explicit
 * governance exclusions). Does not modify custom/delegated tenant roles.
 */

import type { PrismaClient } from "@prisma/client";

import {
  CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE,
  isTenantClubAdminDelegatablePermission,
  mergeTenantClubAdminAssignedPermissionKeys,
} from "@/lib/permissions/tenant-club-admin-permission-contract";

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

  const materializedClubAdminRoles = await prisma.role.findMany({
    where: CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE,
    select: { key: true },
    orderBy: { key: "asc" },
  });

  const tenantClubAdminRoles: RolePermissionSyncOutcome[] = [];

  for (const role of materializedClubAdminRoles) {
    for (const permissionKey of expectedAssignedPermissionKeys) {
      tenantClubAdminRoles.push(
        await assignPermissionToRole(prisma, role.key, permissionKey, dryRun),
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
