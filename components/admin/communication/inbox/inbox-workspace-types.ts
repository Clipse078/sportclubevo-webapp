import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";

export type InboxConversationListItem = {
  id: string;
  subject: string | null;
  previewText: string | null;
  status: string;
  lastMessageAt: string;
  assignedToUserId: string | null;
  assignedToDisplayName: string | null;
  participantLabel: string;
  participantEmail: string | null;
  unread: boolean;
  starred: boolean;
  mailboxOrganization: string;
  matchedPersonId?: string | null;
};

export type InboxConversationMessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadAvailable: boolean;
  previewAvailable?: boolean;
  unavailableReason?: string;
};

export type InboxConversationMessage = {
  id: string;
  direction: string;
  status: string;
  fromAddress: string | null;
  fromDisplayName?: string | null;
  toAddresses?: string[] | null;
  ccAddresses?: string[] | null;
  subject?: string | null;
  bodyText: string | null;
  bodyHtmlSanitized: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  deliveryError: string | null;
  attachments?: InboxConversationMessageAttachment[];
};

export type InboxContextLink = {
  id: string;
  contextKind: string;
  contextId: string;
};

export type InboxConversationDetail = {
  id: string;
  subject: string | null;
  status: string;
  channel?: string;
  repliesAllowed?: boolean;
  mailboxOrganization: string;
  assignedToUserId: string | null;
  matchedPerson?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
  } | null;
  matchedSponsorContact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  contextLinks?: InboxContextLink[];
  messages: InboxConversationMessage[];
};

export type CommunicationInboxCapabilities = {
  currentUserId: string;
  canReply: boolean;
  canManage: boolean;
  canSettings: boolean;
};

export const INBOX_MAILBOX_NAV_ITEMS: { id: InboxMailboxView; label: string }[] = [
  { id: "INBOX", label: "Posteingang" },
  { id: "STARRED", label: "Markiert" },
  { id: "ARCHIVE", label: "Archiv" },
  { id: "TRASH", label: "Papierkorb" },
];

export const INBOX_QUICK_FILTERS = [
  { id: "ALL", label: "Alle" },
  { id: "UNREAD", label: "Ungelesen" },
  { id: "ASSIGNED_TO_ME", label: "Mir zugewiesen" },
  { id: "UNASSIGNED", label: "Nicht zugewiesen" },
  { id: "EMAIL", label: "E-Mail" },
] as const;

export type InboxQuickFilterId = (typeof INBOX_QUICK_FILTERS)[number]["id"];
