import {
  CommunicationCenterChannel,
  CommunicationCenterConversationStatus,
  CommunicationCenterMailboxOrganization,
  CommunicationCenterMessageDirection,
  type Prisma,
} from "@prisma/client";
import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";
import { assertNotTrashedForSharedOperationalMutation } from "@/lib/communication/inbox/mailbox-organization-service";
import { prisma } from "@/lib/db/prisma";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { recordCommunicationCenterAudit } from "@/lib/communication/inbox/inbox-audit";
import {
  formatUserDisplayName,
  resolveInboxParticipantEmail,
  resolveInboxParticipantLabel,
} from "@/lib/communication/inbox/inbox-display";

export type InboxConversationFilter =
  | "ALL"
  | "UNREAD"
  | "ASSIGNED_TO_ME"
  | "UNASSIGNED"
  | "EMAIL";

function applyMailboxViewFilter(
  where: Prisma.CommunicationCenterConversationWhereInput,
  mailbox: InboxMailboxView,
): void {
  if (mailbox === "INBOX") {
    where.mailboxOrganization = CommunicationCenterMailboxOrganization.INBOX;
  } else if (mailbox === "ARCHIVE") {
    where.mailboxOrganization = CommunicationCenterMailboxOrganization.ARCHIVED;
  } else if (mailbox === "TRASH") {
    where.mailboxOrganization = CommunicationCenterMailboxOrganization.TRASHED;
  } else if (mailbox === "STARRED") {
    where.mailboxOrganization = {
      not: CommunicationCenterMailboxOrganization.TRASHED,
    };
  }
}

export async function listCommunicationCenterMailboxCounts(input: {
  tenantId: string;
  userId: string;
}): Promise<Record<InboxMailboxView, number>> {
  const [inbox, archive, trash, starred] = await Promise.all([
    prisma.communicationCenterConversation.count({
      where: {
        tenantId: input.tenantId,
        mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
      },
    }),
    prisma.communicationCenterConversation.count({
      where: {
        tenantId: input.tenantId,
        mailboxOrganization: CommunicationCenterMailboxOrganization.ARCHIVED,
      },
    }),
    prisma.communicationCenterConversation.count({
      where: {
        tenantId: input.tenantId,
        mailboxOrganization: CommunicationCenterMailboxOrganization.TRASHED,
      },
    }),
    prisma.communicationCenterConversation.count({
      where: {
        tenantId: input.tenantId,
        mailboxOrganization: { not: CommunicationCenterMailboxOrganization.TRASHED },
        readStates: { some: { userId: input.userId, starredAt: { not: null } } },
      },
    }),
  ]);
  return { INBOX: inbox, STARRED: starred, ARCHIVE: archive, TRASH: trash };
}

