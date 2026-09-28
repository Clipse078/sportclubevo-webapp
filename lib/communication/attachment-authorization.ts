import {
  CommunicationCenterChannel,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
} from "@/lib/teams/team-document-auth";
import {
  CommunicationAttachmentServiceError,
} from "@/lib/communication/attachment-service";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export type AuthorizedCommunicationAttachment = {
  id: string;
  tenantId: string;
  storageKey: string;
  sanitizedFilename: string;
  contentType: string;
  sizeBytes: number;
  lifecycleStatus: string;
  scanStatus: string;
  checksumSha256: string;
};

async function requireActiveTenantMembership(tenantId: string, actorUserId: string) {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId: actorUserId,
      isActive: true,
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { id: true },
  });
  if (!membership) {
    throw new CommunicationAttachmentServiceError(
      "FORBIDDEN",
      "Der Benutzer gehört nicht zum aktiven Mandanten.",
    );
  }
}

async function tenantHasAnyPermission(
  tenantId: string,
  userId: string,
  keys: readonly string[],
): Promise<boolean> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({ userId, tenantId });
  return keys.some((key) => tenant.includes(key));
}

async function canAccessRegistrationThreadMessage(input: {
  tenantId: string;
  actorUserId: string;
  messageId: string;
}): Promise<boolean> {
  const registrationKeys = [
    PERMISSIONS.REGISTRATIONS_VIEW,
    PERMISSIONS.REGISTRATIONS_EDIT,
    ...TENANT_ADMINISTRATION_PERMISSIONS,
  ];
  if (!(await tenantHasAnyPermission(input.tenantId, input.actorUserId, registrationKeys))) {
    return false;
  }
  const message = await prisma.communicationMessage.findFirst({
    where: {
      id: input.messageId,
      tenantId: input.tenantId,
      thread: { tenantId: input.tenantId },
    },
    select: { id: true },
  });
  return Boolean(message);
}

async function canAccessCommunicationCenterMessage(input: {
  tenantId: string;
  actorUserId: string;
  messageId: string;
}): Promise<boolean> {
  const inboxKeys = [
    PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    PERMISSIONS.COMMUNICATION_INBOX_MANAGE,
    PERMISSIONS.COMMUNICATION_INBOX_REPLY,
    PERMISSIONS.COMMUNICATION_INBOX_SETTINGS,
    ...TENANT_ADMINISTRATION_PERMISSIONS,
  ];
  if (!(await tenantHasAnyPermission(input.tenantId, input.actorUserId, inboxKeys))) {
    return false;
  }

  const message = await prisma.communicationCenterMessage.findFirst({
    where: { id: input.messageId, tenantId: input.tenantId },
    select: {
      conversation: {
        select: {
          channel: true,
          participants: { where: { userId: input.actorUserId }, select: { id: true } },
        },
      },
    },
  });
  if (!message?.conversation) return false;
  if (message.conversation.channel === CommunicationCenterChannel.EMAIL) {
    return true;
  }
  return message.conversation.participants.length > 0;
}

async function canAccessPlatformCommunication(input: {
  tenantId: string;
  tenantKey: string;
  actorUserId: string;
  communicationId: string;
}): Promise<boolean> {
  const communication = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    select: {
      status: true,
      createdByUserId: true,
      conversation: { select: { contextKind: true, teamId: true } },
    },
  });
  if (!communication) return false;

  const [isSuperAdmin, isClubAdmin] = await Promise.all([
    isPlatformSuperAdmin(input.actorUserId),
    isTenantClubAdmin(input.actorUserId, input.tenantId, input.tenantKey),
  ]);

  if (communication.conversation.contextKind === "ORGANISATION") {
    const clubKeys = [
      PERMISSIONS.COMMUNICATION_CLUB_VIEW,
      PERMISSIONS.COMMUNICATION_CLUB_SEND,
      ...TENANT_ADMINISTRATION_PERMISSIONS,
    ];
    if (
      isSuperAdmin ||
      isClubAdmin ||
      (await tenantHasAnyPermission(input.tenantId, input.actorUserId, clubKeys))
    ) {
      if (communication.status === "PUBLISHED" || communication.createdByUserId === input.actorUserId) {
        return true;
      }
    }
  }

  if (communication.conversation.contextKind === "TEAM" && communication.conversation.teamId) {
    const teamKeys = [
      PERMISSIONS.COMMUNICATION_TEAM_VIEW,
      PERMISSIONS.COMMUNICATION_TEAM_SEND,
      ...TENANT_ADMINISTRATION_PERMISSIONS,
    ];
    if (await tenantHasAnyPermission(input.tenantId, input.actorUserId, teamKeys)) {
      return true;
    }
  }

  if (communication.status !== "PUBLISHED") {
    return communication.createdByUserId === input.actorUserId;
  }

  const snapshot = await prisma.platformCommunicationRecipientSnapshot.findFirst({
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      deliveryUserId: input.actorUserId,
    },
    select: { id: true },
  });
  return Boolean(snapshot);
}

