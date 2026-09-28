/**
 * SCE-COMM-UX-04A — canonical direct message send (PlatformCommunication + Communication Center).
 *
 * Multi-recipient sends fan out to individual SCE inbox threads (privacy-safe).
 * Each "Neue Nachricht" creates a new DIRECT_THREAD (no silent reuse of unrelated history).
 */

import {
  CommunicationCenterChannel,
  CommunicationCenterMessageDirection,
  CommunicationCenterMessageStatus,
  PlatformCommunicationKind,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveCommunicationRecipientsForDispatch } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { buildCampaignPublishSnapshotCreateMany } from "@/lib/communication/sponsor/publish-recipient-snapshot-data";
import { resolveCommunicationChannelIntent } from "@/lib/communication/platform-email/communication-channel-intent";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { enqueuePlatformCommunicationEmailDeliveries } from "@/lib/communication/platform-email/platform-email-dispatch-service";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import { singleRecipientAudienceSpec } from "@/lib/communication/direct/direct-audience-spec";
import { assertRecipientPersonIdsInSenderScope } from "@/lib/communication/direct/direct-message-authorization";
import { plainTextToSafeHtml } from "@/lib/communication/outbound-email-service";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { NotificationEntityType, NotificationType } from "@prisma/client";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import { applyCommunicationPreferencesToNotificationDefaults } from "@/lib/communication/preferences/apply-notification-channel-preferences";
import { formatPersonDisplayName } from "@/lib/communication/inbox/inbox-display";
import { randomBytes } from "node:crypto";
import { applyPersonalSignatureToOutboundBody } from "@/lib/communication/personal-signature/personal-signature-service";
import {
  attachSelectionToPlatformCommunication,
  mirrorPlatformAttachmentsToCenterMessage,
} from "@/lib/communication/attachment-service";

export type DirectMessageMode = "MESSAGE" | "INFORM";

export type SendDirectMessageInput = {
  tenantId: string;
  senderUserId: string;
  recipientPersonIds: readonly string[];
  subject?: string | null;
  bodyText: string;
  mode: DirectMessageMode;
  channelIntent?: { inApp?: boolean; push?: boolean; email?: boolean };
  includePersonalSignature?: boolean;
  attachmentIds?: readonly string[];
};

export type SendDirectMessageResult = {
  communicationIds: string[];
  conversationIds: string[];
  recipientCount: number;
};

function sanitizeBody(body: string, allowEmpty: boolean): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed && !allowEmpty) {
    throw new TeamCommunicationValidationError("body is required");
  }
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

function sanitizeSubject(subject: string | undefined | null): string | null {
  const trimmed = subject?.trim() ?? "";
  if (trimmed.length > 240) {
    throw new TeamCommunicationValidationError("subject exceeds maximum length");
  }
  return trimmed || null;
}

function resolveRepliesAllowed(mode: DirectMessageMode): boolean {
  return mode === "MESSAGE";
}

function buildOrchestrationMeta(channelIntent: SendDirectMessageInput["channelIntent"]): Prisma.InputJsonValue {
  return {
    channelIntent: {
      inApp: channelIntent?.inApp !== false,
      push: channelIntent?.push !== false,
      email: channelIntent?.email === true,
    },
    directMessage: true,
  } as Prisma.InputJsonValue;
}

function newDirectThreadSlug(): string {
  return randomBytes(12).toString("hex");
}

async function emitDirectInboxNotification(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    recipientUserId: string;
    communicationId: string;
    conversationId: string;
    title: string;
    bodyPreview: string;
    excludeSenderUserId: string;
  },
): Promise<void> {
  if (!input.recipientUserId.trim() || input.recipientUserId === input.excludeSenderUserId) {
    return;
  }
  const notificationType = NotificationType.CLUB_COMMUNICATION_PUBLISHED;
  const basePreferences = resolveEffectivePreference(notificationType, null);
  const preferences = await applyCommunicationPreferencesToNotificationDefaults({
    tenantId: input.tenantId,
    recipientUserId: input.recipientUserId,
    notificationType,
    base: basePreferences,
  });
  await createNotificationIdempotent(tx, {
    tenantId: input.tenantId,
    recipientUserId: input.recipientUserId,
    type: notificationType,
    title: input.title,
    body: input.bodyPreview,
    href: `/dashboard/communication/inbox?conversation=${input.conversationId}`,
    entityType: NotificationEntityType.COMMUNICATION,
    entityId: input.communicationId,
    deduplicationKey: `direct-msg:${input.communicationId}:${input.recipientUserId}`,
    preferences,
  });
}

