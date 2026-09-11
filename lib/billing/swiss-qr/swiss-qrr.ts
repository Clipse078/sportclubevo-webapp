import { appendModulo10CheckDigit } from "./swiss-modulo10";

export class SwissQrrError extends Error {
  readonly name = "SwissQrrError";
}

const BODY_LENGTH = 26;
const ENTITY_NS_LEN = 5;
const YEAR_LEN = 4;
const SEQ_LEN = 6;

export type SwissQrrInvoiceIdentity = {
  invoiceId: string;
  legalEntityId: string;
  invoiceNumber: string;
};

function assertValidInvoiceIdentity(identity: SwissQrrInvoiceIdentity): {
  year: number;
  sequence: number;
} {
  const invoiceId = identity.invoiceId?.trim();
  const legalEntityId = identity.legalEntityId?.trim();
  const invoiceNumber = identity.invoiceNumber?.trim();
  if (!invoiceId || !legalEntityId || !invoiceNumber) {
    throw new SwissQrrError("Rechnungsidentität unvollständig.");
  }
  const match = /^(\d{4})-(\d{6})$/.exec(invoiceNumber);
  if (!match) {
    throw new SwissQrrError("Rechnungsnummer hat ungültiges Format (YYYY-NNNNNN).");
  }
  const year = Number(match[1]);
  const sequence = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(sequence)) {
    throw new SwissQrrError("Rechnungsnummer konnte nicht geparst werden.");
  }
  return { year, sequence };
}

function stableNumericHash(input: string, width: number): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
    hash >>>= 0;
  }
  const mod = 10 ** width;
  return String(hash % mod).padStart(width, "0");
}

function legalEntityNamespace(legalEntityId: string): string {
  return stableNumericHash(`le:${legalEntityId}`, ENTITY_NS_LEN);
}

function validateOptionalPrefix(prefix: string | null | undefined): string {
  if (prefix == null || prefix === "") {
    return "";
  }
  const trimmed = prefix.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new SwissQrrError("QRR-Präfix muss numerisch sein.");
  }
  if (trimmed.length >= BODY_LENGTH) {
    throw new SwissQrrError("QRR-Präfix ist zu lang für den 26-stelligen Payload.");
  }
  return trimmed;
}

/**
 * Deterministic 26-digit QRR body layout (before Modulo-10):
 * [optional numeric prefix][entityNs:5][year:4][sequence:6][invoiceTail:*]
 * invoiceTail fills remaining digits from invoiceId hash (collision guard).
 */
export function buildQrrPayload26(
  identity: SwissQrrInvoiceIdentity,
  qrrReferencePrefix?: string | null,
): string {
  const prefix = validateOptionalPrefix(qrrReferencePrefix);
  const { year, sequence } = assertValidInvoiceIdentity(identity);

  const fixedCoreLen = ENTITY_NS_LEN + YEAR_LEN + SEQ_LEN;
  const tailLen = BODY_LENGTH - prefix.length - fixedCoreLen;
  if (tailLen < 1) {
    throw new SwissQrrError("QRR-Präfix lässt keinen Platz für den Rechnungsblock.");
  }

  const entityNs = legalEntityNamespace(identity.legalEntityId);
  const yearPart = String(year).padStart(YEAR_LEN, "0");
  const seqPart = String(sequence).padStart(SEQ_LEN, "0");
  const tail = stableNumericHash(`inv:${identity.invoiceId}`, tailLen);

  const body = `${prefix}${entityNs}${yearPart}${seqPart}${tail}`;
  if (body.length !== BODY_LENGTH || !/^\d{26}$/.test(body)) {
    throw new SwissQrrError("QRR-Payload konnte nicht korrekt aufgebaut werden.");
  }
  return body;
}

/** Full 27-digit QRR reference (26-digit payload + Modulo-10 check digit). */
export function generateQrrReference(
  identity: SwissQrrInvoiceIdentity,
  qrrReferencePrefix?: string | null,
): string {
  const body = buildQrrPayload26(identity, qrrReferencePrefix);
  return appendModulo10CheckDigit(body);
}

/** Groups a 27-digit QRR for display (5-digit groups). */
export function formatQrrReferenceDisplay(qrr: string): string {
  const normalized = qrr.replace(/\s+/g, "");
  if (!/^\d{27}$/.test(normalized)) {
    return qrr;
  }
  const parts: string[] = [];
  for (let i = 0; i < normalized.length; i += 5) {
    parts.push(normalized.slice(i, i + 5));
  }
  return parts.join(" ");
}
