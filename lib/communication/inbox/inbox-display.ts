type PersonLike = {
  firstName: string;
  lastName: string;
  displayName?: string | null;
};

type InboundAddressLike = {
  fromDisplayName: string | null;
  fromAddress: string | null;
};

export function formatPersonDisplayName(person: PersonLike): string {
  const trimmedDisplay = person.displayName?.trim();
  if (trimmedDisplay) return trimmedDisplay;
  return `${person.firstName} ${person.lastName}`.trim();
}

export function formatUserDisplayName(user: PersonLike): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function resolveInboxParticipantLabel(input: {
  matchedPerson: PersonLike | null;
  matchedSponsorContact: PersonLike | null;
  latestInbound: InboundAddressLike | null;
}): string {
  if (input.matchedPerson) {
    return formatPersonDisplayName(input.matchedPerson);
  }
  if (input.matchedSponsorContact) {
    return formatPersonDisplayName(input.matchedSponsorContact);
  }
  const inbound = input.latestInbound;
  if (inbound?.fromDisplayName?.trim()) {
    return inbound.fromDisplayName.trim();
  }
  if (inbound?.fromAddress?.trim()) {
    return inbound.fromAddress.trim();
  }
  return "Unbekannter Absender";
}

export function resolveInboxParticipantEmail(input: {
  latestInbound: InboundAddressLike | null;
}): string | null {
  const email = input.latestInbound?.fromAddress?.trim();
  return email || null;
}

export function formatConversationTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageTimestamp(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export const INBOX_CONVERSATION_STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen",
  RESOLVED: "Erledigt",
};

export const INBOX_MAILBOX_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktiv",
  DISCONNECTED: "Getrennt",
  ERROR: "Fehler",
};

export function inboxMailboxStatusLabel(status: string): string {
  return INBOX_MAILBOX_STATUS_LABEL[status] ?? status;
}

export const INBOX_CONTEXT_KIND_LABEL: Record<string, string> = {
  PERSON: "Person",
  TEAM: "Team",
  ORG_UNIT: "Organisationseinheit",
  SPONSOR_CONTACT: "Sponsor-Kontakt",
  SPONSOR_ORGANISATION: "Sponsor",
  EVENT: "Event",
  PLATFORM_COMMUNICATION: "Mitteilung",
};
