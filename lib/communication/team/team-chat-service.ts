/**
 * SCE-COMM-05 — Team chat application service (PlatformCommunication-owned).
 */

import type { Prisma } from "@prisma/client";
import {
  NotificationEntityType,
  NotificationType,
  PlatformCommunicationRecipientEngagement,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  attachSelectionToPlatformCommunication,
} from "@/lib/communication/attachment-service";
import { canTransitionRecipientEngagement } from "@/lib/communication/platform/engagement";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import {
  createTeamCommunicationDraft,
  publishTeamCommunication,
  MAX_TEAM_COMMUNICATION_BODY_LENGTH,
} from "@/lib/communication/team/team-communication-service";
import { getOrCreateTeamCommunicationConversation } from "@/lib/communication/team/team-communication-context";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationTenantMismatchError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { decodeTeamChatCursor, encodeTeamChatCursor } from "@/lib/communication/team/team-chat-cursor";
import {
  isTeamChatReactionKey,
  type TeamChatReactionKey,
} from "@/lib/communication/team/team-chat-reactions";
import { assertTeamMentionPersonIdsAllowed } from "@/lib/communication/team/team-chat-mention-candidates";

const READ_ENGAGEMENT: PlatformCommunicationRecipientEngagement[] = [
  "READ",
  "ACKNOWLEDGED",
  "RESPONDED",
];

export type TeamChatAttachmentDto = {
  id: string;
  attachmentId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
};

export type TeamChatReplyPreviewDto = {
  communicationId: string;
  bodyText: string;
  senderPerson: { id: string; firstName: string; lastName: string } | null;
};

export type TeamChatMentionDto = {
  personId: string;
  firstName: string;
  lastName: string;
};

export type TeamChatReactionAggregateDto = {
  reactionKey: TeamChatReactionKey;
  count: number;
  reactedBySelf: boolean;
};

export type TeamChatMessageDto = {
  id: string;
  bodyText: string;
  subject: string | null;
  kind: string;
  status: string;
  acknowledgementRequired: boolean;
  publishedAt: string | null;
  createdAt: string;
  senderPerson: { id: string; firstName: string; lastName: string } | null;
  replyTo: TeamChatReplyPreviewDto | null;
  reactions: TeamChatReactionAggregateDto[];
  mentions: TeamChatMentionDto[];
  attachments: TeamChatAttachmentDto[];
  unreadForViewer: boolean;
  viewerEngagement: string | null;
  viewerAcknowledged: boolean;
  canAcknowledge: boolean;
};

export type TeamChatMessagePage = {
  messages: TeamChatMessageDto[];
  nextOlderCursor: string | null;
  hasMoreOlder: boolean;
};