async function sendDirectMessageToSingleRecipient(input: {
  tenantId: string;
  senderUserId: string;
  senderPersonId: string | null;
  recipientPersonId: string;
  subject: string | null;
  bodyText: string;
  repliesAllowed: boolean;
  orchestrationMetaJson: Prisma.InputJsonValue;
  attachmentIds: readonly string[];
}): Promise<{ communicationId: string; conversationId: string; deliveryUserIds: string[] }> {
  const audience = singleRecipientAudienceSpec(input.recipientPersonId);
  const contextRef = { kind: "DIRECT" as const, tenantId: input.tenantId };
  const threadSlug = newDirectThreadSlug();

  const platformConversation = await prisma.platformCommunicationConversation.create({
    data: {
      tenantId: input.tenantId,
      contextKind: "DIRECT",
      conversationKind: "DIRECT_THREAD",
      namedThreadSlug: threadSlug,
      teamId: null,
    },
  });

  const communication = await prisma.platformCommunication.create({
    data: {
      tenantId: input.tenantId,
      conversationId: platformConversation.id,
      kind: PlatformCommunicationKind.MESSAGE,
      status: "DRAFT",
      contextRef,
      senderPersonId: input.senderPersonId,
      subject: input.subject,
      bodyText: input.bodyText,
      audienceSpecJson: audience,
      acknowledgementRequired: false,
      repliesAllowed: input.repliesAllowed,
      orchestrationMetaJson: input.orchestrationMetaJson,
      createdByUserId: input.senderUserId,
    },
  });

  if (input.attachmentIds.length > 0) {
    await attachSelectionToPlatformCommunication({
      tenantId: input.tenantId,
      actorUserId: input.senderUserId,
      communicationId: communication.id,
      attachmentIds: [...input.attachmentIds],
    });
  }

  const dispatch = await resolveCommunicationRecipientsForDispatch(
    {
      tenantId: input.tenantId,
      senderActor: { userId: input.senderUserId },
      audience,
      context: contextRef,
      channel: "IN_APP",
      category: "CLUB_OPERATIONAL",
      mode: "DISPATCH",
    },
    communication.id,
  );

  const fingerprint = dispatch.core.metadata.audienceFingerprint;
  const channelIntent = resolveCommunicationChannelIntent({
    orchestrationMetaJson: input.orchestrationMetaJson,
  });
  const emailReadiness = await evaluatePlatformEmailReadiness(input.tenantId);
  const publishSnapshots = await buildCampaignPublishSnapshotCreateMany({
    tenantId: input.tenantId,
    communicationId: communication.id,
    audience,
    audienceFingerprint: fingerprint,
    resolvedAt: dispatch.core.metadata.resolvedAt,
    deliveryTargets: dispatch.pipeline.deliveryTargets,
    emailChannelEnabled: channelIntent.email,
    emailTransportReady: emailReadiness.ready,
  });

  if (publishSnapshots.totalCount === 0) {
    throw new TeamCommunicationValidationError("no eligible recipients for dispatch");
  }

  const subjectPerson = await prisma.person.findFirst({
    where: { id: input.recipientPersonId, tenantId: input.tenantId },
    select: { id: true, firstName: true, lastName: true, displayName: true, userId: true },
  });
  if (!subjectPerson) {
    throw new TeamCommunicationValidationError("recipient not found");
  }

  const participantUserIds = new Set<string>([input.senderUserId]);
  for (const deliveryUserId of publishSnapshots.deliveryUserIds) {
    if (deliveryUserId) participantUserIds.add(deliveryUserId);
  }

  const inboxSubject =
    input.subject?.trim() ||
    `Nachricht an ${formatPersonDisplayName(subjectPerson)}`;

  const publishedAt = new Date();
  let conversationId = "";
  let centerMessageId = "";

  await prisma.$transaction(async (tx) => {
    await tx.platformCommunication.update({
      where: { id: communication.id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        audienceFingerprint: fingerprint,
      },
    });

    await tx.platformCommunicationRecipientSnapshot.createMany({
      data: publishSnapshots.createManyData.map((snap) => ({
        ...snap,
        communicationId: communication.id,
      })),
      skipDuplicates: true,
    });

    const threadRootMessageId = `<sce.direct.${communication.id}@sportclubevo.local>`;

    const inboxConversation = await tx.communicationCenterConversation.create({
      data: {
        tenantId: input.tenantId,
        channel: CommunicationCenterChannel.SCE,
        mailboxId: null,
        subject: inboxSubject,
        threadRootMessageId,
        previewText: input.bodyText.slice(0, 280),
        lastMessageAt: publishedAt,
        matchedPersonId: subjectPerson.id,
        platformCommunicationId: communication.id,
        repliesAllowed: input.repliesAllowed,
        searchText: [inboxSubject, input.bodyText, formatPersonDisplayName(subjectPerson)]
          .filter(Boolean)
          .join("\n")
          .slice(0, 8000),
        participants: {
          create: [...participantUserIds].map((userId) => ({
            tenantId: input.tenantId,
            userId,
          })),
        },
      },
    });
    conversationId = inboxConversation.id;

    const centerMessage = await tx.communicationCenterMessage.create({
      data: {
        tenantId: input.tenantId,
        conversationId: inboxConversation.id,
        direction: CommunicationCenterMessageDirection.OUTBOUND,
        status: CommunicationCenterMessageStatus.SENT,
        messageIdHeader: threadRootMessageId,
        subject: inboxSubject,
        bodyText: input.bodyText,
        bodyHtmlSanitized: plainTextToSafeHtml(input.bodyText || " "),
        sentAt: publishedAt,
        createdByUserId: input.senderUserId,
      },
    });
    centerMessageId = centerMessage.id;

    for (const deliveryUserId of publishSnapshots.deliveryUserIds) {
      await emitDirectInboxNotification(tx, {
        tenantId: input.tenantId,
        recipientUserId: deliveryUserId,
        communicationId: communication.id,
        conversationId: inboxConversation.id,
        title: inboxSubject,
        bodyPreview: input.bodyText.slice(0, 240),
        excludeSenderUserId: input.senderUserId,
      });
    }
  });

  if (centerMessageId && input.attachmentIds.length > 0) {
    await mirrorPlatformAttachmentsToCenterMessage({
      tenantId: input.tenantId,
      actorUserId: input.senderUserId,
      platformCommunicationId: communication.id,
      messageId: centerMessageId,
    });
  }

  try {
    await enqueuePlatformCommunicationEmailDeliveries({
      tenantId: input.tenantId,
      communicationId: communication.id,
      channelIntent,
      category: "CLUB_OPERATIONAL",
      actorUserId: input.senderUserId,
      communicationKind: PlatformCommunicationKind.MESSAGE,
    });
  } catch (error) {
    console.error("[direct-message] email enqueue failed", {
      communicationId: communication.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "COMMUNICATION_PUBLISHED",
    communicationId: communication.id,
    kind: PlatformCommunicationKind.MESSAGE,
    status: "PUBLISHED",
  });

  return {
    communicationId: communication.id,
    conversationId,
    deliveryUserIds: publishSnapshots.deliveryUserIds,
  };
}

export async function sendDirectMessage(input: SendDirectMessageInput): Promise<SendDirectMessageResult> {
  const recipientIds = [...new Set(input.recipientPersonIds.map((id) => id.trim()).filter(Boolean))];
  if (recipientIds.length === 0) {
    throw new TeamCommunicationValidationError("at least one recipient is required");
  }

  await assertRecipientPersonIdsInSenderScope({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    recipientPersonIds: recipientIds,
  });

  let bodyWithSignature: string;
  try {
    bodyWithSignature = await applyPersonalSignatureToOutboundBody({
      tenantId: input.tenantId,
      userId: input.senderUserId,
      messageBody: input.bodyText,
      includePersonalSignature: input.includePersonalSignature,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_WITH_SIGNATURE_TOO_LONG") {
      throw new TeamCommunicationValidationError("body exceeds maximum length");
    }
    throw error;
  }
  const attachmentIds = [...new Set((input.attachmentIds ?? []).filter(Boolean))];
  const bodyText = sanitizeBody(bodyWithSignature, attachmentIds.length > 0);
  const subject = sanitizeSubject(input.subject);
  const repliesAllowed = resolveRepliesAllowed(input.mode);
  const orchestrationMetaJson = buildOrchestrationMeta(input.channelIntent);
  const senderPersonId = await resolvePersonIdForUser(input.senderUserId, input.tenantId);

  const communicationIds: string[] = [];
  const conversationIds: string[] = [];

  for (const recipientPersonId of recipientIds) {
    const result = await sendDirectMessageToSingleRecipient({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      senderPersonId,
      recipientPersonId,
      subject,
      bodyText,
      repliesAllowed,
      orchestrationMetaJson,
      attachmentIds,
    });
    communicationIds.push(result.communicationId);
    conversationIds.push(result.conversationId);
  }

  return {
    communicationIds,
    conversationIds,
    recipientCount: recipientIds.length,
  };
}

export async function assertConversationAllowsReplies(input: {
  tenantId: string;
  conversationId: string;
}): Promise<{ repliesAllowed: boolean; channel: CommunicationCenterChannel }> {
  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: {
      repliesAllowed: true,
      channel: true,
      platformCommunicationId: true,
    },
  });
  if (!conversation) {
    throw new TeamCommunicationValidationError("conversation not found");
  }
  if (conversation.repliesAllowed === false) {
    return { repliesAllowed: false, channel: conversation.channel };
  }
  if (conversation.platformCommunicationId) {
    const root = await prisma.platformCommunication.findFirst({
      where: { id: conversation.platformCommunicationId, tenantId: input.tenantId },
      select: { repliesAllowed: true },
    });
    if (root && !root.repliesAllowed) {
      return { repliesAllowed: false, channel: conversation.channel };
    }
  }
  return { repliesAllowed: true, channel: conversation.channel };
}
