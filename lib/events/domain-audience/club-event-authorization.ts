/**
 * SCE-EVENTS-AUDIENCE-01 — Veranstaltungen-scoped gates (not team communication).
 */

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import { resolveTenantKey } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";

export function permissionKeysIncludeClubEventAudienceView(
  permissionKeys: ReadonlySet<string>,
): boolean {
  return (
    permissionKeys.has(PERMISSIONS.EVENTS_VIEW) || permissionKeys.has(PERMISSIONS.EVENTS_MANAGE)
  );
}

export function permissionKeysIncludeClubEventAudienceManage(
  permissionKeys: ReadonlySet<string>,
): boolean {
  return permissionKeys.has(PERMISSIONS.EVENTS_MANAGE);
}

export async function assertClubEventAudienceView(input: {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
}): Promise<void> {
  if (!permissionKeysIncludeClubEventAudienceView(input.permissionKeys)) {
    throw new TeamCommunicationForbiddenError("EVENTS_AUDIENCE_VIEW_DENIED");
  }
}

export async function assertClubEventAudienceManage(input: {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
}): Promise<void> {
  if (!permissionKeysIncludeClubEventAudienceManage(input.permissionKeys)) {
    throw new TeamCommunicationForbiddenError("EVENTS_AUDIENCE_MANAGE_DENIED");
  }
}

/** Manual Erinnerung uses club communication send (COMM-11), separate from EVENTS_MANAGE alone. */
export async function assertClubEventParticipationReminderSend(input: {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
}): Promise<void> {
  await assertClubEventAudienceManage(input);
  const tenantKey = await resolveTenantKey(input.tenantId);
  const clubAuth = await resolveClubCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey,
    userId: input.userId,
  });
  if (!clubAuth.canSend) {
    throw new TeamCommunicationForbiddenError("EVENTS_PARTICIPATION_REMINDER_SEND_DENIED");
  }
}
