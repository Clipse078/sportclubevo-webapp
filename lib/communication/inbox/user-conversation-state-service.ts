import { prisma } from "@/lib/db/prisma";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { dedupeBoundedConversationIds } from "@/lib/communication/inbox/mailbox-organization-service";

export async function setCommunicationCenterConversationStarred(input: {
  tenantId: string;
  conversationId: string;
  userId: string;
  starred: boolean;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }

  await prisma.communicationCenterConversationReadState.upsert({
    where: {
      conversationId_userId: {
        conversationId: input.conversationId,
        userId: input.userId,
      },
    },
    create: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      userId: input.userId,
      starredAt: input.starred ? new Date() : null,
    },
    update: { starredAt: input.starred ? new Date() : null },
  });
}

export async function markCommunicationCenterConversationUnread(input: {
  tenantId: string;
  conversationId: string;
  userId: string;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }

  await prisma.communicationCenterConversationReadState.upsert({
    where: {
      conversationId_userId: {
        conversationId: input.conversationId,
        userId: input.userId,
      },
    },
    create: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      userId: input.userId,
      readAt: null,
    },
    update: { readAt: null },
  });
}

export type InboxBulkUserStateAction = "MARK_READ" | "MARK_UNREAD" | "STAR" | "UNSTAR";

export async function bulkApplyCommunicationCenterUserStateAction(input: {
  tenantId: string;
  userId: string;
  conversationIds: string[];
  action: InboxBulkUserStateAction;
}): Promise<{ updatedCount: number; requestedCount: number }> {
  const ids = dedupeBoundedConversationIds(input.conversationIds);

  const rows = await prisma.communicationCenterConversation.findMany({
    where: { tenantId: input.tenantId, id: { in: ids } },
    select: { id: true },
  });

  if (rows.length === 0) {
    return { updatedCount: 0, requestedCount: ids.length };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (input.action === "MARK_READ") {
        await tx.communicationCenterConversationReadState.upsert({
          where: {
            conversationId_userId: { conversationId: row.id, userId: input.userId },
          },
          create: {
            tenantId: input.tenantId,
            conversationId: row.id,
            userId: input.userId,
            readAt: now,
          },
          update: { readAt: now },
        });
      } else if (input.action === "MARK_UNREAD") {
        await tx.communicationCenterConversationReadState.upsert({
          where: {
            conversationId_userId: { conversationId: row.id, userId: input.userId },
          },
          create: {
            tenantId: input.tenantId,
            conversationId: row.id,
            userId: input.userId,
            readAt: null,
          },
          update: { readAt: null },
        });
      } else if (input.action === "STAR") {
        await tx.communicationCenterConversationReadState.upsert({
          where: {
            conversationId_userId: { conversationId: row.id, userId: input.userId },
          },
          create: {
            tenantId: input.tenantId,
            conversationId: row.id,
            userId: input.userId,
            starredAt: now,
          },
          update: { starredAt: now },
        });
      } else {
        await tx.communicationCenterConversationReadState.upsert({
          where: {
            conversationId_userId: { conversationId: row.id, userId: input.userId },
          },
          create: {
            tenantId: input.tenantId,
            conversationId: row.id,
            userId: input.userId,
            starredAt: null,
          },
          update: { starredAt: null },
        });
      }
    }
  });

  return { updatedCount: rows.length, requestedCount: ids.length };
}
