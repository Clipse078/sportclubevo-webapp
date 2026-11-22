/**
 * PR #1025 — narrow STAGE reconciliation: tenant_documentation.* → club_admin__fc-allschwil only.
 * Does not upsert permission catalog rows or reconcile other Club Admin roles.
 */

import type { PrismaClient } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FC_ALLSCHWIL_TENANT_KEY } from "@/lib/permissions/tasks-delete-permission-reconciliation";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";

export const TENANT_DOCUMENTATION_STAGE_PO_TENANT_KEY = FC_ALLSCHWIL_TENANT_KEY;

export const TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS = [
  PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
  PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
] as const;

export type TenantDocumentationRoleGrantOutcome =
  | { action: "assigned"; roleKey: string; permissionKey: string }
  | { action: "already_assigned"; roleKey: string; permissionKey: string }
  | { action: "role_not_found"; roleKey: string; permissionKey: string }
  | { action: "permission_not_in_db"; roleKey: string; permissionKey: string };

export type TenantDocumentationClubAdminStageReconciliationResult = {
  intendedTenantKey: string;
  roleKey: string;
  permissionKeys: readonly string[];
  grants: TenantDocumentationRoleGrantOutcome[];
};

async function assignPermissionToRole(
  prisma: PrismaClient,
  roleKey: string,
  permissionKey: string,
  dryRun: boolean,
): Promise<TenantDocumentationRoleGrantOutcome> {
  const role = await prisma.role.findUnique({ where: { key: roleKey }, select: { id: true } });
  if (!role) return { action: "role_not_found", roleKey, permissionKey };

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

  const outcome: TenantDocumentationRoleGrantOutcome = existing
    ? { action: "already_assigned", roleKey, permissionKey }
    : { action: "assigned", roleKey, permissionKey };

  if (!dryRun && !existing) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  return outcome;
}

export async function reconcileTenantDocumentationForFcaClubAdmin(
  prisma: PrismaClient,
  options: { dryRun?: boolean; tenantKey?: string } = {},
): Promise<TenantDocumentationClubAdminStageReconciliationResult> {
  const dryRun = options.dryRun ?? true;
  const intendedTenantKey = options.tenantKey ?? TENANT_DOCUMENTATION_STAGE_PO_TENANT_KEY;
  const roleKey = getTenantClubAdminRoleKey(intendedTenantKey);

  const grants: TenantDocumentationRoleGrantOutcome[] = [];
  for (const permissionKey of TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS) {
    grants.push(await assignPermissionToRole(prisma, roleKey, permissionKey, dryRun));
  }

  return {
    intendedTenantKey,
    roleKey,
    permissionKeys: TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS,
    grants,
  };
}

export function assertTenantDocumentationClubAdminScopeGate(
  grants: TenantDocumentationRoleGrantOutcome[],
  roleKey: string,
): { passed: boolean; wouldAssign: TenantDocumentationRoleGrantOutcome[]; blockers: string[] } {
  const permissionSet = new Set<string>(TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS);
  const blockers: string[] = [];
  const unexpected = grants.filter(
    (g) =>
      g.action === "permission_not_in_db" ||
      g.action === "role_not_found" ||
      g.roleKey !== roleKey ||
      !permissionSet.has(g.permissionKey),
  );
  if (unexpected.length > 0) {
    blockers.push(`unexpected grant outcomes: ${unexpected.length}`);
  }
  const wouldAssign = grants.filter((g) => g.action === "assigned");
  const notAssign = grants.filter(
    (g) => g.action !== "assigned" && g.action !== "already_assigned",
  );
  if (notAssign.length > 0) {
    blockers.push(...notAssign.map((g) => `${g.action}:${g.roleKey}:${g.permissionKey}`));
  }
  const passed =
    blockers.length === 0 &&
    wouldAssign.every((g) => g.roleKey === roleKey && permissionSet.has(g.permissionKey));
  return { passed, wouldAssign, blockers };
}