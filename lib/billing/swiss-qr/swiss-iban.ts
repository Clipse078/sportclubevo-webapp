import type { BillingReferenceStrategy } from "@prisma/client";

export class SwissIbanError extends Error {
  readonly name = "SwissIbanError";
}

const CH_LI_IBAN_PATTERN = /^(CH|LI)\d{19}$/;

/** Normalizes IBAN/QR-IBAN: uppercase, no spaces. */
export function normalizeSwissIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function charToIbanDigit(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 48 && code <= 57) {
    return char;
  }
  if (code >= 65 && code <= 90) {
    return String(code - 55);
  }
  throw new SwissIbanError("IBAN enthält ungültige Zeichen.");
}

function ibanMod97(iban: string): number {
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    const chunk = charToIbanDigit(rearranged[i]!);
    for (const digit of chunk) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder;
}

export function validateChLiIbanShape(iban: string): string {
  const normalized = normalizeSwissIban(iban);
  if (!CH_LI_IBAN_PATTERN.test(normalized)) {
    throw new SwissIbanError("IBAN entspricht nicht dem CH/LI-Format.");
  }
  if (ibanMod97(normalized) !== 1) {
    throw new SwissIbanError("IBAN-Prüfziffer ungültig.");
  }
  return normalized;
}

/** QR-IID is digits 5–9 of the domestic account (after CH/LI + check digits). */
export function extractSwissIid(iban: string): number {
  const normalized = validateChLiIbanShape(iban);
  const iid = Number(normalized.slice(4, 9));
  if (!Number.isFinite(iid)) {
    throw new SwissIbanError("IID konnte nicht gelesen werden.");
  }
  return iid;
}

/** Swiss QR-bill: IID 30000–31999 indicates a QR-IBAN. */
export function isQrIban(iban: string): boolean {
  const iid = extractSwissIid(iban);
  return iid >= 30000 && iid <= 31999;
}

export function paymentAccountForStrategy(
  account: { iban: string; qrIban: string | null },
  strategy: BillingReferenceStrategy,
): string {
  if (strategy === "QRR") {
    if (!account.qrIban) {
      throw new SwissIbanError("QR-IBAN fehlt für QRR-Referenzstrategie.");
    }
    const qr = validateChLiIbanShape(account.qrIban);
    if (!isQrIban(qr)) {
      throw new SwissIbanError("Konto ist keine gültige QR-IBAN.");
    }
    return qr;
  }
  return validateChLiIbanShape(account.iban);
}
