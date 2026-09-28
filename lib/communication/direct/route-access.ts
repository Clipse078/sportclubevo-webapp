import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** Send direct messages within sender communication scope (club or team send rights). */
export const DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNICATION_CLUB_SEND,
  PERMISSIONS.COMMUNICATION_TEAM_SEND,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];

export function tenantPermissionsIncludeDirectMessageSend(
  tenantPermissions: readonly string[],
): boolean {
  return DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS.some((key) => tenantPermissions.includes(key));
}
