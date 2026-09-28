import {
  CommunicationCenterMessageDirection,
  CommunicationCenterMessageStatus,
  PlatformCommunicationKind,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { assertConversationAllowsReplies } from "@/lib/communication/direct/direct-message-service";
import { reactivateCommunicationCenterConversationToInboxOnReply } from "@/lib/communication/inbox/mailbox-organization-service";
import { recordCommunicationCenterAudit } from "@/lib/communication/inbox/inbox-audit";
import { plainTextToSafeHtml } from "@/lib/communication/outbound-email-service";
import { singleRecipientAudienceSpec } from "@/lib/communication/direct/direct-audience-spec";
import { resolveCommunicationRecipientsForDispatch } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { buildCampaignPublishSnapshotCreateMany } from "@/lib/communication/sponsor/publish-recipient-snapshot-data";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
export type DirectSceReplyResult = {
  messageId: string;
  status: CommunicationCenterMessageStatus;
};

export async function replyToSceDirectConversation(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
  bodyText: string;
  idempotencyKey: string;
}): Promise<DirectSceReplyResult> {
  const bodyText = input.bodyText.trim();
  if (!bodyText) {
    throw new CommunicationCenterError("INVALID_INPUT", "Nachrichtentext ist erforderlich.");
  }
  if (bodyText.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new CommunicationCenterError("INVALID_INPUT", "Nachricht ist zu lang.");
  }

  const { repliesAllowed, channel } = await assertConversationAllowsReplies({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
  });

  if (repliesAllowed === false || channel !== "SCE") {
    throw new CommunicationCenterError(
      "REPLIES_DISABLED",
      "Antworten sind für diese Nachricht deaktiviert.",
    );
  }

  const participant = await prisma.communicationCenterConversationParticipant.findFirst({
    where: {
      conversationId: input.conversationId,
      userId: input.actorUserId,
      tenantId: input.tenantId,
    },
  });
  if (!participant) {
    throw new CommunicationCenterError("FORBIDDEN", "Kein Zugriff auf diese Konversation.");
  }

  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    include: { platformCommunication: true },
  });
  if (!conversation?.platformCommunication) {
    throw new CommunicationCenterError("INVALID_STATE", "Konversation ist nicht antwortbar.");
  }

  const root = conversation.platformCommunication;
  if (root.repliesAllowed === false) {
    throw new CommunicationCenterError(
      "REPLIES_DISABLED",
      "Antworten sind für diese Nachricht deaktiviert.",
    );
  }

  const existing = await prisma.communicationCenterMessage.findFirst({
    where: {
      tenantId: input.tenantId,
      outboundIdempotencyKey: input.idempotencyKey,
    },
  });
  if (existing) {
    return { messageId: existing.id, status: existing.status };
  }

  await reactivateCommunicationCenterConversationToInboxOnReply({
    tenantId: input.tenantId,
    conversationId: conversation.id,
  });

  const matchedPersonId = conversation.matchedPersonId;
  if (!matchedPersonId) {
    throw new CommunicationCenterError("INVALID_STATE", "Empfänger nicht gefunden.");
  }

  const counterpartyPersonId =
    input.actorUserId === root.createdByUserId
      ? matchedPersonId
      : root.senderPersonId;
  if (!counterpartyPersonId) {
    throw new CommunicationCenterError("INVALID_STATE", "Gesprächspartner nicht gefunden.");
  }

  const senderPersonId = await resolvePersonIdForUser(input.actorUserId, input.tenantId);
  const audience = singleRecipientAudienceSpec(counterpartyPersonId);
  const contextRef = { kind: "DIRECT" as const, tenantId: input.tenantId };

  const replyCommunication = await prisma.platformCommunication.create({
    data: {
      tenantId: input.tenantId,
      conversationId: root.conversationId,
      kind: PlatformCommunicationKind.MESSAGE,
      status: "DRAFT",
      contextRef,
      senderPersonId,
      subject: root.subject,
      bodyText,
      audienceSpecJson: audience,
      repliesAllowed: true,
      replyToCommunicationId: root.id,
      orchestrationMetaJson: root.orchestrationMetaJson ?? undefined,
      createdByUserId: input.actorUserId,
    },
  });

  const dispatch = await resolveCommunicationRecipientsForDispatch(
    {
      tenantId: input.tenantId,
      senderActor: { userId: input.actorUserId },
      audience,
      context: contextRef,
      channel: "IN_APP",
      category: "CLUB_OPERATIONAL",
      mode: "DISPATCH",
    },
    replyCommunication.id,
  );

  const fingerprint = dispatch.core.metadata.audienceFingerprint;
  const publishSnapshots = await buildCampaignPublishSnapshotCreateMany({
    tenantId: input.tenantId,
    communicationId: replyCommunication.id,
    audience,
    audienceFingerprint: fingerprint,
    resolvedAt: dispatch.core.metadata.resolvedAt,
    deliveryTargets: dispatch.pipeline.deliveryTargets,
    emailChannelEnabled: false,
    emailTransportReady: false,
  });

  const sentAt = new Date();
  const message = await prisma.$transaction(async (tx) => {
    await tx.platformCommunication.update({
      where: { id: replyCommunication.id },
      data: {
        status: "PUBLISHED",
        publishedAt: sentAt,
        audienceFingerprint: fingerprint,
      },
    });
    await tx.platformCommunicationRecipientSnapshot.createMany({
      data: publishSnapshots.createManyData.map((snap) => ({
        ...snap,
        communicationId: replyCommunication.id,
      })),
      skipDuplicates: true,
    });

    const created = await tx.communicationCenterMessage.create({
      data: {
        tenantId: input.tenantId,
        conversationId: conversation.id,
        direction: CommunicationCenterMessageDirection.OUTBOUND,
        status: CommunicationCenterMessageStatus.SENT,
        bodyText,
        bodyHtmlSanitized: plainTextToSafeHtml(bodyText),
        sentAt,
        outboundIdempotencyKey: input.idempotencyKey,
        createdByUserId: input.actorUserId,
      },
    });

    await tx.communicationCenterConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: sentAt,
        previewText: bodyText.slice(0, 280),
      },
    });

    return created;
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.reply.sent",
    targetType: "CommunicationCenterConversation",
    targetId: conversation.id,
    metadata: { messageId: message.id, channel: "SCE" },
  });

  return { messageId: message.id, status: message.status };
}
