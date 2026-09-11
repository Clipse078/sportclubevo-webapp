export class SwissScorError extends Error {
  readonly name = "SwissScorError";
}

const SCOR_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function mod97Remainder(input: string): number {
  let remainder = 0;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      remainder = (remainder * 10 + (code - 48)) % 97;
    } else if (code >= 65 && code <= 90) {
      const value = code - 55;
      remainder = (remainder * 100 + value) % 97;
    } else {
      throw new SwissScorError("Ungültiges Zeichen in SCOR-Referenz.");
    }
  }
  return remainder;
}

function computeRfCheckDigits(referenceBody: string): string {
  const rearranged = `${referenceBody}RF00`;
  const remainder = mod97Remainder(rearranged);
  const check = 98 - remainder;
  return String(check).padStart(2, "0");
}

function normalizeScorReference(reference: string): string {
  const normalized = reference.replace(/\s+/g, "").toUpperCase();
  if (!normalized.startsWith("RF")) {
    throw new SwissScorError("SCOR-Referenz muss mit RF beginnen.");
  }
  if (normalized.length < 5 || normalized.length > 25) {
    throw new SwissScorError("SCOR-Referenz hat ungültige Länge.");
  }
  const body = normalized.slice(4);
  if (!/^[A-Z0-9]+$/.test(body)) {
    throw new SwissScorError("SCOR-Referenz enthält ungültige Zeichen.");
  }
  const checkDigits = normalized.slice(2, 4);
  if (!/^\d{2}$/.test(checkDigits)) {
    throw new SwissScorError("SCOR-Prüfziffern ungültig.");
  }
  const expected = computeRfCheckDigits(body);
  if (checkDigits !== expected) {
    throw new SwissScorError("SCOR-Prüfziffern stimmen nicht.");
  }
  return normalized;
}

export function validateScorReference(reference: string): string {
  return normalizeScorReference(reference);
}

export type SwissScorInvoiceIdentity = {
  invoiceId: string;
  invoiceNumber: string;
  legalEntityId: string;
};

function invoiceToScorBody(identity: SwissScorInvoiceIdentity): string {
  const compactNumber = identity.invoiceNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const tail = identity.invoiceId.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(-8);
  const raw = `SCE${compactNumber}${tail}`;
  const filtered = raw
    .split("")
    .filter((c) => SCOR_CHARSET.includes(c))
    .join("");
  if (filtered.length < 5) {
    throw new SwissScorError("SCOR-Referenzblock zu kurz.");
  }
  return filtered.slice(0, 21);
}

/** Deterministic ISO 11649 creditor reference (RF…) from finalized invoice identity. */
export function generateScorReference(identity: SwissScorInvoiceIdentity): string {
  const body = invoiceToScorBody(identity);
  const check = computeRfCheckDigits(body);
  const reference = `RF${check}${body}`;
  return validateScorReference(reference);
}

export function formatScorReferenceDisplay(reference: string): string {
  const normalized = validateScorReference(reference);
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}
