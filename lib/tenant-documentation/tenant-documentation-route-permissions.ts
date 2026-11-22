/**
 * Client-safe Dokumentation hub + nav permission contract (no server/session imports).
 */

import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/** Users who may open the Dokumentation hub or any documentation page route. */
export const TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS = [
  PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
  PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
] as const satisfies readonly PermissionKey[];

/** Whether nav + hub routes may expose Dokumentation (any documentation module permission). */
export function hasTenantDocumentationModuleView(
  permissionKeys: readonly string[],
): boolean {
  return (
    permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_VIEW) ||
    permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_EDIT) ||
    permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH) ||
    permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_MANAGE)
  );
}

export function tenantDocumentationNavVisible(permissionKeys: readonly PermissionKey[]): boolean {
  return hasTenantDocumentationModuleView(permissionKeys);
}