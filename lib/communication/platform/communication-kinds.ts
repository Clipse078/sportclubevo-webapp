/**
 * SCE-COMM-01 — canonical communication type taxonomy (programme contract).
 *
 * Distinct kinds share delivery/audience infrastructure but may carry
 * type-specific payloads in future packages (poll options, request capacity, …).
 */

export const COMMUNICATION_KINDS = [
  "MESSAGE",
  "ANNOUNCEMENT",
  "ALERT",
  "POLL",
  "DATE_POLL",
  "REQUEST",
  "CAMPAIGN",
] as const;

export type CommunicationKind = (typeof COMMUNICATION_KINDS)[number];

export function isCommunicationKind(value: string): value is CommunicationKind {
  return (COMMUNICATION_KINDS as readonly string[]).includes(value);
}

/** Conversational vs structured one-to-many vs urgent broadcast semantics. */
export const COMMUNICATION_KIND_SEMANTICS: Record<
  CommunicationKind,
  {
    conversational: boolean;
    supportsThreads: boolean;
    defaultAckRequired: boolean;
    defaultReplyAllowed: boolean;
  }
> = {
  MESSAGE: {
    conversational: true,
    supportsThreads: true,
    defaultAckRequired: false,
    defaultReplyAllowed: true,
  },
  ANNOUNCEMENT: {
    conversational: false,
    supportsThreads: true,
    defaultAckRequired: false,
    defaultReplyAllowed: false,
  },
  ALERT: {
    conversational: false,
    supportsThreads: false,
    defaultAckRequired: true,
    defaultReplyAllowed: false,
  },
  POLL: {
    conversational: false,
    supportsThreads: true,
    defaultAckRequired: false,
    defaultReplyAllowed: false,
  },
  DATE_POLL: {
    conversational: false,
    supportsThreads: true,
    defaultAckRequired: false,
    defaultReplyAllowed: false,
  },
  REQUEST: {
    conversational: false,
    supportsThreads: true,
    defaultAckRequired: false,
    defaultReplyAllowed: true,
  },
  CAMPAIGN: {
    conversational: false,
    supportsThreads: false,
    defaultAckRequired: false,
    defaultReplyAllowed: false,
  },
};
