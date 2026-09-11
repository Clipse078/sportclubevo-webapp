import type { BillingReferenceStrategy } from "@prisma/client";
import { isQrIban, validateChLiIbanShape } from "./swiss-iban";

export class SwissReferenceCompatError extends Error {
  readonly name = "SwissReferenceCompatError";
}

export type SwissReferenceCompatInput = {
  iban: string;
  qrIban: string | null;
  referenceStrategy: BillingReferenceStrategy;
};

/**
 * Authoritative QR-bill reference / account compatibility (Switzerland).
 * QR-IBAN → QRR only; normal IBAN → SCOR or NON; cross-combinations fail.
 */
export function assertSwissReferenceAccountCompatibility(
  input: SwissReferenceCompatInput,
): void {
  const strategy = input.referenceStrategy;
  const iban = validateChLiIbanShape(input.iban);

  if (strategy === "QRR") {
    if (!input.qrIban) {
      throw new SwissReferenceCompatError("QRR erfordert eine QR-IBAN.");
    }
    const qr = validateChLiIbanShape(input.qrIban);
    if (!isQrIban(qr)) {
      throw new SwissReferenceCompatError("QRR erfordert eine gültige QR-IBAN.");
    }
    if (!isQrIban(iban) && iban !== qr) {
      // normal IBAN may differ from QR-IBAN; payment uses QR-IBAN for QRR
      return;
    }
    return;
  }

  if (isQrIban(iban)) {
    throw new SwissReferenceCompatError("QR-IBAN ist nur mit QRR zulässig.");
  }

  if (input.qrIban) {
    const qr = validateChLiIbanShape(input.qrIban);
    if (isQrIban(qr)) {
      throw new SwissReferenceCompatError(
        "QR-IBAN ist nur mit QRR-Referenzstrategie zulässig.",
      );
    }
  }

  if (strategy === "SCOR" || strategy === "NON") {
    return;
  }

  throw new SwissReferenceCompatError("Unbekannte Referenzstrategie.");
}

export function isSwissReferenceAccountCompatible(input: SwissReferenceCompatInput): boolean {
  try {
    assertSwissReferenceAccountCompatibility(input);
    return true;
  } catch {
    return false;
  }
}
