import {
  CommunicationCenterMailboxOrganization,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { recordCommunicationCenterAudit } from "@/lib/communication/inbox/inbox-audit";
import { COMMUNICATION_INBOX_BULK_MAX_IDS } from "@/lib/communication/inbox/inbox-mailbox-constants";

export function dedupeBoundedConversationIds(conversationIds: string[]): string[] {
  const unique = [...new Set(conversationIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new CommunicationCenterError("INVALID_INPUT", "Mindestens eine Konversation ist erforderlich.");
  }
  if (unique.length > COMMUNICATION_INBOX_BULK_MAX_IDS) {
    throw new CommunicationCenterError(
      "BULK_LIMIT",
      `Maximal ${COMMUNICATION_INBOX_BULK_MAX_IDS} Konversationen pro Vorgang.`,
    );
  }
  return unique;
}

export function buildInboundMailboxReactivationUpdate(
  current: CommunicationCenterMailboxOrganization,
): Prisma.CommunicationCenterConversationUpdateInput | null {
  if (
    current === CommunicationCenterMailboxOrganization.ARCHIVED ||
    current === CommunicationCenterMailboxOrganization.TRASHED
  ) {
    return {
      mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
      mailboxOrganizationBeforeTrash: null,
    };
  }
  return null;
}

export async function archiveCommunicationCenterConversation(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true, mailboxOrganization: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) {
    throw new CommunicationCenterError(
      "INVALID_STATE",
      "Archivieren ist im Papierkorb nicht möglich. Bitte zuerst wiederherstellen.",
    );
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.ARCHIVED) {
    return;
  }

  await prisma.communicationCenterConversation.update({
    where: { id: conversation.id },
    data: {
      mailboxOrganization: CommunicationCenterMailboxOrganization.ARCHIVED,
      mailboxOrganizationBeforeTrash: null,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.conversation.archived",
    targetType: "CommunicationCenterConversation",
    targetId: conversation.id,
  });
}

export async function restoreCommunicationCenterConversationToInbox(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true, mailboxOrganization: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.INBOX) {
    return;
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) {
    throw new CommunicationCenterError(
      "INVALID_STATE",
      "Zurück in den Posteingang ist im Papierkorb nicht möglich. Bitte zuerst wiederherstellen.",
    );
  }

  await prisma.communicationCenterConversation.update({
    where: { id: conversation.id },
    data: { mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.conversation.restored",
    targetType: "CommunicationCenterConversation",
    targetId: conversation.id,
    metadata: { mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX },
  });
}

export async function trashCommunicationCenterConversation(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true, mailboxOrganization: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) {
    return;
  }

  await prisma.communicationCenterConversation.update({
    where: { id: conversation.id },
    data: {
      mailboxOrganizationBeforeTrash: conversation.mailboxOrganization,
      mailboxOrganization: CommunicationCenterMailboxOrganization.TRASHED,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.conversation.trashed",
    targetType: "CommunicationCenterConversation",
    targetId: conversation.id,
  });
}

export async function restoreCommunicationCenterConversationFromTrash(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: {
      id: true,
      mailboxOrganization: true,
      mailboxOrganizationBeforeTrash: true,
    },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  if (conversation.mailboxOrganization !== CommunicationCenterMailboxOrganization.TRASHED) {
    return;
  }

  const restoreOrganization =
    conversation.mailboxOrganizationBeforeTrash ??
    CommunicationCenterMailboxOrganization.INBOX;

  await prisma.communicationCenterConversation.update({
    where: { id: conversation.id },
    data: {
      mailboxOrganization: restoreOrganization,
      mailboxOrganizationBeforeTrash: null,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.conversation.restored_from_trash",
    targetType: "CommunicationCenterConversation",
    targetId: conversation.id,
    metadata: { mailboxOrganization: restoreOrganization },
  });
}

export async function reactivateCommunicationCenterConversationToInboxOnReply(input: {
  tenantId: string;
  conversationId: string;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true, mailboxOrganization: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) {
    throw new CommunicationCenterError(
      "INVALID_STATE",
      "Antworten ist im Papierkorb nicht möglich. Bitte zuerst wiederherstellen.",
    );
  }
  if (conversation.mailboxOrganization === CommunicationCenterMailboxOrganization.ARCHIVED) {
    await prisma.communicationCenterConversation.update({
      where: { id: conversation.id },
      data: { mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX },
    });
  }
}

export function assertNotTrashedForSharedOperationalMutation(
  mailboxOrganization: CommunicationCenterMailboxOrganization,
): void {
  if (mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) {
    throw new CommunicationCenterError(
      "INVALID_STATE",
      "Diese Aktion ist im Papierkorb nicht verfügbar. Bitte zuerst wiederherstellen.",
    );
  }
}

export type InboxBulkOrganizationAction =
  | "ARCHIVE"
  | "RESTORE_TO_INBOX"
  | "TRASH"
  | "RESTORE_FROM_TRASH";

export async function bulkApplyCommunicationCenterOrganizationAction(input: {
  tenantId: string;
  actorUserId: string;
  conversationIds: string[];
  action: InboxBulkOrganizationAction;
}): Promise<{ updatedCount: number; requestedCount: number }> {
  const ids = dedupeBoundedConversationIds(input.conversationIds);

  const rows = await prisma.communicationCenterConversation.findMany({
    where: { tenantId: input.tenantId, id: { in: ids } },
    select: {
      id: true,
      mailboxOrganization: true,
      mailboxOrganizationBeforeTrash: true,
    },
  });

  if (rows.length === 0) {
    return { updatedCount: 0, requestedCount: ids.length };
  }

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (input.action === "ARCHIVE") {
        if (row.mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) continue;
        if (row.mailboxOrganization === CommunicationCenterMailboxOrganization.ARCHIVED) continue;
        await tx.communicationCenterConversation.update({
          where: { id: row.id },
          data: {
            mailboxOrganization: CommunicationCenterMailboxOrganization.ARCHIVED,
            mailboxOrganizationBeforeTrash: null,
          },
        });
        continue;
      }
      if (input.action === "RESTORE_TO_INBOX") {
        if (row.mailboxOrganization !== CommunicationCenterMailboxOrganization.ARCHIVED) continue;
        await tx.communicationCenterConversation.update({
          where: { id: row.id },
          data: { mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX },
        });
        continue;
      }
      if (input.action === "TRASH") {
        if (row.mailboxOrganization === CommunicationCenterMailboxOrganization.TRASHED) continue;
        await tx.communicationCenterConversation.update({
          where: { id: row.id },
          data: {
            mailboxOrganizationBeforeTrash: row.mailboxOrganization,
            mailboxOrganization: CommunicationCenterMailboxOrganization.TRASHED,
          },
        });
        continue;
      }
      if (input.action === "RESTORE_FROM_TRASH") {
        if (row.mailboxOrganization !== CommunicationCenterMailboxOrganization.TRASHED) continue;
        const restoreOrganization =
          row.mailboxOrganizationBeforeTrash ??
          CommunicationCenterMailboxOrganization.INBOX;
        await tx.communicationCenterConversation.update({
          where: { id: row.id },
          data: {
            mailboxOrganization: restoreOrganization,
            mailboxOrganizationBeforeTrash: null,
          },
        });
      }
    }
  });

  for (const row of rows) {
    const auditAction =
      input.action === "ARCHIVE"
        ? "communication.inbox.conversation.archived"
        : input.action === "RESTORE_TO_INBOX"
          ? "communication.inbox.conversation.restored"
          : input.action === "TRASH"
            ? "communication.inbox.conversation.trashed"
            : "communication.inbox.conversation.restored_from_trash";
    await recordCommunicationCenterAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: auditAction,
      targetType: "CommunicationCenterConversation",
      targetId: row.id,
    });
  }

  return { updatedCount: rows.length, requestedCount: ids.length };
}
