/**
 * Canonical tenant Club Admin delegatable permission contract.
 *
 * A materialized per-tenant Club Admin role (`club_admin__<tenantKey>`) must
 * hold every active catalog permission that Club Admins may delegate, so the
 * delegation resolver can enforce "cannot delegate rights you do not possess"
 * without per-permission backfill migrations.
 */

import type { PermissionScope } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS } from "@/lib/permissions/workspace-governance-permission-reconciliation";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

export { TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS };

export type PermissionCatalogRow = {
  key: string;
  scope: PermissionScope | string;
  grantableByAdmin: boolean;
};

/** Prefix for materialized tenant-scoped Club Admin roles (RPERM-04). */
export const TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX = `${CLUB_ADMIN_TEMPLATE_KEY}__`;

/**
 * Permissions intentionally withheld from automatic Club Admin bundles even
 * though they are TENANT-scoped and grantableByAdmin=true in the catalog.
 */
export function isExplicitlyExcludedFromTenantClubAdmin(key: string): boolean {
  return TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS.has(key);
}

/**
 * Whether a catalog permission belongs on the canonical tenant Club Admin role.
 */
export function isTenantClubAdminDelegatablePermission(
  permission: PermissionCatalogRow,
): boolean {
  return (
    permission.scope === "TENANT" &&
    permission.grantableByAdmin === true &&
    !isExplicitlyExcludedFromTenantClubAdmin(permission.key)
  );
}

export function filterTenantClubAdminDelegatablePermissionKeys<
  T extends PermissionCatalogRow,
>(permissions: readonly T[]): string[] {
  return permissions
    .filter(isTenantClubAdminDelegatablePermission)
    .map((permission) => permission.key)
    .sort((a, b) => a.localeCompare(b));
}

export type TenantClubAdminPermissionDrift = {
  missingFromClubAdmin: string[];
  unexpectedOnClubAdmin: string[];
};

export function computeTenantClubAdminPermissionDrift(
  expectedDelegatableKeys: readonly string[],
  assignedKeys: readonly string[],
): TenantClubAdminPermissionDrift {
  const expected = new Set(expectedDelegatableKeys);
  const assigned = new Set(assignedKeys);

  const missingFromClubAdmin = [...expected]
    .filter((key) => !assigned.has(key))
    .sort((a, b) => a.localeCompare(b));

  const unexpectedOnClubAdmin = [...assigned]
    .filter((key) => !expected.has(key))
    .sort((a, b) => a.localeCompare(b));

  return { missingFromClubAdmin, unexpectedOnClubAdmin };
}

/** Prisma `where` clause for canonical materialized tenant Club Admin roles. */
export const CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE = {
  scope: "TENANT" as const,
  isSystem: true,
  isArchived: false,
  key: { startsWith: TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX },
};

/** Known regression keys from SCE delegation incidents (Club Admin backfill). */
export const TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS = [
  "planning.allocations.view",
  "planning.allocations.manage",
  "communication.club.view",
  "communication.zielgruppen.view",
  "infoboard.view",
  "news.view",
] as const;

/**
 * TENANT permissions materialized Club Admin roles must hold but that must
 * never be assignable to custom tenant roles via the delegation catalog
 * (grantableByAdmin=false in DB).
 */
export const TENANT_CLUB_ADMIN_PRIVILEGED_POSSESSION_KEYS = [
  PERMISSIONS.USERS_IMPERSONATE_TENANT,
] as const;

export function isTenantClubAdminPrivilegedPossessionKey(key: string): boolean {
  return (TENANT_CLUB_ADMIN_PRIVILEGED_POSSESSION_KEYS as readonly string[]).includes(
    key,
  );
}

/** Full permission set expected on canonical materialized Club Admin roles. */
export function mergeTenantClubAdminAssignedPermissionKeys(
  delegatableKeys: readonly string[],
): string[] {
  return Array.from(
    new Set([...delegatableKeys, ...TENANT_CLUB_ADMIN_PRIVILEGED_POSSESSION_KEYS]),
  ).sort((a, b) => a.localeCompare(b));
}
