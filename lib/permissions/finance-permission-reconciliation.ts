/**
 * SCE-FINANCE-01B — idempotent organisation finance permission reconciliation.
 *
 * Ensures finance.* catalog rows exist, then aligns tenant Club Admin role
 * identities via the canonical catalog reconciliation (no Finance-only RBAC bypass).
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import type { TenantClubAdminPermissionReconciliationResult } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import { listTenantClubAdminRoleKeysForReconciliation } from "@/lib/permissions/tenant-club-admin-role-discovery";

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
    key: "finance.budget.view",
    name: "View organisation budgets",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.budget.manage",
    name: "Manage draft budgets",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.actual.view",
    name: "View management actuals",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.actual.manage",
    name: "Manage management actuals",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.forecast.view",
    name: "View management forecasts",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.forecast.manage",
    name: "Manage management forecasts",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.approve",
    name: "Approve finance baselines",
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
  {
    key: "finance.publication.view",
    name: "View financial publication history",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.reporting.share",
    name: "Share financial reports",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.reporting.publish",
    name: "Publish financial reports",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.reporting.distribute",
    name: "Distribute published financial reports",
    module: FINANCE_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "finance.share.manage",
    name: "Manage and revoke financial shares",
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

const FINANCE_ACTUAL_PERMISSION_KEYS = [
  PERMISSIONS.FINANCE_ACTUAL_VIEW,
  PERMISSIONS.FINANCE_ACTUAL_MANAGE,
] as const;

const FINANCE_FORECAST_PERMISSION_KEYS = [
  PERMISSIONS.FINANCE_FORECAST_VIEW,
  PERMISSIONS.FINANCE_FORECAST_MANAGE,
] as const;

const FINANCE_PUBLICATION_PERMISSION_KEYS = [
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE,
  PERMISSIONS.FINANCE_SHARE_MANAGE,
] as const;

/** Idempotent alignment of finance.actual.* on tenant Club Admin roles (FIN-03A catalog gap). */
export async function reconcileFinanceActualPermissionsForClubAdmin(
  prisma: PrismaClient,
  dryRun = false,
): Promise<RolePermissionSyncOutcome[]> {
  for (const def of FINANCE_PERMISSION_DEFS) {
    if (!(FINANCE_ACTUAL_PERMISSION_KEYS as readonly string[]).includes(def.key)) {
      continue;
    }
    const existing = await prisma.permission.findUnique({
      where: { key: def.key },
      select: { id: true },
    });
    if (!existing && !dryRun) {
      await prisma.permission.create({ data: def });
    }
  }

  const clubAdminRoleKeys = await listTenantClubAdminRoleKeysForReconciliation(prisma);

  const outcomes: RolePermissionSyncOutcome[] = [];
  for (const roleKey of clubAdminRoleKeys) {
    for (const permissionKey of FINANCE_ACTUAL_PERMISSION_KEYS) {
      outcomes.push(await assignPermissionToRole(prisma, roleKey, permissionKey, dryRun));
    }
  }
  return outcomes;
}

/** Idempotent alignment of finance.forecast.* on tenant Club Admin roles (FIN-04A catalog gap). */
export async function reconcileFinanceForecastPermissionsForClubAdmin(
  prisma: PrismaClient,
  dryRun = false,
): Promise<RolePermissionSyncOutcome[]> {
  for (const def of FINANCE_PERMISSION_DEFS) {
    if (!(FINANCE_FORECAST_PERMISSION_KEYS as readonly string[]).includes(def.key)) {
      continue;
    }
    const existing = await prisma.permission.findUnique({
      where: { key: def.key },
      select: { id: true },
    });
    if (!existing && !dryRun) {
      await prisma.permission.create({ data: def });
    }
  }

  const clubAdminRoleKeys = await listTenantClubAdminRoleKeysForReconciliation(prisma);

  const outcomes: RolePermissionSyncOutcome[] = [];
  for (const roleKey of clubAdminRoleKeys) {
    for (const permissionKey of FINANCE_FORECAST_PERMISSION_KEYS) {
      outcomes.push(await assignPermissionToRole(prisma, roleKey, permissionKey, dryRun));
    }
  }
  return outcomes;
}

/** Idempotent alignment of FIN-06 publication/share catalog keys on tenant Club Admin roles. */
export async function reconcileFinancePublicationPermissionsForClubAdmin(
  prisma: PrismaClient,
  dryRun = false,
): Promise<RolePermissionSyncOutcome[]> {
  for (const def of FINANCE_PERMISSION_DEFS) {
    if (!(FINANCE_PUBLICATION_PERMISSION_KEYS as readonly string[]).includes(def.key)) {
      continue;
    }
    const existing = await prisma.permission.findUnique({
      where: { key: def.key },
      select: { id: true },
    });
    if (!existing && !dryRun) {
      await prisma.permission.create({ data: def });
    }
  }

  const clubAdminRoleKeys = await listTenantClubAdminRoleKeysForReconciliation(prisma);

  const outcomes: RolePermissionSyncOutcome[] = [];
  for (const roleKey of clubAdminRoleKeys) {
    for (const permissionKey of FINANCE_PUBLICATION_PERMISSION_KEYS) {
      outcomes.push(await assignPermissionToRole(prisma, roleKey, permissionKey, dryRun));
    }
  }
  return outcomes;
}

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