export async function listCommunicationCenterConversations(input: {
  tenantId: string;
  userId: string;
  mailbox?: InboxMailboxView;
  filter: InboxConversationFilter;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const mailbox = input.mailbox ?? "INBOX";
  const where: Prisma.CommunicationCenterConversationWhereInput = {
    tenantId: input.tenantId,
    OR: [
      { channel: CommunicationCenterChannel.EMAIL },
      {
        channel: CommunicationCenterChannel.SCE,
        participants: { some: { userId: input.userId } },
      },
    ],
  };

  applyMailboxViewFilter(where, mailbox);

  const readStateAnd: Prisma.CommunicationCenterConversationWhereInput[] = [];
  if (mailbox === "STARRED") {
    readStateAnd.push({
      readStates: { some: { userId: input.userId, starredAt: { not: null } } },
    });
  }
  if (input.filter === "UNREAD") {
    readStateAnd.push({
      readStates: { none: { userId: input.userId, readAt: { not: null } } },
    });
  }
  if (readStateAnd.length === 1) {
    Object.assign(where, readStateAnd[0]);
  } else if (readStateAnd.length > 1) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...readStateAnd];
  }
  if (input.filter === "ASSIGNED_TO_ME") {
    where.assignedToUserId = input.userId;
  }
  if (input.filter === "UNASSIGNED") {
    where.assignedToUserId = null;
  }
  if (input.filter === "EMAIL") {
    where.mailboxId = { not: null };
  }
  if (input.search?.trim()) {
    where.searchText = { contains: input.search.trim(), mode: "insensitive" };
  }
  if (input.cursor) {
    where.id = { lt: input.cursor };
  }

  const rows = await prisma.communicationCenterConversation.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      readStates: { where: { userId: input.userId }, take: 1 },
      matchedPerson: {
        select: { id: true, firstName: true, lastName: true, displayName: true },
      },
      matchedSponsorContact: {
        select: { id: true, firstName: true, lastName: true },
      },
      assignedToUser: {
        select: { id: true, firstName: true, lastName: true },
      },
      messages: {
        where: { direction: CommunicationCenterMessageDirection.INBOUND },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fromDisplayName: true, fromAddress: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return {
    items: items.map((row) => {
      const latestInbound = row.messages[0] ?? null;
      return {
        id: row.id,
        subject: row.subject,
        previewText: row.previewText,
        status: row.status,
        lastMessageAt: row.lastMessageAt,
        assignedToUserId: row.assignedToUserId,
        assignedToDisplayName: row.assignedToUser
          ? formatUserDisplayName(row.assignedToUser)
          : null,
        contactMatchStatus: row.contactMatchStatus,
        matchedPersonId: row.matchedPersonId,
        matchedSponsorContactId: row.matchedSponsorContactId,
        participantLabel: resolveInboxParticipantLabel({
          matchedPerson: row.matchedPerson,
          matchedSponsorContact: row.matchedSponsorContact,
          latestInbound,
        }),
        participantEmail: resolveInboxParticipantEmail({ latestInbound }),
        unread: !row.readStates[0]?.readAt,
        starred: Boolean(row.readStates[0]?.starredAt),
        mailboxOrganization: row.mailboxOrganization,
      };
    }),
    nextCursor,
  };
}

export async function getCommunicationCenterConversationDetail(input: {
  tenantId: string;
  conversationId: string;
  userId: string;
}) {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: {
      id: input.conversationId,
      tenantId: input.tenantId,
      OR: [
        { channel: CommunicationCenterChannel.EMAIL },
        {
          channel: CommunicationCenterChannel.SCE,
          participants: { some: { userId: input.userId } },
        },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          attachmentLinks: {
            orderBy: { sortOrder: "asc" },
            include: { attachment: true },
          },
        },
      },
      contextLinks: true,
      readStates: { where: { userId: input.userId }, take: 1 },
      matchedPerson: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      },
      matchedSponsorContact: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      assignedToUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  return conversation;
}

export async function markCommunicationCenterConversationRead(input: {
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
      readAt: new Date(),
    },
    update: { readAt: new Date() },
  });
}

export async function assignCommunicationCenterConversation(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
  assignedToUserId: string | null;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true, mailboxOrganization: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  assertNotTrashedForSharedOperationalMutation(conversation.mailboxOrganization);

  if (input.assignedToUserId) {
    const assigneeMembership = await prisma.tenantMembership.findFirst({
      where: { tenantId: input.tenantId, userId: input.assignedToUserId },
      select: { id: true },
    });
    if (!assigneeMembership) {
      throw new CommunicationCenterError("FORBIDDEN", "Zuweisung ausserhalb des Vereins nicht erlaubt.");
    }
  }

  await prisma.communicationCenterConversation.update({
    where: { id: input.conversationId },
    data: {
      assignedToUserId: input.assignedToUserId,
      assignedByUserId: input.assignedToUserId ? input.actorUserId : null,
      assignedAt: input.assignedToUserId ? new Date() : null,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.conversation.assigned",
    targetType: "CommunicationCenterConversation",
    targetId: input.conversationId,
    metadata: { assignedToUserId: input.assignedToUserId },
  });
}

export async function setCommunicationCenterConversationStatus(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
  status: CommunicationCenterConversationStatus;
}): Promise<void> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { id: true, mailboxOrganization: true },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }
  assertNotTrashedForSharedOperationalMutation(conversation.mailboxOrganization);

  await prisma.communicationCenterConversation.update({
    where: { id: input.conversationId },
    data: { status: input.status },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action:
      input.status === CommunicationCenterConversationStatus.RESOLVED
        ? "communication.inbox.conversation.resolved"
        : "communication.inbox.conversation.reopened",
    targetType: "CommunicationCenterConversation",
    targetId: input.conversationId,
    metadata: { status: input.status },
  });
}