const MESSAGE_INCLUDE = {
  senderPerson: { select: { id: true, firstName: true, lastName: true } },
  replyTo: {
    select: {
      id: true,
      bodyText: true,
      senderPerson: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  reactions: { select: { reactionKey: true, personId: true } },
  mentions: {
    select: {
      mentionedPerson: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  attachmentLinks: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      sortOrder: true,
      attachment: {
        select: {
          id: true,
          originalFilename: true,
          contentType: true,
          sizeBytes: true,
        },
      },
    },
  },
} satisfies Prisma.PlatformCommunicationInclude;

function sanitizeChatBody(body: string, attachmentIds: readonly string[]): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed && attachmentIds.length === 0) {
    throw new TeamCommunicationValidationError("body is required");
  }
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

async function assertValidReplyParent(input: {
  tenantId: string;
  teamId: string;
  conversationId: string;
  replyToCommunicationId: string;
}): Promise<void> {
  const parent = await prisma.platformCommunication.findFirst({
    where: {
      id: input.replyToCommunicationId,
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      replyToCommunicationId: true,
      conversation: { select: { teamId: true } },
    },
  });
  if (!parent) throw new TeamCommunicationNotFoundError("reply parent not found");
  if (parent.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationTenantMismatchError();
  }
  if (parent.replyToCommunicationId) {
    throw new TeamCommunicationValidationError("nested replies are not supported");
  }
}

async function resolveViewerPersonId(userId: string, tenantId: string): Promise<string | null> {
  try {
    return await resolvePersonIdForUser(userId, tenantId);
  } catch {
    return null;
  }
}

function mapReactionAggregates(
  rows: { reactionKey: string; personId: string }[],
  viewerPersonId: string | null,
): TeamChatReactionAggregateDto[] {
  const map = new Map<string, { count: number; reactedBySelf: boolean }>();
  for (const row of rows) {
    if (!isTeamChatReactionKey(row.reactionKey)) continue;
    const current = map.get(row.reactionKey) ?? { count: 0, reactedBySelf: false };
    current.count += 1;
    if (viewerPersonId && row.personId === viewerPersonId) current.reactedBySelf = true;
    map.set(row.reactionKey, current);
  }
  return [...map.entries()].map(([reactionKey, value]) => ({
    reactionKey: reactionKey as TeamChatReactionKey,
    count: value.count,
    reactedBySelf: value.reactedBySelf,
  }));
}

async function loadUnreadCommunicationIds(input: {
  tenantId: string;
  deliveryUserId: string;
  communicationIds: readonly string[];
  senderPersonId: string | null;
}): Promise<Set<string>> {
  if (input.communicationIds.length === 0) return new Set();

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      deliveryUserId: input.deliveryUserId,
      communicationId: { in: [...input.communicationIds] },
      engagement: { notIn: READ_ENGAGEMENT },
    },
    select: { communicationId: true, subjectPersonId: true },
  });

  const unread = new Set<string>();
  for (const snap of snapshots) {
    if (input.senderPersonId && snap.subjectPersonId === input.senderPersonId) continue;
    unread.add(snap.communicationId);
  }
  return unread;
}

function mapMessageRow(
  row: Prisma.PlatformCommunicationGetPayload<{ include: typeof MESSAGE_INCLUDE }>,
  unreadIds: Set<string>,
  viewerEngagementByCommunicationId: Map<string, PlatformCommunicationRecipientEngagement>,
): TeamChatMessageDto {
  const viewerEngagement = viewerEngagementByCommunicationId.get(row.id) ?? null;
  const viewerAcknowledged =
    viewerEngagement === "ACKNOWLEDGED" || viewerEngagement === "RESPONDED";
  const canAcknowledge =
    row.acknowledgementRequired &&
    row.status === "PUBLISHED" &&
    viewerEngagement !== null &&
    !viewerAcknowledged;

  return {
    id: row.id,
    bodyText: row.status === "ARCHIVED" ? "Nachricht archiviert." : row.bodyText,
    subject: row.subject,
    kind: row.kind,
    status: row.status,
    acknowledgementRequired: row.acknowledgementRequired,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    senderPerson: row.senderPerson,
    replyTo: row.replyTo
      ? {
          communicationId: row.replyTo.id,
          bodyText: row.replyTo.bodyText.slice(0, 280),
          senderPerson: row.replyTo.senderPerson,
        }
      : null,
    reactions: mapReactionAggregates(row.reactions, null),
    mentions: row.mentions.map((m) => ({
      personId: m.mentionedPerson.id,
      firstName: m.mentionedPerson.firstName,
      lastName: m.mentionedPerson.lastName,
    })),
    attachments: row.attachmentLinks.map((link) => ({
      id: link.attachment.id,
      attachmentId: link.attachment.id,
      originalFilename: link.attachment.originalFilename,
      contentType: link.attachment.contentType,
      sizeBytes: link.attachment.sizeBytes,
      sortOrder: link.sortOrder,
    })),
    unreadForViewer: unreadIds.has(row.id),
    viewerEngagement,
    viewerAcknowledged,
    canAcknowledge,
  };
}

