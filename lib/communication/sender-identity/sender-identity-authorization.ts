/**
 * SCE-COMM-EVO-08 — sender management vs sender use authorization.
 */

import { CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { tenantPermissionsIncludeAny } from "@/lib/communication/hub-access";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import {
  isSenderIdentityUsable,
  loadActiveSenderIdentityById,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import { EmailSenderResolutionError } from "@/lib/communication/sender-identity/sender-identity-resolution-service";

const SENDER_USE_PERMISSIONS = [
  ...CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS,
  ...DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS,
  ...INBOX_VIEW_PERMISSIONS,
];

export function userMayManageSenderIdentities(tenantPermissions: readonly string[]): boolean {
  return tenantPermissionsIncludeAny(tenantPermissions, TENANT_ADMINISTRATION_PERMISSIONS);
}

export function userMayUseSenderIdentities(tenantPermissions: readonly string[]): boolean {
  return tenantPermissionsIncludeAny(tenantPermissions, SENDER_USE_PERMISSIONS);
}

export async function assertUserMayUseSenderIdentity(input: {
  tenantId: string;
  senderIdentityId: string;
  tenantPermissions: readonly string[];
}): Promise<void> {
  if (!userMayUseSenderIdentities(input.tenantPermissions)) {
    throw new EmailSenderResolutionError(
      "SENDER_NOT_USABLE",
      "Keine Berechtigung für diesen Absender.",
    );
  }

  const row = await loadActiveSenderIdentityById({
    tenantId: input.tenantId,
    senderIdentityId: input.senderIdentityId,
  });
  if (!row) {
    throw new EmailSenderResolutionError("SENDER_NOT_FOUND", "Absender nicht gefunden.");
  }
  if (row.status !== "ACTIVE") {
    throw new EmailSenderResolutionError("SENDER_INACTIVE", "Absender ist deaktiviert.");
  }
  if (!isSenderIdentityUsable(row)) {
    throw new EmailSenderResolutionError(
      row.providerStatus === "UNKNOWN" ? "SENDER_UNKNOWN" : "SENDER_NOT_VERIFIED",
      "Absender ist nicht einsatzbereit.",
    );
  }

  // Structural scope (OrgUnit/Team/Role) deferred — TENANT_WIDE only for EVO-08.
}
