import { formatQrrReferenceDisplay } from "./swiss-qr/swiss-qrr";
import { formatScorReferenceDisplay } from "./swiss-qr/swiss-scor";
import type { InvoicePaymentInstructionRecord } from "./invoice-payment-instruction-types";

export function presentReferenceTypeLabel(
  referenceType: InvoicePaymentInstructionRecord["referenceType"],
): string {
  switch (referenceType) {
    case "QRR":
      return "QRR";
    case "SCOR":
      return "SCOR";
    case "NON":
      return "Keine Referenz";
    default:
      return referenceType;
  }
}

export function formatPaymentReferenceDisplay(
  referenceType: InvoicePaymentInstructionRecord["referenceType"],
  reference: string | null,
): string | null {
  if (!reference) {
    return null;
  }
  if (referenceType === "QRR") {
    return formatQrrReferenceDisplay(reference);
  }
  if (referenceType === "SCOR") {
    return formatScorReferenceDisplay(reference);
  }
  return reference;
}

export function serializeInvoicePaymentInstructionMasked(
  instruction: InvoicePaymentInstructionRecord,
) {
  return {
    id: instruction.id,
    invoiceId: instruction.invoiceId,
    billingBankAccountId: instruction.billingBankAccountId,
    paymentMethod: instruction.paymentMethod,
    referenceType: instruction.referenceType,
    reference: instruction.reference,
    referenceFormatted: formatPaymentReferenceDisplay(
      instruction.referenceType,
      instruction.reference,
    ),
    amountMinor: instruction.amountMinor,
    currency: instruction.currency,
    creditorAccountMasked: instruction.creditorAccountMasked,
    additionalInformation: instruction.additionalInformation,
    createdAt: instruction.createdAt.toISOString(),
  };
}