export async function authorizeCommunicationAttachmentAccess(input: {
  tenantId: string;
  tenantKey?: string;
  actorUserId: string;
  attachmentId: string;
}): Promise<AuthorizedCommunicationAttachment> {
  const tenantId = input.tenantId.trim();
  const actorUserId = input.actorUserId.trim();
  const attachmentId = input.attachmentId.trim();
  if (!tenantId || !actorUserId || !attachmentId) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "tenantId, actorUserId and attachmentId are required.",
    );
  }

  await requireActiveTenantMembership(tenantId, actorUserId);

  const attachment = await prisma.communicationAttachment.findFirst({
    where: { id: attachmentId, tenantId },
    select: {
      id: true,
      tenantId: true,
      storageKey: true,
      sanitizedFilename: true,
      contentType: true,
      sizeBytes: true,
      lifecycleStatus: true,
      scanStatus: true,
      checksumSha256: true,
      messageLinks: { select: { messageId: true } },
      communicationCenterMessageLinks: { select: { messageId: true } },
      platformCommunicationLinks: { select: { communicationId: true } },
    },
  });

  if (!attachment) {
    throw new CommunicationAttachmentServiceError(
      "ATTACHMENT_NOT_FOUND",
      "Anhang nicht gefunden.",
    );
  }

  let authorized = false;

  for (const link of attachment.messageLinks) {
    if (
      await canAccessRegistrationThreadMessage({
        tenantId,
        actorUserId,
        messageId: link.messageId,
      })
    ) {
      authorized = true;
      break;
    }
  }

  if (!authorized) {
    for (const link of attachment.communicationCenterMessageLinks) {
      if (
        await canAccessCommunicationCenterMessage({
          tenantId,
          actorUserId,
          messageId: link.messageId,
        })
      ) {
        authorized = true;
        break;
      }
    }
  }

  if (!authorized && attachment.platformCommunicationLinks.length > 0) {
    const tenantKey =
      input.tenantKey ??
      (
        await prisma.tenant.findFirst({
          where: { id: tenantId },
          select: { key: true },
        })
      )?.key ??
      "";
    for (const link of attachment.platformCommunicationLinks) {
      if (
        await canAccessPlatformCommunication({
          tenantId,
          tenantKey,
          actorUserId,
          communicationId: link.communicationId,
        })
      ) {
        authorized = true;
        break;
      }
    }
  }

  if (!authorized) {
    throw new CommunicationAttachmentServiceError(
      "FORBIDDEN",
      "Kein Zugriff auf diesen Anhang.",
    );
  }

  return attachment;
}

export function attachmentLinkCounts(attachment: {
  messageLinks?: ReadonlyArray<unknown>;
  communicationCenterMessageLinks?: ReadonlyArray<unknown>;
  platformCommunicationLinks?: ReadonlyArray<unknown>;
}): number {
  return (
    (attachment.messageLinks?.length ?? 0) +
    (attachment.communicationCenterMessageLinks?.length ?? 0) +
    (attachment.platformCommunicationLinks?.length ?? 0)
  );
}

export type OutboundAttachmentOwnershipScope = {
  platformCommunicationId?: string;
  messageId?: string;
  centerMessageId?: string;
};

export async function assertOutboundAttachmentOwnership(input: {
  tenantId: string;
  actorUserId: string;
  attachmentIds: string[];
  scope?: OutboundAttachmentOwnershipScope;
}): Promise<void> {
  if (input.attachmentIds.length === 0) return;

  const rows = await prisma.communicationAttachment.findMany({
    where: { tenantId: input.tenantId, id: { in: input.attachmentIds } },
    select: {
      id: true,
      createdByUserId: true,
      messageLinks: { select: { messageId: true } },
      communicationCenterMessageLinks: { select: { messageId: true } },
      platformCommunicationLinks: { select: { communicationId: true } },
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of input.attachmentIds) {
    const row = byId.get(id);
    if (!row) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_NOT_FOUND",
        "Ein ausgewählter Anhang ist nicht mehr verfügbar.",
      );
    }
    if (row.createdByUserId && row.createdByUserId !== input.actorUserId) {
      throw new CommunicationAttachmentServiceError(
        "FORBIDDEN",
        "Dieser Anhang gehört einem anderen Benutzer.",
      );
    }

    const totalLinks = attachmentLinkCounts(row);
    if (totalLinks === 0) continue;

    const scope = input.scope;
    const messageLinks = row.messageLinks ?? [];
    const centerLinks = row.communicationCenterMessageLinks ?? [];
    const platformLinks = row.platformCommunicationLinks ?? [];
    const allLinksAllowed =
      scope &&
      messageLinks.every((link) => scope.messageId === link.messageId) &&
      centerLinks.every((link) => scope.centerMessageId === link.messageId) &&
      platformLinks.every((link) => scope.platformCommunicationId === link.communicationId);

    if (!allLinksAllowed) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Ein Anhang ist bereits mit einer anderen Nachricht verknüpft.",
      );
    }
  }
}
