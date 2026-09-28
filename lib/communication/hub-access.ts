import type { PermissionKey } from "@/lib/permissions/permissions";
import {
  CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS,
  CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/club/route-access";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/templates/route-access";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import { ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/zielgruppen/route-access";

/** Users who may open the Kommunikation module landing page. */
export const COMMUNICATION_HUB_ROUTE_PERMISSIONS: PermissionKey[] = [
  ...TENANT_ADMINISTRATION_PERMISSIONS,
  ...INBOX_VIEW_PERMISSIONS,
];

export function tenantPermissionsIncludeAny(
  tenantPermissions: readonly string[],
  keys: readonly PermissionKey[],
): boolean {
  return keys.some((key) => tenantPermissions.includes(key));
}

export type CommunicationHubCapabilityAccess = {
  inbox: boolean;
  mitteilungen: boolean;
  mitteilungenSend: boolean;
  kampagnen: boolean;
  kampagnenSend: boolean;
  zielgruppen: boolean;
  vorlagen: boolean;
  emailSender: boolean;
};

export function resolveCommunicationHubCapabilityAccess(
  tenantPermissions: readonly string[],
): CommunicationHubCapabilityAccess {
  const clubView = tenantPermissionsIncludeAny(
    tenantPermissions,
    CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS,
  );
  const clubSend = tenantPermissionsIncludeAny(
    tenantPermissions,
    CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS,
  );

  return {
    inbox: tenantPermissionsIncludeAny(tenantPermissions, INBOX_VIEW_PERMISSIONS),
    mitteilungen: clubView,
    mitteilungenSend: clubSend,
    kampagnen: clubView,
    kampagnenSend: clubSend,
    zielgruppen: tenantPermissionsIncludeAny(
      tenantPermissions,
      ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS,
    ),
    vorlagen: tenantPermissionsIncludeAny(
      tenantPermissions,
      PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS,
    ),
    emailSender: tenantPermissionsIncludeAny(
      tenantPermissions,
      TENANT_ADMINISTRATION_PERMISSIONS,
    ),
  };
}
