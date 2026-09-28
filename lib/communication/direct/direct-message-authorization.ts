import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";

export async function requireDirectMessageSend(input: {
  tenantId: string;
  userId: string;
}): Promise<void> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({
    userId: input.userId,
    tenantId: input.tenantId,
  });

  const allowed = DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS.some((key) => tenant.includes(key));
  if (!allowed) {
    throw new TeamCommunicationForbiddenError("direct message send denied");
  }
}

export async function resolveDirectMessageSendAuthorized(input: {
  tenantId: string;
  userId: string;
}): Promise<boolean> {
  try {
    await requireDirectMessageSend(input);
    return true;
  } catch {
    return false;
  }
}

export function tenantPermissionsIncludeDirectSend(tenantPermissions: readonly string[]): boolean {
  return DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS.some((key) => tenantPermissions.includes(key));
}

/** Inbox managers may view SCE threads they participate in; admins inherit manage. */
export function canUserAccessSceConversation(input: {
  tenantPermissions: readonly string[];
  participantUserIds: readonly string[];
  userId: string;
}): boolean {
  if (input.participantUserIds.includes(input.userId)) return true;
  return TENANT_ADMINISTRATION_PERMISSIONS.some((key) =>
    input.tenantPermissions.includes(key),
  );
}

export async function assertRecipientPersonIdsInSenderScope(input: {
  tenantId: string;
  senderUserId: string;
  recipientPersonIds: readonly string[];
}): Promise<void> {
  const { resolveSenderCommunicationScope } = await import(
    "@/lib/communication/platform/recipient-resolution/sender-communication-scope"
  );
  const { scope } = await resolveSenderCommunicationScope({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    context: { kind: "DIRECT", tenantId: input.tenantId },
  });
  for (const personId of input.recipientPersonIds) {
    if (!scope.allowedSubjectPersonIds.has(personId)) {
      throw new TeamCommunicationForbiddenError("recipient outside sender scope");
    }
  }
}
