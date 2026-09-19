import { simpleParser, type AddressObject, type Attachment } from "mailparser";
import type { ParsedBillingEmailAttachment } from "@/lib/billing/billing-communication/billing-communication-attachment-service";
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

function mapMailparserAttachment(part: Attachment): ParsedBillingEmailAttachment {
  const content = part.content;
  const buffer =
    content instanceof Buffer
      ? new Uint8Array(content)
      : typeof content === "string"
        ? new Uint8Array(Buffer.from(content))
        : new Uint8Array();
  const contentDisposition =
    typeof part.contentDisposition === "string" ? part.contentDisposition : null;
  const related = part.related === true;
  const cid =
    typeof part.cid === "string"
      ? part.cid.replace(/^<|>$/g, "").trim() || null
      : null;
  const isInline =
    related ||
    contentDisposition?.toLowerCase().includes("inline") === true ||
    Boolean(cid);
  return {
    filename: part.filename?.trim() || "anhang.bin",
    contentType: part.contentType?.split(";")[0]?.trim() || "application/octet-stream",
    buffer,
    contentDisposition,
    providerContentId: cid,
    isInline,
  };
}

export async function parseInboundBillingEmailAttachments(
  source: Buffer,
): Promise<ParsedBillingEmailAttachment[]> {
  const parsed = await simpleParser(source);
  if (!Array.isArray(parsed.attachments)) return [];
  return parsed.attachments.map(mapMailparserAttachment);
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
