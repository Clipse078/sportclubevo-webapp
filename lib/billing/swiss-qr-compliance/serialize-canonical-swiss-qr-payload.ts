import type { BillingReferenceStrategy } from "@prisma/client";
import type { SwissStructuredAddress } from "../swiss-qr/swiss-structured-address";
import { validateSwissStructuredAddress } from "../swiss-qr/swiss-structured-address";
import {
  SIX_QR_CODING_TYPE,
  SIX_QR_PAYLOAD_TRAILER,
  SIX_QR_PAYLOAD_VERSION,
} from "./six-qr-bill-standard";
import { SWISS_QR_COMPLIANCE_CODES } from "./swiss-qr-compliance-codes";
import { SwissQrComplianceError } from "./swiss-qr-compliance-error";
import type { SwissQrBillData } from "./swiss-qr-bill-data";
import { resolveCreditorPaymentAccount } from "./validate-swiss-qr-bill";

const CRLF = "\r\n";

export type CanonicalSwissQrPayloadInput = {
  creditorAccount: string;
  creditor: SwissStructuredAddress;
  amountMinor: number;
  currency: string;
  debtor: SwissStructuredAddress;
  referenceType: BillingReferenceStrategy;
  reference: string | null;
  unstructuredMessage?: string | null;
  billingInformation?: string | null;
};

function formatAmount(amountMinor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.INVALID_AMOUNT,
      "Betrag muss eine positive Ganzzahl (Rappen) sein.",
      "amountMinor",
    );
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

/**
 * Single canonical SIX Swiss QR payload serializer (CRLF, UTF-8 text).
 * SIX element order: Ustrd → EPD → optional StrdBkgInf (status A omitted when empty).
 */
export function serializeCanonicalSwissQrPayload(input: CanonicalSwissQrPayloadInput): string {
  const currency = input.currency.trim().toUpperCase();
  const referenceType = input.referenceType;
  let referenceValue = "";
  if (referenceType === "QRR" || referenceType === "SCOR") {
    if (!input.reference?.trim()) {
      throw new SwissQrComplianceError(
        SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
        "Referenz fehlt.",
        "reference",
      );
    }
    referenceValue = input.reference.replace(/\s+/g, "");
  }

  const lines: string[] = [
    "SPC",
    SIX_QR_PAYLOAD_VERSION,
    SIX_QR_CODING_TYPE,
    input.creditorAccount.replace(/\s+/g, "").toUpperCase(),
    ...structuredAddressLines(input.creditor),
    ...emptyUltimateCreditorLines(),
    formatAmount(input.amountMinor),
    currency,
    ...structuredAddressLines(input.debtor),
    referenceType,
    referenceValue,
    input.unstructuredMessage?.trim() ?? "",
    SIX_QR_PAYLOAD_TRAILER,
  ];

  const billingInformation = input.billingInformation?.trim() ?? "";
  if (billingInformation) {
    lines.push(billingInformation);
  }

  const payload = lines.join(CRLF);
  if (payload.length > 997) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG,
      "Swiss-QR-Payload überschreitet 997 Zeichen.",
    );
  }
  return payload;
}

export function serializeCanonicalSwissQrPayloadFromBillData(
  data: SwissQrBillData,
): string {
  const creditorAccount = resolveCreditorPaymentAccount(data);
  return serializeCanonicalSwissQrPayload({
    creditorAccount,
    creditor: data.creditor,
    amountMinor: data.amount.amountMinor,
    currency: data.amount.currency,
    debtor: data.debtor,
    referenceType: data.reference.type,
    reference: data.reference.value,
    unstructuredMessage: data.additionalInformation.unstructuredMessage,
    billingInformation: data.additionalInformation.billingInformation,
  });
}

/** Normalizes payload line endings for deterministic comparison. */
export function normalizeSwissQrPayloadForComparison(payload: string): string {
  return payload.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
