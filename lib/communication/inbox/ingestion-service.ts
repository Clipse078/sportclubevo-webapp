import {
  CommunicationCenterChannel,
  CommunicationCenterMessageDirection,
  CommunicationCenterMessageStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseInboundCenterEmailSource } from "@/lib/communication/inbox/mail-parser";
import type { InboundFetchedMessage } from "@/lib/communication/inbox/connector/types";
import { resolveThreadRootMessageId } from "@/lib/communication/inbox/threading-service";
import { matchInboundSenderContact } from "@/lib/communication/inbox/contact-matching-service";
import { COMMUNICATION_CENTER_MAX_ATTACHMENT_BYTES } from "@/lib/communication/inbox/constants";
import { createHash } from "node:crypto";
import { CommunicationAttachmentSourceType } from "@prisma/client";
import { normalizeInternetMessageId } from "@/lib/communication/inbox/message-id";

export type IngestInboundMessageResult =
  | { kind: "INGESTED"; conversationId: string; messageId: string }
  | { kind: "DUPLICATE"; conversationId: string; messageId: string }
  | { kind: "FAILED"; retryable: boolean; code: string };

function buildSearchText(input: {
  subject: string | null;
  fromAddress: string;
  fromDisplayName: string | null;
  bodyText: string;
}): string {
  return [input.subject, input.fromDisplayName, input.fromAddress, input.bodyText]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000);
}

export async function ingestCommunicationCenterImapMessage(input: {
  tenantId: string;
  mailboxId: string;
  folderId: string;
  fetched: InboundFetchedMessage;
}): Promise<IngestInboundMessageResult> {
  try {
    const parsed = await parseInboundCenterEmailSource(input.fetched.rawSource);
    const uidValidity = BigInt(input.fetched.uidValidity);
    const imapUid = BigInt(input.fetched.uid);

    const existingByUid = await prisma.communicationCenterMessage.findFirst({
      where: {
        tenantId: input.tenantId,
        folderId: input.folderId,
        uidValidity,
        imapUid,
      },
      select: { id: true, conversationId: true },
    });
    if (existingByUid) {
      return {
        kind: "DUPLICATE",
        conversationId: existingByUid.conversationId,
        messageId: existingByUid.id,
      };
    }

    if (parsed.messageIdHeader) {
      const existingByMessageId = await prisma.communicationCenterMessage.findFirst({
        where: { tenantId: input.tenantId, messageIdHeader: parsed.messageIdHeader },
        select: { id: true, conversationId: true },
      });
      if (existingByMessageId) {
        return {
          kind: "DUPLICATE",
          conversationId: existingByMessageId.conversationId,
          messageId: existingByMessageId.id,
        };
      }
    }

    const threadRootMessageId = resolveThreadRootMessageId({
      messageIdHeader: parsed.messageIdHeader,
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
      subject: parsed.subject,
    });

    const contactMatch = await matchInboundSenderContact(input.tenantId, parsed.fromAddress);

    const result = await prisma.$transaction(async (tx) => {
      let conversation = await tx.communicationCenterConversation.findFirst({
        where: { tenantId: input.tenantId, threadRootMessageId },
      });

      if (!conversation) {
        conversation = await tx.communicationCenterConversation.create({
          data: {
            tenantId: input.tenantId,
            mailboxId: input.mailboxId,
            channel: CommunicationCenterChannel.EMAIL,
            subject: parsed.subject,
            threadRootMessageId,
            previewText: parsed.bodyText.slice(0, 280),
            lastMessageAt: parsed.receivedAt,
            contactMatchStatus: contactMatch.status,
            matchedPersonId: contactMatch.matchedPersonId,
            matchedSponsorContactId: contactMatch.matchedSponsorContactId,
            searchText: buildSearchText(parsed),
          },
        });
      } else {
        conversation = await tx.communicationCenterConversation.update({
          where: { id: conversation.id },
          data: {
            previewText: parsed.bodyText.slice(0, 280),
            lastMessageAt: parsed.receivedAt,
            searchText: buildSearchText(parsed),
          },
        });
      }

      const message = await tx.communicationCenterMessage.create({
        data: {
          tenantId: input.tenantId,
          conversationId: conversation.id,
          mailboxId: input.mailboxId,
          folderId: input.folderId,
          direction: CommunicationCenterMessageDirection.INBOUND,
          status: CommunicationCenterMessageStatus.RECEIVED,
          imapUid,
          uidValidity,
          providerMessageKey: input.fetched.providerMessageKey,
          messageIdHeader: parsed.messageIdHeader,
          inReplyTo: parsed.inReplyTo,
          references: parsed.references,
          fromAddress: parsed.fromAddress,
          fromDisplayName: parsed.fromDisplayName,
          toAddresses: parsed.toAddresses,
          ccAddresses: parsed.ccAddresses,
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          bodyHtmlSanitized: parsed.bodyHtmlSanitized,
          remoteImagesBlocked: true,
          receivedAt: parsed.receivedAt,
        },
      });

      await persistInboundAttachments(tx, {
        tenantId: input.tenantId,
        messageId: message.id,
        attachments: parsed.attachments,
      });

      return { conversationId: conversation.id, messageId: message.id };
    });

    return { kind: "INGESTED", ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "INGEST_FAILED";
    return { kind: "FAILED", retryable: true, code: message.slice(0, 120) };
  }
}

async function persistInboundAttachments(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    messageId: string;
    attachments: Array<{
      filename: string;
      contentType: string;
      sizeBytes: number;
      buffer: Buffer;
    }>;
  },
): Promise<void> {
  let sortOrder = 0;
  for (const attachment of input.attachments) {
    if (attachment.sizeBytes > COMMUNICATION_CENTER_MAX_ATTACHMENT_BYTES) continue;
    if (attachment.sizeBytes === 0) continue;

    const checksumSha256 = createHash("sha256").update(attachment.buffer).digest("hex");
    const attachmentRow = await tx.communicationAttachment.create({
      data: {
        tenantId: input.tenantId,
        originalFilename: attachment.filename,
        sanitizedFilename: attachment.filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180),
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        checksumSha256,
        sourceType: CommunicationAttachmentSourceType.INBOUND,
        storageKey: `communication-center/inbound/${input.tenantId}/${input.messageId}/${sortOrder}-${checksumSha256.slice(0, 12)}`,
        lifecycleStatus: "STAGED",
        scanStatus: "PENDING",
      },
    });

    await tx.communicationCenterMessageAttachment.create({
      data: {
        tenantId: input.tenantId,
        messageId: input.messageId,
        attachmentId: attachmentRow.id,
        sortOrder,
      },
    });
    sortOrder += 1;
  }
}

export function isOutboundSentFolderDuplicate(input: {
  tenantId: string;
  messageIdHeader: string | null;
}): boolean {
  return Boolean(normalizeInternetMessageId(input.messageIdHeader));
}
