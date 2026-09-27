import { simpleParser, type AddressObject } from "mailparser";
import { normalizeInternetMessageId, normalizeEmailAddress } from "@/lib/communication/inbox/message-id";
import { sanitizeInboundEmailHtml, plainTextFallback } from "@/lib/communication/inbox/html-sanitizer";

export type ParsedInboundCenterEmail = {
  messageIdHeader: string | null;
  inReplyTo: string | null;
  references: string[];
  fromAddress: string;
  fromDisplayName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string | null;
  bodyText: string;
  bodyHtmlSanitized: string | null;
  receivedAt: Date;
  attachments: Array<{
    filename: string;
    contentType: string;
    sizeBytes: number;
    buffer: Buffer;
  }>;
};

function flattenAddresses(addresses: AddressObject | AddressObject[] | undefined): string[] {
  if (!addresses) return [];
  const list = Array.isArray(addresses) ? addresses : [addresses];
  const result: string[] = [];
  for (const entry of list) {
    for (const addr of entry.value ?? []) {
      const formatted = normalizeEmailAddress(addr.address);
      if (formatted) result.push(formatted);
    }
  }
  return result;
}

function extractFrom(from: AddressObject | undefined): { address: string; name: string | null } | null {
  const first = from?.value?.[0];
  const address = normalizeEmailAddress(first?.address);
  if (!address) return null;
  const name = first?.name?.trim() || null;
  return { address, name };
}

export async function parseInboundCenterEmailSource(
  source: Buffer,
  receivedAtFallback: Date = new Date(),
): Promise<ParsedInboundCenterEmail> {
  const parsed = await simpleParser(source);
  const from = extractFrom(parsed.from);
  if (!from) {
    throw new Error("Inbound email is missing From address.");
  }

  const receivedAt =
    parsed.date instanceof Date && !Number.isNaN(parsed.date.getTime())
      ? parsed.date
      : receivedAtFallback;

  const referencesRaw = parsed.references;
  const references: string[] = [];
  if (Array.isArray(referencesRaw)) {
    for (const ref of referencesRaw) {
      const normalized = normalizeInternetMessageId(String(ref));
      if (normalized) references.push(normalized);
    }
  } else if (typeof referencesRaw === "string") {
    for (const part of referencesRaw.split(/\s+/)) {
      const normalized = normalizeInternetMessageId(part);
      if (normalized) references.push(normalized);
    }
  }

  const bodyText = plainTextFallback(parsed.text ?? null, parsed.html ? String(parsed.html) : null);
  const bodyHtmlSanitized = sanitizeInboundEmailHtml(
    typeof parsed.html === "string" ? parsed.html : null,
  );

  const attachments = (parsed.attachments ?? [])
    .filter((part) => part.related !== true)
    .map((part) => {
      const content = part.content;
      const buffer =
        content instanceof Buffer
          ? content
          : typeof content === "string"
            ? Buffer.from(content)
            : Buffer.alloc(0);
      return {
        filename: part.filename?.trim() || "anhang.bin",
        contentType: part.contentType?.split(";")[0]?.trim() || "application/octet-stream",
        sizeBytes: buffer.length,
        buffer,
      };
    });

  return {
    messageIdHeader: normalizeInternetMessageId(parsed.messageId ?? null),
    inReplyTo: normalizeInternetMessageId(parsed.inReplyTo ?? null),
    references,
    fromAddress: from.address,
    fromDisplayName: from.name,
    toAddresses: flattenAddresses(parsed.to),
    ccAddresses: flattenAddresses(parsed.cc),
    subject: parsed.subject?.trim() || null,
    bodyText,
    bodyHtmlSanitized,
    receivedAt,
    attachments,
  };
}