async function loadViewerEngagements(input: {
  tenantId: string;
  deliveryUserId: string;
  communicationIds: readonly string[];
}): Promise<Map<string, PlatformCommunicationRecipientEngagement>> {
  if (input.communicationIds.length === 0) return new Map();
  const rows = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      deliveryUserId: input.deliveryUserId,
      communicationId: { in: [...input.communicationIds] },
    },
    select: { communicationId: true, engagement: true },
  });
  const map = new Map<string, PlatformCommunicationRecipientEngagement>();
  for (const row of rows) {
    const current = map.get(row.communicationId);
    if (!current || row.engagement === "ACKNOWLEDGED" || row.engagement === "RESPONDED") {
      map.set(row.communicationId, row.engagement);
    }
  }
  return map;
}

export async function listTeamChatMessages(input: {
  tenantId: string;
  teamId: string;
  viewerUserId: string;
  limit?: number;
  olderThanCursor?: string | null;
  focusCommunicationId?: string | null;
}): Promise<TeamChatMessagePage> {
  const conversation = await getOrCreateTeamCommunicationConversation({
    tenantId: input.tenantId,
    teamId: input.teamId,
  });
  if (!conversation) {
    return { messages: [], nextOlderCursor: null, hasMoreOlder: false };
  }

  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const cursor = decodeTeamChatCursor(input.olderThanCursor);

  const where: Prisma.PlatformCommunicationWhereInput = {
    tenantId: input.tenantId,
    conversationId: conversation.id,
    status: { in: ["PUBLISHED", "ARCHIVED"] },
    publishedAt: { not: null },
  };

  if (cursor?.publishedAt && cursor.id) {
    where.OR = [
      { publishedAt: { lt: new Date(cursor.publishedAt) } },
      {
        publishedAt: new Date(cursor.publishedAt),
        id: { lt: cursor.id },
      },
    ];
  }

  const rows = await prisma.platformCommunication.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: MESSAGE_INCLUDE,
  });

  const hasMoreOlder = rows.length > limit;
  const pageRows = hasMoreOlder ? rows.slice(0, limit) : rows;
  const chronological = [...pageRows].reverse();

  const viewerPersonId = await resolveViewerPersonId(input.viewerUserId, input.tenantId);
  const communicationIds = chronological.map((m) => m.id);
  const [unreadIds, viewerEngagements] = await Promise.all([
    loadUnreadCommunicationIds({
      tenantId: input.tenantId,
      deliveryUserId: input.viewerUserId,
      communicationIds,
      senderPersonId: viewerPersonId,
    }),
    loadViewerEngagements({
      tenantId: input.tenantId,
      deliveryUserId: input.viewerUserId,
      communicationIds,
    }),
  ]);

  const messages = chronological.map((row) => {
    const dto = mapMessageRow(row, unreadIds, viewerEngagements);
    dto.reactions = mapReactionAggregates(row.reactions, viewerPersonId);
    dto.unreadForViewer = unreadIds.has(row.id);
    return dto;
  });

  const oldest = pageRows[pageRows.length - 1];
  const nextOlderCursor =
    hasMoreOlder && oldest?.publishedAt
      ? encodeTeamChatCursor({
          publishedAt: oldest.publishedAt.toISOString(),
          id: oldest.id,
        })
      : null;

  if (input.focusCommunicationId) {
    const focusId = input.focusCommunicationId.trim();
    const inPage = messages.some((m) => m.id === focusId);
    if (!inPage && focusId) {
      const focusRow = await prisma.platformCommunication.findFirst({
        where: {
          id: focusId,
          tenantId: input.tenantId,
          conversationId: conversation.id,
          status: { in: ["PUBLISHED", "ARCHIVED"] },
        },
        include: MESSAGE_INCLUDE,
      });
      if (focusRow) {
        const focusDto = mapMessageRow(focusRow, unreadIds, viewerEngagements);
        focusDto.reactions = mapReactionAggregates(focusRow.reactions, viewerPersonId);
        if (!messages.some((m) => m.id === focusDto.id)) {
          messages.push(focusDto);
          messages.sort(
            (a, b) =>
              new Date(a.publishedAt ?? a.createdAt).getTime() -
              new Date(b.publishedAt ?? b.createdAt).getTime(),
          );
        }
      }
    }
  }

  return { messages, nextOlderCursor, hasMoreOlder };
}

