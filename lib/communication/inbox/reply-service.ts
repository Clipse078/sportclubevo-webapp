import {
  CommunicationCenterMessageDirection,
  CommunicationCenterMessageStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { resolveTenantEmailSender } from "@/lib/communication/email-sender-service";
import { sendOutboundEmail, OutboundEmailTransportError } from "@/lib/email/outbound-email-transport";
import { plainTextToSafeHtml } from "@/lib/communication/outbound-email-service";
import { normalizeEmailAddress, normalizeInternetMessageId } from "@/lib/communication/inbox/message-id";
import { buildReplyReferences } from "@/lib/communication/inbox/threading-service";
import { recordCommunicationCenterAudit } from "@/lib/communication/inbox/inbox-audit";
import { reactivateCommunicationCenterConversationToInboxOnReply } from "@/lib/communication/inbox/mailbox-organization-service";
import { assertConversationAllowsReplies } from "@/lib/communication/direct/direct-message-service";

export type ReplyToConversationResult = {
  messageId: string;
  status: CommunicationCenterMessageStatus;
  providerMessageId: string | null;
  deliveryError: string | null;
};

function buildOutboundMessageId(): string {
  const token = `${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  return `<comm-center.${token}@sportclubevo.local>`;
}

export async function replyToCommunicationCenterConversation(input: {
  tenantId: string;
  conversationId: string;
  actorUserId: string;
  bodyText: string;
  idempotencyKey: string;
  includePersonalSignature?: boolean;
}): Promise<ReplyToConversationResult> {
  const { applyPersonalSignatureToOutboundBody } = await import(
    "@/lib/communication/personal-signature/personal-signature-service"
  );
  let bodyText = input.bodyText.trim();
  if (!bodyText) {
    throw new CommunicationCenterError("INVALID_INPUT", "Nachrichtentext ist erforderlich.");
  }
  try {
    bodyText = await applyPersonalSignatureToOutboundBody({
      tenantId: input.tenantId,
      userId: input.actorUserId,
      messageBody: bodyText,
      includePersonalSignature: input.includePersonalSignature,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_WITH_SIGNATURE_TOO_LONG") {
      throw new CommunicationCenterError("INVALID_INPUT", "Nachricht ist zu lang.");
    }
    throw error;
  }

  const existing = await prisma.communicationCenterMessage.findFirst({
    where: {
      tenantId: input.tenantId,
      outboundIdempotencyKey: input.idempotencyKey,
    },
  });
  if (existing) {
    return {
      messageId: existing.id,
      status: existing.status,
      providerMessageId: existing.providerMessageId,
      deliveryError: existing.deliveryError,
    };
  }

  const conversation = await prisma.communicationCenterConversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    include: {
      mailbox: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!conversation) {
    throw new CommunicationCenterError("NOT_FOUND", "Konversation nicht gefunden.");
  }

  const replyPolicy = await assertConversationAllowsReplies({
    tenantId: input.tenantId,
    conversationId: conversation.id,
  });
  if (!replyPolicy.repliesAllowed) {
    throw new CommunicationCenterError(
      "REPLIES_DISABLED",
      "Antworten sind für diese Nachricht deaktiviert.",
    );
  }
  if (replyPolicy.channel === "SCE") {
    const { replyToSceDirectConversation } = await import(
      "@/lib/communication/direct/direct-reply-service"
    );
    const sceResult = await replyToSceDirectConversation({ ...input, bodyText });
    return {
      messageId: sceResult.messageId,
      status: sceResult.status,
      providerMessageId: null,
      deliveryError: null,
    };
  }

  await reactivateCommunicationCenterConversationToInboxOnReply({
    tenantId: input.tenantId,
    conversationId: conversation.id,
  });

  const lastInbound =
    [...conversation.messages].reverse().find(
      (m) => m.direction === CommunicationCenterMessageDirection.INBOUND,
    ) ?? conversation.messages[0];

  if (!lastInbound?.fromAddress) {
    throw new CommunicationCenterError("INVALID_STATE", "Kein Empfänger für Antwort gefunden.");
  }

  const readiness = await evaluatePlatformEmailReadiness(input.tenantId);
  if (!readiness.ready) {
    throw new CommunicationCenterError(
      "EMAIL_NOT_READY",
      readiness.reasons[0] ?? "E-Mail-Versand ist nicht bereit.",
    );
  }

  const sender = await resolveTenantEmailSender(input.tenantId);
  const mailboxAddress = conversation.mailbox
    ? normalizeEmailAddress(conversation.mailbox.emailAddress)
    : null;
  const senderAddress = normalizeEmailAddress(sender.emailAddress);
  if (mailboxAddress && senderAddress && mailboxAddress !== senderAddress) {
    throw new CommunicationCenterError(
      "SENDER_MAILBOX_MISMATCH",
      "Absender-Konfiguration stimmt nicht mit dem Postfach überein.",
    );
  }

  const inReplyTo =
    normalizeInternetMessageId(lastInbound.messageIdHeader) ??
    normalizeInternetMessageId(conversation.threadRootMessageId);
  const references = buildReplyReferences(
    Array.isArray(lastInbound.references)
      ? (lastInbound.references as string[])
      : [],
    inReplyTo,
  );
  const outboundMessageId = buildOutboundMessageId();
  const subject = conversation.subject?.startsWith("Re:")
    ? conversation.subject
    : `Re: ${conversation.subject ?? "(Kein Betreff)"}`;

  const draft = await prisma.communicationCenterMessage.create({
    data: {
      tenantId: input.tenantId,
      conversationId: conversation.id,
      mailboxId: conversation.mailboxId,
      direction: CommunicationCenterMessageDirection.OUTBOUND,
      status: CommunicationCenterMessageStatus.SENDING,
      messageIdHeader: outboundMessageId,
      inReplyTo,
      references,
      fromAddress: senderAddress,
      fromDisplayName: sender.displayName,
      toAddresses: [lastInbound.fromAddress],
      subject,
      bodyText,
      bodyHtmlSanitized: plainTextToSafeHtml(bodyText),
      outboundIdempotencyKey: input.idempotencyKey,
      createdByUserId: input.actorUserId,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.reply.initiated",
    targetType: "CommunicationCenterConversation",
    targetId: conversation.id,
    metadata: { messageId: draft.id },
  });

  try {
    const transport = await sendOutboundEmail({
      from: sender.formattedFrom,
      to: lastInbound.fromAddress,
      subject,
      text: bodyText,
      html: plainTextToSafeHtml(bodyText),
      idempotencyKey: input.idempotencyKey,
    });

    const sent = await prisma.communicationCenterMessage.update({
      where: { id: draft.id },
      data: {
        status: CommunicationCenterMessageStatus.SENT,
        sentAt: new Date(),
        providerMessageId: transport.messageId,
        deliveryError: null,
      },
    });

    await prisma.communicationCenterConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        previewText: bodyText.slice(0, 280),
      },
    });

    await recordCommunicationCenterAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "communication.inbox.reply.sent",
      targetType: "CommunicationCenterConversation",
      targetId: conversation.id,
      metadata: { messageId: sent.id },
    });

    return {
      messageId: sent.id,
      status: sent.status,
      providerMessageId: sent.providerMessageId,
      deliveryError: null,
    };
  } catch (error) {
    const deliveryError =
      error instanceof OutboundEmailTransportError
        ? error.code
        : error instanceof Error
          ? error.message.slice(0, 200)
          : "SEND_FAILED";

    const failed = await prisma.communicationCenterMessage.update({
      where: { id: draft.id },
      data: {
        status: CommunicationCenterMessageStatus.FAILED,
        deliveryError,
      },
    });

    await recordCommunicationCenterAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "communication.inbox.reply.failed",
      targetType: "CommunicationCenterConversation",
      targetId: conversation.id,
      metadata: { messageId: failed.id, code: deliveryError },
    });

    return {
      messageId: failed.id,
      status: failed.status,
      providerMessageId: null,
      deliveryError,
    };
  }
}
