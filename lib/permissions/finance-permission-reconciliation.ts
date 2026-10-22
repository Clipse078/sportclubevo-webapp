/**
 * SCE-FINANCE-01B — idempotent organisation finance permission reconciliation.
 *
 * Ensures finance.* catalog rows exist, then aligns tenant Club Admin role
 * identities via the canonical catalog reconciliation (no Finance-only RBAC bypass).
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";

import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import type { TenantClubAdminPermissionReconciliationResult } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";

const FINANCE_MODULE = "FINANCE" as PermissionModule;
const TENANT_SCOPE = "TENANT" as PermissionScope;

export const FINANCE_PERMISSION_DEFS = [
  {
    key: "finance.view",
    name: "View organisation finance",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.structure.manage",
    name: "Manage finance structure",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.admin",
    name: "Administer finance configuration",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
] as const;

export const FINANCE_PERMISSION_KEYS = FINANCE_PERMISSION_DEFS.map((def) => def.key);

export const FINANCE_SUPER_ADMIN_ROLE_KEY = "super_admin";

export type PermissionSyncOutcome =
  | { action: "created"; key: string }
  | { action: "already_exists"; key: string }
  | { action: "updated"; key: string };

export type RolePermissionSyncOutcome =
  | { action: "assigned"; roleKey: string; permissionKey: string }
  | { action: "already_assigned"; roleKey: string; permissionKey: string }
  | { action: "role_not_found"; roleKey: string; permissionKey: string }
  | { action: "permission_not_in_db"; roleKey: string; permissionKey: string };

export type FinancePermissionReconciliationResult = {
  permissions: PermissionSyncOutcome[];
  superAdmin: RolePermissionSyncOutcome[];
  tenantClubAdmin: TenantClubAdminPermissionReconciliationResult;
};

export async function reconcileFinancePermissions(
  prisma: PrismaClient,
  dryRun = false,
): Promise<FinancePermissionReconciliationResult> {
  const permissions: PermissionSyncOutcome[] = [];

  for (const def of FINANCE_PERMISSION_DEFS) {
    const existing = await prisma.permission.findUnique({
      where: { key: def.key },
      select: { id: true, name: true, module: true, scope: true, grantableByAdmin: true },
    });

    if (existing) {
      const needsUpdate =
        existing.name !== def.name ||
        existing.module !== def.module ||
        existing.scope !== def.scope ||
        existing.grantableByAdmin !== def.grantableByAdmin;
      permissions.push({ action: needsUpdate ? "updated" : "already_exists", key: def.key });
      if (needsUpdate && !dryRun) {
        await prisma.permission.update({
          where: { key: def.key },
          data: {
            name: def.name,
            module: def.module,
            scope: def.scope,
            grantableByAdmin: def.grantableByAdmin,
          },
        });
      }
    } else {
      permissions.push({ action: "created", key: def.key });
      if (!dryRun) {
        await prisma.permission.create({ data: def });
      }
    }
  }

  const superAdmin: RolePermissionSyncOutcome[] = [];
  for (const permissionKey of FINANCE_PERMISSION_KEYS) {
    superAdmin.push(
      await assignPermissionToRole(prisma, FINANCE_SUPER_ADMIN_ROLE_KEY, permissionKey, dryRun),
    );
  }

  const tenantClubAdmin = await reconcileTenantClubAdminPermissions(prisma, dryRun);

  return { permissions, superAdmin, tenantClubAdmin };
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
