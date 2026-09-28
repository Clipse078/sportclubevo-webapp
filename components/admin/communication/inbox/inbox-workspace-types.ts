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
  matchedPersonId?: string | null;
};

export type InboxConversationMessage = {
  id: string;
  direction: string;
  status: string;
  fromAddress: string | null;
  fromDisplayName?: string | null;
  bodyText: string | null;
  bodyHtmlSanitized: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  deliveryError: string | null;
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

export const INBOX_QUICK_FILTERS = [
  { id: "ALL", label: "Alle" },
  { id: "UNREAD", label: "Ungelesen" },
  { id: "ASSIGNED_TO_ME", label: "Mir zugewiesen" },
  { id: "UNASSIGNED", label: "Nicht zugewiesen" },
  { id: "EMAIL", label: "E-Mail" },
] as const;

export type InboxQuickFilterId = (typeof INBOX_QUICK_FILTERS)[number]["id"];
