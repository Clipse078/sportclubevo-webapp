import type { Prisma } from "@prisma/client";

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
  /** Secure inbox download (EVO-04); metadata only until authorized route exists. */
  downloadAvailable: boolean;
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
  return value.toISOString();
}

function jsonAddressList(value: Prisma.JsonValue | null | undefined): string[] | null {
  if (!Array.isArray(value)) return null;
  const addresses = value.filter((entry): entry is string => typeof entry === "string");
  return addresses.length > 0 ? addresses : null;
}

function mapMessageAttachment(
  link: CommunicationCenterConversationDetailRecord["messages"][number]["attachmentLinks"][number],
): CommunicationCenterConversationDetailClientMessageAttachment {
  const attachment = link.attachment;
  return {
    id: attachment.id,
    filename: attachment.sanitizedFilename,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    // Authorized center-message download route is EVO-04; metadata only until then.
    downloadAvailable: false,
  };
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
    attachments: message.attachmentLinks.map(mapMessageAttachment),
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
