import { simpleParser, type AddressObject } from "mailparser";
import {
  normalizeInternetMessageId,
} from "./billing-inbound-message-id";
import type { ParsedInboundBillingEmail } from "./billing-inbound-types";

function flattenAddresses(addresses: AddressObject | AddressObject[] | undefined): string[] {
  if (!addresses) return [];
  const list = Array.isArray(addresses) ? addresses : [addresses];
  const result: string[] = [];
  for (const entry of list) {
    for (const addr of entry.value ?? []) {
      const formatted = addr.address?.trim();
      if (formatted) result.push(formatted);
    }
  }
  return result;
}

function extractSender(from: AddressObject | undefined): string | null {
  const address = from?.value?.[0]?.address?.trim();
  return address ?? null;
}

export async function parseInboundBillingEmailSource(
  source: Buffer,
  receivedAtFallback: Date = new Date(),
): Promise<ParsedInboundBillingEmail> {
  const parsed = await simpleParser(source);
  const senderAddress = extractSender(parsed.from);
  if (!senderAddress) {
    throw new Error("Inbound billing email is missing From address.");
  }

  const receivedAt =
    parsed.date instanceof Date && !Number.isNaN(parsed.date.getTime())
      ? parsed.date
      : receivedAtFallback;

  const attachmentCount = Array.isArray(parsed.attachments)
    ? parsed.attachments.length
    : 0;

  return {
    senderAddress,
    toAddresses: flattenAddresses(parsed.to),
    ccAddresses: flattenAddresses(parsed.cc),
    subject: parsed.subject?.trim() || null,
    textBody: typeof parsed.text === "string" ? parsed.text : null,
    htmlBody: typeof parsed.html === "string" ? parsed.html : null,
    receivedAt,
    internetMessageId: normalizeInternetMessageId(parsed.messageId ?? null),
    inReplyTo: normalizeInternetMessageId(parsed.inReplyTo ?? null),
    referencesHeader:
      typeof parsed.references === "string"
        ? parsed.references.trim() || null
        : Array.isArray(parsed.references)
          ? parsed.references.join(" ")
          : null,
    hasAttachments: attachmentCount > 0,
  };
}
