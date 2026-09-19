import { PLATFORM_INVOICE_EMAIL_BCC } from "@/lib/billing/invoice-delivery/billing-invoice-email-policy";
import { extractEmailAddress } from "./billing-communication-recipients";

export type ReplyContextCommunication = {
  direction: "INBOUND" | "OUTBOUND";
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
};

export function buildReplySubject(originalSubject: string | null | undefined): string {
  const base = (originalSubject ?? "").trim();
  if (!base) {
    return "Re:";
  }
  const rePrefix = /^re:\s*/i;
  if (rePrefix.test(base)) {
    return base;
  }
  return `Re: ${base}`;
}

export function collectInternalBillingEmailAddresses(input: {
  fromAddress: string;
  replyToAddress?: string | null;
}): Set<string> {
  const internal = new Set<string>();
  internal.add(extractEmailAddress(input.fromAddress));
  if (input.replyToAddress) {
    internal.add(extractEmailAddress(input.replyToAddress));
  }
  internal.add(extractEmailAddress(PLATFORM_INVOICE_EMAIL_BCC));
  return internal;
}

function isExternalRecipient(address: string, internal: Set<string>): boolean {
  return !internal.has(extractEmailAddress(address));
}

export function deriveReplyRecipient(
  communication: ReplyContextCommunication,
  internal: Set<string>,
): string | null {
  if (communication.direction === "INBOUND") {
    const candidate = communication.fromAddress.trim();
    if (!candidate || !isExternalRecipient(candidate, internal)) {
      return null;
    }
    return extractEmailAddress(candidate);
  }

  for (const raw of communication.toAddresses) {
    if (raw.trim() && isExternalRecipient(raw, internal)) {
      return extractEmailAddress(raw);
    }
  }
  for (const raw of communication.ccAddresses) {
    if (raw.trim() && isExternalRecipient(raw, internal)) {
      return extractEmailAddress(raw);
    }
  }
  return null;
}

export function canReplyToCommunication(
  communication: ReplyContextCommunication,
  internal: Set<string>,
): boolean {
  return deriveReplyRecipient(communication, internal) !== null;
}

export function buildEmailThreadingHeaders(parent: {
  internetMessageId: string | null;
  referencesHeader: string | null;
}): { inReplyTo: string | null; referencesHeader: string | null } {
  const parentId = parent.internetMessageId?.trim();
  if (!parentId) {
    return { inReplyTo: null, referencesHeader: null };
  }
  const prior = parent.referencesHeader?.trim();
  const referencesHeader = prior ? `${prior} ${parentId}`.trim() : parentId;
  return { inReplyTo: parentId, referencesHeader };
}