export async function sendTeamChatMessage(input: {
  tenantId: string;
  teamId: string;
  senderUserId: string;
  bodyText: string;
  replyToCommunicationId?: string | null;
  mentionedPersonIds?: readonly string[];
  attachmentIds?: readonly string[];
}): Promise<{ id: string; recipientCount: number }> {
  const attachmentIds = [...new Set((input.attachmentIds ?? []).filter(Boolean))];
  const bodyText = sanitizeChatBody(input.bodyText, attachmentIds);
  const mentionedPersonIds = [...new Set((input.mentionedPersonIds ?? []).filter(Boolean))];

  await assertTeamMentionPersonIdsAllowed({
    tenantId: input.tenantId,
    teamId: input.teamId,
    personIds: mentionedPersonIds,
  });

  const conversation = await getOrCreateTeamCommunicationConversation({
    tenantId: input.tenantId,
    teamId: input.teamId,
  });
  if (!conversation) throw new TeamCommunicationNotFoundError("team not found");

  const replyToId = input.replyToCommunicationId?.trim() || null;
  if (replyToId) {
    await assertValidReplyParent({
      tenantId: input.tenantId,
      teamId: input.teamId,
      conversationId: conversation.id,
      replyToCommunicationId: replyToId,
    });
  }

  const draft = await createTeamCommunicationDraft({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind: "MESSAGE",
    bodyText,
    replyToCommunicationId: replyToId,
    allowEmptyBody: attachmentIds.length > 0,
  });

  if (attachmentIds.length > 0) {
    await attachSelectionToPlatformCommunication({
      tenantId: input.tenantId,
      actorUserId: input.senderUserId,
      communicationId: draft.id,
      attachmentIds,
    });
  }

  const published = await publishTeamCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    communicationId: draft.id,
    senderUserId: input.senderUserId,
  });

  if (mentionedPersonIds.length > 0) {
    await prisma.platformCommunicationMention.createMany({
      data: mentionedPersonIds.map((personId) => ({
        tenantId: input.tenantId,
        communicationId: draft.id,
        mentionedPersonId: personId,
      })),
      skipDuplicates: true,
    });
    await emitTeamChatMentionNotifications({
      tenantId: input.tenantId,
      teamId: input.teamId,
      communicationId: draft.id,
      senderUserId: input.senderUserId,
      mentionedPersonIds,
      bodyPreview: bodyText.slice(0, 240),
    });
  }

  return published;
}

async function emitTeamChatMentionNotifications(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  senderUserId: string;
  mentionedPersonIds: readonly string[];
  bodyPreview: string;
}): Promise<void> {
  const persons = await prisma.person.findMany({
    where: { tenantId: input.tenantId, id: { in: [...input.mentionedPersonIds] } },
    select: { id: true, userId: true, firstName: true, lastName: true },
  });
  const href = `/dashboard/teams/${input.teamId}/kommunikation?communicationId=${input.communicationId}`;
  const preferences = resolveEffectivePreference(
    NotificationType.TEAM_COMMUNICATION_PUBLISHED,
    null,
  );

  await prisma.$transaction(async (tx) => {
    for (const person of persons) {
      if (!person.userId || person.userId === input.senderUserId) continue;
      await createNotificationIdempotent(tx, {
        tenantId: input.tenantId,
        recipientUserId: person.userId,
        type: NotificationType.TEAM_COMMUNICATION_PUBLISHED,
        title: "Erwähnung in Team-Chat",
        body: input.bodyPreview,
        href,
        entityType: NotificationEntityType.COMMUNICATION,
        entityId: input.communicationId,
        deduplicationKey: `team-comm-mention:${input.communicationId}:${person.userId}`,
        preferences,
      });
    }
  });
}

