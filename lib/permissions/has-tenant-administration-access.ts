import type { PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** True when the user holds canonical tenant Club Admin authority. */
export function hasTenantAdministrationAccess(permissionKeys: readonly PermissionKey[]): boolean {
  return TENANT_ADMINISTRATION_PERMISSIONS.some((key) => permissionKeys.includes(key));
}
