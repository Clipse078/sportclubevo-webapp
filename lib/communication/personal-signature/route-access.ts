import type { PermissionKey } from "@/lib/permissions/permissions";
import { COMMUNICATION_HUB_ROUTE_PERMISSIONS } from "@/lib/communication/hub-access";

/** Self-service signature settings for users with Kommunikation module access. */
export const PERSONAL_SIGNATURE_ROUTE_PERMISSIONS: PermissionKey[] = [
  ...COMMUNICATION_HUB_ROUTE_PERMISSIONS,
];