export async function setTeamChatReaction(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  actorUserId: string;
  reactionKey: string;
  active: boolean;
}): Promise<void> {
  if (!isTeamChatReactionKey(input.reactionKey)) {
    throw new TeamCommunicationValidationError("invalid reaction");
  }

  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.communicationId,
      tenantId: input.tenantId,
      status: "PUBLISHED",
    },
    include: { conversation: { select: { teamId: true } } },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationTenantMismatchError();
  }

  const personId = await resolvePersonIdForUser(input.actorUserId, input.tenantId);
  if (!personId) throw new TeamCommunicationForbiddenError();

  if (input.active) {
    await prisma.platformCommunicationReaction.upsert({
      where: {
        communicationId_personId_reactionKey: {
          communicationId: row.id,
          personId,
          reactionKey: input.reactionKey,
        },
      },
      create: {
        tenantId: input.tenantId,
        communicationId: row.id,
        personId,
        reactionKey: input.reactionKey,
      },
      update: {},
    });
  } else {
    await prisma.platformCommunicationReaction.deleteMany({
      where: {
        tenantId: input.tenantId,
        communicationId: row.id,
        personId,
        reactionKey: input.reactionKey,
      },
    });
  }
}

export async function getTeamChatUnreadCount(input: {
  tenantId: string;
  teamId: string;
  viewerUserId: string;
}): Promise<number> {
  const conversation = await prisma.platformCommunicationConversation.findFirst({
    where: {
      tenantId: input.tenantId,
      teamId: input.teamId,
      contextKind: "TEAM",
      conversationKind: "TEAM_GENERAL",
    },
    select: { id: true },
  });
  if (!conversation) return 0;

  const viewerPersonId = await resolveViewerPersonId(input.viewerUserId, input.tenantId);

  return prisma.platformCommunicationRecipientSnapshot.count({
    where: {
      tenantId: input.tenantId,
      deliveryUserId: input.viewerUserId,
      engagement: { notIn: READ_ENGAGEMENT },
      communication: {
        conversationId: conversation.id,
        status: "PUBLISHED",
        ...(viewerPersonId ? { NOT: { senderPersonId: viewerPersonId } } : {}),
      },
    },
  });
}

export async function markTeamChatConversationRead(input: {
  tenantId: string;
  teamId: string;
  viewerUserId: string;
  upToCommunicationId?: string | null;
}): Promise<number> {
  const conversation = await prisma.platformCommunicationConversation.findFirst({
    where: {
      tenantId: input.tenantId,
      teamId: input.teamId,
      contextKind: "TEAM",
      conversationKind: "TEAM_GENERAL",
    },
    select: { id: true },
  });
  if (!conversation) return 0;

  let upToPublishedAt: Date | null = null;
  if (input.upToCommunicationId?.trim()) {
    const upTo = await prisma.platformCommunication.findFirst({
      where: {
        id: input.upToCommunicationId.trim(),
        tenantId: input.tenantId,
        conversationId: conversation.id,
      },
      select: { publishedAt: true },
    });
    upToPublishedAt = upTo?.publishedAt ?? null;
  }

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      deliveryUserId: input.viewerUserId,
      engagement: { notIn: READ_ENGAGEMENT },
      communication: {
        conversationId: conversation.id,
        status: "PUBLISHED",
        ...(upToPublishedAt
          ? { publishedAt: { lte: upToPublishedAt } }
          : {}),
      },
    },
    select: { id: true, engagement: true },
  });

  let updated = 0;
  for (const snap of snapshots) {
    const from = snap.engagement as Parameters<typeof canTransitionRecipientEngagement>[0];
    if (!canTransitionRecipientEngagement(from, "READ")) continue;
    await prisma.platformCommunicationRecipientSnapshot.update({
      where: { id: snap.id },
      data: { engagement: "READ", readAt: new Date() },
    });
    updated += 1;
  }

  if (updated > 0) {
    await prisma.notification.updateMany({
      where: {
        tenantId: input.tenantId,
        recipientUserId: input.viewerUserId,
        readAt: null,
        entityType: NotificationEntityType.COMMUNICATION,
        href: { contains: `/dashboard/teams/${input.teamId}/kommunikation` },
      },
      data: { readAt: new Date() },
    });
  }

  return updated;
}
