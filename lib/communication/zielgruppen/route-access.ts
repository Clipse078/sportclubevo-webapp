import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** Matches Kommunikation hub + E-Mail-Absender: tenant club admins may enter Zielgruppen UI. */
export const ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
  PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export const ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export function tenantPermissionsIncludeZielgruppenManage(tenantPermissions: readonly string[]): boolean {
  return ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS.some((key) => tenantPermissions.includes(key));
}
