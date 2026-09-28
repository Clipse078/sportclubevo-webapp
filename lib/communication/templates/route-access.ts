import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** Matches Kommunikation hub: tenant club admins may open Vorlagen UI (see platform-template-authorization). */
export const PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW,
  PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export const PLATFORM_TEMPLATE_MANAGE_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export function tenantPermissionsIncludePlatformTemplateView(
  tenantPermissions: readonly string[],
): boolean {
  return PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS.some((key) =>
    tenantPermissions.includes(key),
  );
}
