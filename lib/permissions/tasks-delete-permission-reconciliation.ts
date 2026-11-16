/**
 * PKG-03 — idempotent tasks.delete permission backfill (proposal / controlled sync).
 *
 * Mirrors teams.delete / workspace.delete reconciliation patterns.
 * NOT executed automatically in deploys — run only via an explicit script after PO approval.
 */

import type { PermissionModule, PermissionScope, PrismaClient } from "@prisma/client";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

const TASKS_MODULE = "TASKS" as PermissionModule;
const TENANT_SCOPE = "TENANT" as PermissionScope;

export const TASKS_DELETE_SUPER_ADMIN_ROLE_KEY = "super_admin";
export const TASKS_DELETE_CLUB_ADMIN_KEY_PREFIX = `${CLUB_ADMIN_TEMPLATE_KEY}__`;

export const FC_ALLSCHWIL_TENANT_KEY = "fc-allschwil";
export const FC_ALLSCHWIL_LEGACY_CLUB_ADMIN_ROLE_KEY = "club_admin_fc_allschwil";

/** Designated STAGE PO tenant — narrow reconciliation scope (not a cross-tenant sweep). */
export const TASKS_DELETE_STAGE_PO_TENANT_KEY = FC_ALLSCHWIL_TENANT_KEY;

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
  fcAllschwilLegacyClubAdmin: TasksDeleteRolePermissionSyncOutcome | null;
};

export type TasksDeleteStageNarrowReconciliationResult = {
  databaseFingerprint: string | null;
  intendedTenantKey: string;
  permission: TasksDeletePermissionSyncOutcome;
  permissionRowPreview: typeof TASKS_DELETE_PERMISSION_DEF;
  roleGrants: TasksDeleteRolePermissionSyncOutcome[];
};

async function assignPermissionToRole(
  prisma: PrismaClient,
  roleKey: string,
  permissionKey: string,
  dryRun: boolean,
): Promise<TasksDeleteRolePermissionSyncOutcome> {
  const role = await prisma.role.findFirst({ where: { key: roleKey }, select: { id: true } });
  if (!role) return { action: "role_not_found", roleKey, permissionKey };

  const permission = await prisma.permission.findUnique({
    where: { key: permissionKey },
    select: { id: true },
  });
  if (!permission) {
    return { action: "permission_not_in_db", roleKey, permissionKey };
  }

  const existing = await prisma.rolePermission.findFirst({
    where: { roleId: role.id, permissionId: permission.id },
    select: { roleId: true },
  });

  const outcome: TasksDeleteRolePermissionSyncOutcome = existing
    ? { action: "already_assigned", roleKey, permissionKey }
    : { action: "assigned", roleKey, permissionKey };

  if (!dryRun && !existing) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  return outcome;
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

export async function reconcileTasksDeletePermission(
  prisma: PrismaClient,
  dryRun = true,
): Promise<TasksDeletePermissionReconciliationResult> {
  const def = TASKS_DELETE_PERMISSION_DEF;

  const existing = await prisma.permission.findUnique({
    where: { key: def.key },
    select: { id: true, name: true, module: true, scope: true, grantableByAdmin: true },
  });

  const permission: TasksDeletePermissionSyncOutcome = existing
    ? existing.name !== def.name ||
        existing.module !== def.module ||
        existing.scope !== def.scope ||
        existing.grantableByAdmin !== def.grantableByAdmin
      ? { action: "updated", key: def.key }
      : { action: "already_exists", key: def.key }
    : { action: "created", key: def.key };

  if (!dryRun) {
    await prisma.permission.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        module: def.module,
        scope: def.scope,
        grantableByAdmin: def.grantableByAdmin,
      },
      create: {
        key: def.key,
        name: def.name,
        module: def.module,
        scope: def.scope,
        grantableByAdmin: def.grantableByAdmin,
      },
    });
  }

  const superAdmin = await assignPermissionToRole(
    prisma,
    TASKS_DELETE_SUPER_ADMIN_ROLE_KEY,
    def.key,
    dryRun,
  );

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
    clubAdminOutcomes.push(await assignPermissionToRole(prisma, role.key, def.key, dryRun));
  }

  const fcLegacyKey = await resolveFcAllschwilLegacyClubAdminRoleKey(prisma);
  const fcAllschwilLegacyClubAdmin = fcLegacyKey
    ? await assignPermissionToRole(prisma, fcLegacyKey, def.key, dryRun)
    : null;

  return {
    permission,
    superAdmin,
    tenantClubAdminRoles: clubAdminOutcomes,
    fcAllschwilLegacyClubAdmin,
  };
}

/**
 * Dry-run proposal for designated STAGE PO tenant only — never sweeps unrelated tenants.
 */
export async function reconcileTasksDeletePermissionForStagePoTenant(
  prisma: PrismaClient,
  options: {
    dryRun?: boolean;
    databaseFingerprint?: string | null;
    tenantKey?: string;
  } = {},
): Promise<TasksDeleteStageNarrowReconciliationResult> {
  const dryRun = options.dryRun ?? true;
  const intendedTenantKey = options.tenantKey ?? TASKS_DELETE_STAGE_PO_TENANT_KEY;
  const def = TASKS_DELETE_PERMISSION_DEF;

  const existing = await prisma.permission.findUnique({ where: { key: def.key } });
  const permission: TasksDeletePermissionSyncOutcome = existing
    ? { action: "already_exists", key: def.key }
    : { action: "created", key: def.key };

  if (!dryRun) {
    await prisma.permission.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        module: def.module,
        scope: def.scope,
        grantableByAdmin: def.grantableByAdmin,
      },
      create: {
        key: def.key,
        name: def.name,
        module: def.module,
        scope: def.scope,
        grantableByAdmin: def.grantableByAdmin,
      },
    });
  }

  const roleGrants: TasksDeleteRolePermissionSyncOutcome[] = [];

  roleGrants.push(
    await assignPermissionToRole(prisma, TASKS_DELETE_SUPER_ADMIN_ROLE_KEY, def.key, dryRun),
  );

  const canonicalClubAdminKey = `${TASKS_DELETE_CLUB_ADMIN_KEY_PREFIX}${intendedTenantKey}`;
  roleGrants.push(await assignPermissionToRole(prisma, canonicalClubAdminKey, def.key, dryRun));

  if (intendedTenantKey === FC_ALLSCHWIL_TENANT_KEY) {
    const legacyKey = await resolveFcAllschwilLegacyClubAdminRoleKey(prisma);
    if (legacyKey) {
      roleGrants.push(await assignPermissionToRole(prisma, legacyKey, def.key, dryRun));
    }
  }

  return {
    databaseFingerprint: options.databaseFingerprint ?? null,
    intendedTenantKey,
    permission,
    permissionRowPreview: def,
    roleGrants,
  };
}