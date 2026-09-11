import type { BillingReferenceStrategy } from "@prisma/client";
import type { SwissStructuredAddress } from "./swiss-structured-address";
import { validateSwissStructuredAddress } from "./swiss-structured-address";

export class SwissSpcPayloadError extends Error {
  readonly name = "SwissSpcPayloadError";
}

export type SwissSpcPayloadInput = {
  creditorAccount: string;
  creditor: SwissStructuredAddress;
  amountMinor: number;
  currency: string;
  debtor: SwissStructuredAddress;
  referenceType: BillingReferenceStrategy;
  reference: string | null;
  additionalInformation?: string | null;
};

const CRLF = "\r\n";

function formatAmount(amountMinor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new SwissSpcPayloadError("Betrag muss eine positive Ganzzahl (Rappen) sein.");
  }
  const major = amountMinor / 100;
  return major.toFixed(2);
}

function structuredAddressLines(address: SwissStructuredAddress): string[] {
  const validated = validateSwissStructuredAddress(address, "Adresse");
  return [
    "S",
    validated.name,
    validated.street,
    validated.houseNumber ?? "",
    validated.postalCode,
    validated.city,
    validated.countryCode,
  ];
}

function emptyUltimateCreditorLines(): string[] {
  return ["", "", "", "", "", "", ""];
}

export function buildSwissSpcPayload(input: SwissSpcPayloadInput): string {
  const currency = input.currency.trim().toUpperCase();
  if (currency !== "CHF") {
    throw new SwissSpcPayloadError("Nur CHF wird für Swiss QR unterstützt.");
  }

  const referenceType = input.referenceType;
  let referenceValue = "";
  if (referenceType === "QRR" || referenceType === "SCOR") {
    if (!input.reference?.trim()) {
      throw new SwissSpcPayloadError("Referenz fehlt.");
    }
    referenceValue = input.reference.replace(/\s+/g, "");
  }

  const lines: string[] = [
    "SPC",
    "0200",
    "1",
    input.creditorAccount.replace(/\s+/g, "").toUpperCase(),
    ...structuredAddressLines(input.creditor),
    ...emptyUltimateCreditorLines(),
    formatAmount(input.amountMinor),
    currency,
    ...structuredAddressLines(input.debtor),
    referenceType,
    referenceValue,
    input.additionalInformation?.trim() ?? "",
    "",
    "EPD",
  ];

  return lines.join(CRLF);
}
