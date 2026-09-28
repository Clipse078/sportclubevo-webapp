import type { Prisma } from "@prisma/client";
import { toPublicCommunicationAttachment } from "@/lib/communication/attachment-public-dto";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";

/** Prisma graph loaded by `getCommunicationCenterConversationDetail`. */
export type CommunicationCenterConversationDetailRecord =
  Prisma.CommunicationCenterConversationGetPayload<{
    include: {
      messages: {
        include: {
          attachmentLinks: {
            include: { attachment: true };
          };
        };
      };
      contextLinks: true;
      readStates: true;
      matchedPerson: {
        select: { id: true; firstName: true; lastName: true; displayName: true; email: true };
      };
      matchedSponsorContact: {
        select: { id: true; firstName: true; lastName: true; email: true };
      };
      assignedToUser: {
        select: { id: true; firstName: true; lastName: true };
      };
    };
  }>;

export type CommunicationCenterConversationDetailClientMessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadAvailable: boolean;
  previewAvailable: boolean;
  unavailableReason?: string;
};

export type CommunicationCenterConversationDetailClientMessage = {
  id: string;
  direction: string;
  status: string;
  fromAddress: string | null;
  fromDisplayName: string | null;
  toAddresses: string[] | null;
  ccAddresses: string[] | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtmlSanitized: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  deliveryError: string | null;
  attachments: CommunicationCenterConversationDetailClientMessageAttachment[];
};

export type CommunicationCenterConversationDetailClient = {
  id: string;
  channel: string;
  subject: string | null;
  status: string;
  mailboxOrganization: string;
  repliesAllowed: boolean;
  assignedToUserId: string | null;
  matchedPerson: CommunicationCenterConversationDetailRecord["matchedPerson"];
  matchedSponsorContact: CommunicationCenterConversationDetailRecord["matchedSponsorContact"];
  assignedToUser: CommunicationCenterConversationDetailRecord["assignedToUser"];
  contextLinks: Array<{ id: string; contextKind: string; contextId: string }>;
  messages: CommunicationCenterConversationDetailClientMessage[];
};

function toIsoStringOrNull(value: Date | null | undefined): string | null {
  if (value == null) return null;
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

function jsonAddressList(value: Prisma.JsonValue | null | undefined): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const addresses: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed) addresses.push(trimmed);
      continue;
    }
    if (entry && typeof entry === "object" && "address" in entry) {
      const address = (entry as { address?: unknown }).address;
      if (typeof address === "string" && address.trim()) {
        addresses.push(address.trim());
      }
    }
  }
  return addresses.length > 0 ? addresses : null;
}

function mapMessageAttachment(
  link: CommunicationCenterConversationDetailRecord["messages"][number]["attachmentLinks"][number],
): CommunicationCenterConversationDetailClientMessageAttachment | null {
  const attachment = link.attachment;
  if (!attachment) return null;
  const storageKey = attachment.storageKey ?? "";
  const legacyInboundPlaceholder = storageKey.startsWith("communication-center/inbound/");
  const dto = toPublicCommunicationAttachment({
    id: attachment.id,
    filename: attachment.sanitizedFilename,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    lifecycleStatus: attachment.lifecycleStatus,
    scanStatus: attachment.scanStatus,
    bytesAvailable: !legacyInboundPlaceholder,
  });
  return {
    id: dto.id,
    filename: dto.filename,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    downloadAvailable: dto.downloadAvailable,
    previewAvailable: dto.previewAvailable,
    unavailableReason: dto.unavailableReason,
  };
}

function mapMessageAttachments(
  links: CommunicationCenterConversationDetailRecord["messages"][number]["attachmentLinks"],
): CommunicationCenterConversationDetailClientMessageAttachment[] {
  const attachments: CommunicationCenterConversationDetailClientMessageAttachment[] = [];
  for (const link of links) {
    const mapped = mapMessageAttachment(link);
    if (mapped) attachments.push(mapped);
  }
  return attachments;
}

function mapMessage(
  message: CommunicationCenterConversationDetailRecord["messages"][number],
): CommunicationCenterConversationDetailClientMessage {
  return {
    id: message.id,
    direction: message.direction,
    status: message.status,
    fromAddress: message.fromAddress,
    fromDisplayName: message.fromDisplayName,
    toAddresses: jsonAddressList(message.toAddresses),
    ccAddresses: jsonAddressList(message.ccAddresses),
    subject: message.subject,
    bodyText: message.bodyText,
    bodyHtmlSanitized: message.bodyHtmlSanitized,
    sentAt: toIsoStringOrNull(message.sentAt),
    receivedAt: toIsoStringOrNull(message.receivedAt),
    deliveryError: message.deliveryError,
    attachments: mapMessageAttachments(message.attachmentLinks),
  };
}

/**
 * Maps an authorized Communication Center conversation graph to a JSON-safe client DTO.
 * No raw Prisma values cross the API boundary.
 */
export function mapCommunicationCenterConversationDetailForClient(
  conversation: CommunicationCenterConversationDetailRecord,
): CommunicationCenterConversationDetailClient {
  return {
    id: conversation.id,
    channel: conversation.channel,
    subject: conversation.subject,
    status: conversation.status,
    mailboxOrganization: conversation.mailboxOrganization,
    repliesAllowed: conversation.repliesAllowed,
    assignedToUserId: conversation.assignedToUserId,
    matchedPerson: conversation.matchedPerson,
    matchedSponsorContact: conversation.matchedSponsorContact,
    assignedToUser: conversation.assignedToUser,
    contextLinks: conversation.contextLinks.map((link) => ({
      id: link.id,
      contextKind: link.contextKind,
      contextId: link.contextId,
    })),
    messages: conversation.messages.map(mapMessage),
  };
}

/**
 * Maps and verifies the detail payload is JSON-serializable before it crosses the HTTP boundary.
 * Raw Prisma graphs (BigInt IMAP fields, storage keys, etc.) must never be passed to NextResponse.json.
 */
export function serializeCommunicationCenterConversationDetailForApi(
  conversation: CommunicationCenterConversationDetailRecord,
): { conversation: CommunicationCenterConversationDetailClient } {
  const clientConversation = mapCommunicationCenterConversationDetailForClient(conversation);
  try {
    JSON.stringify({ conversation: clientConversation });
  } catch {
    throw new CommunicationCenterError(
      "DETAIL_SERIALIZATION_FAILED",
      "Konversationsdetail konnte nicht serialisiert werden.",
    );
  }
  return { conversation: clientConversation };
}
