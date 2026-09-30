/**
 * SCE — planning.allocations.* idempotent backfill for canonical Club Admin roles.
 *
 * Mirrors prisma/seed.ts tenant club_admin policy and the established
 * task-permission / teams.delete reconciliation pattern: new TENANT catalog
 * keys do not flow onto already-materialized per-tenant Club Admin Role rows
 * until explicitly reconciled.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

const TRAINING_MODULE = "TRAININGS" as PermissionModule;
const TENANT_SCOPE = "TENANT" as PermissionScope;

export const PLANNING_ALLOCATIONS_PERMISSION_DEFS = [
  {
    key: "planning.allocations.view",
    name: "View planning allocations",
    module: TRAINING_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
  {
    key: "planning.allocations.manage",
    name: "Manage planning allocations",
    module: TRAINING_MODULE,
    scope: TENANT_SCOPE,
    grantableByAdmin: true,
  },
] as const;

export const PLANNING_ALLOCATIONS_PERMISSION_KEYS =
  PLANNING_ALLOCATIONS_PERMISSION_DEFS.map((def) => def.key);

export const PLANNING_ALLOCATIONS_SUPER_ADMIN_ROLE_KEY = "super_admin";
export const TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX = `${CLUB_ADMIN_TEMPLATE_KEY}__`;

export const FC_ALLSCHWIL_TENANT_KEY = "fc-allschwil";
export const FC_ALLSCHWIL_LEGACY_CLUB_ADMIN_ROLE_KEY = "club_admin_fc_allschwil";

export type PermissionSyncOutcome =
  | { action: "created"; key: string }
  | { action: "already_exists"; key: string }
  | { action: "updated"; key: string };

export type RolePermissionSyncOutcome =
  | { action: "assigned"; roleKey: string; permissionKey: string }
  | { action: "already_assigned"; roleKey: string; permissionKey: string }
  | { action: "role_not_found"; roleKey: string; permissionKey: string }
  | { action: "permission_not_in_db"; roleKey: string; permissionKey: string };

export type PlanningAllocationsReconciliationResult = {
  permissions: PermissionSyncOutcome[];
  superAdmin: RolePermissionSyncOutcome[];
  tenantClubAdminRoles: RolePermissionSyncOutcome[];
  fcAllschwilLegacyClubAdmin: RolePermissionSyncOutcome[] | null;
};

export async function reconcilePlanningAllocationsPermissions(
  prisma: PrismaClient,
  dryRun = false,
): Promise<PlanningAllocationsReconciliationResult> {
  const permissions: PermissionSyncOutcome[] = [];

  for (const def of PLANNING_ALLOCATIONS_PERMISSION_DEFS) {
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
  for (const permissionKey of PLANNING_ALLOCATIONS_PERMISSION_KEYS) {
    superAdmin.push(
      await assignPermissionToRole(
        prisma,
        PLANNING_ALLOCATIONS_SUPER_ADMIN_ROLE_KEY,
        permissionKey,
        dryRun,
      ),
    );
  }

  const materializedClubAdminRoles = await prisma.role.findMany({
    where: {
      scope: "TENANT",
      isSystem: true,
      key: { startsWith: TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX },
    },
    select: { key: true },
  });

  const tenantClubAdminRoles: RolePermissionSyncOutcome[] = [];
  for (const role of materializedClubAdminRoles) {
    for (const permissionKey of PLANNING_ALLOCATIONS_PERMISSION_KEYS) {
      tenantClubAdminRoles.push(
        await assignPermissionToRole(prisma, role.key, permissionKey, dryRun),
      );
    }
  }

  const fcAllschwilLegacyRoleKey = await resolveFcAllschwilLegacyClubAdminRoleKey(prisma);
  const fcAllschwilLegacyClubAdmin = fcAllschwilLegacyRoleKey
    ? await Promise.all(
        PLANNING_ALLOCATIONS_PERMISSION_KEYS.map((permissionKey) =>
          assignPermissionToRole(prisma, fcAllschwilLegacyRoleKey, permissionKey, dryRun),
        ),
      )
    : null;

  return {
    permissions,
    superAdmin,
    tenantClubAdminRoles,
    fcAllschwilLegacyClubAdmin,
  };
}

async function resolveFcAllschwilLegacyClubAdminRoleKey(
  prisma: PrismaClient,
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: FC_ALLSCHWIL_TENANT_KEY },
    select: { id: true },
  });
  if (!tenant) return null;

  const role = await prisma.role.findUnique({
    where: { key: FC_ALLSCHWIL_LEGACY_CLUB_ADMIN_ROLE_KEY },
    select: { key: true, scope: true, tenantId: true },
  });
  if (!role) return null;
  if (role.scope !== "TENANT") return null;
  if (role.tenantId !== tenant.id) return null;

  return role.key;
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
