import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** Matches Kommunikation hub + service auth: tenant club admins may open Mitteilungen/Kampagnen UI. */
export const CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_CLUB_VIEW,
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export const CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export function tenantPermissionsIncludeClubCommunicationView(
  tenantPermissions: readonly string[],
): boolean {
  return CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS.some((key) =>
    tenantPermissions.includes(key),
  );
}
