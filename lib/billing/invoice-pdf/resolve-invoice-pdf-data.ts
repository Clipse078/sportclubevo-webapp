import {
  findInvoiceByKey,
  findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot,
  findInvoiceTaxSnapshots,
  listInvoiceLines,
} from "../native-billing-commercial-repository";
import { findInvoicePaymentInstructionByInvoiceId } from "../invoice-payment-instruction-repository";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "../native-billing-types";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import { resolveInvoicePaymentSpcFromInstruction } from "./resolve-invoice-payment-spc";

const PAYABLE_STATUSES = new Set([
  "FINALIZED",
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
]);

export async function resolveInvoicePdfDocumentData(
  invoiceKey: string,
): Promise<InvoicePdfDocumentData> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }

  if (invoice.status === "DRAFT") {
    throw new NativeBillingConflictError(
      "PDF steht erst nach Finalisierung zur Verfügung.",
    );
  }

  const [lines, taxSnapshots, issuer, recipient, paymentInstruction] = await Promise.all([
    listInvoiceLines(invoice.id),
    findInvoiceTaxSnapshots(invoice.id),
    findInvoiceIssuerSnapshot(invoice.id),
    findInvoiceRecipientSnapshot(invoice.id),
    findInvoicePaymentInstructionByInvoiceId(invoice.id),
  ]);

  if (!issuer) {
    throw new NativeBillingValidationError("Aussteller-Snapshot fehlt.");
  }
  if (!recipient) {
    throw new NativeBillingValidationError("Empfänger-Snapshot fehlt.");
  }
  if (!invoice.invoiceNumber) {
    throw new NativeBillingValidationError("Rechnungsnummer fehlt.");
  }

  const isVoid = invoice.status === "VOID";

  let spcPayload: string | null = null;
  let creditorAccount: string | null = null;
  let includeSwissPaymentSection = false;

  if (!isVoid && PAYABLE_STATUSES.has(invoice.status)) {
    if (!paymentInstruction) {
      throw new NativeBillingValidationError(
        "Zahlungsanweisung fehlt für diese Rechnung.",
      );
    }
    if (paymentInstruction.paymentMethod !== "BANK_TRANSFER_SWISS_QR") {
      throw new NativeBillingValidationError(
        "Swiss-QR-PDF wird nur für BANK_TRANSFER_SWISS_QR unterstützt.",
      );
    }
    const resolved = await resolveInvoicePaymentSpcFromInstruction({
      instruction: paymentInstruction,
      issuer,
      recipient,
    });
    spcPayload = resolved.spcPayload;
    creditorAccount = resolved.creditorAccount;
    includeSwissPaymentSection = true;
  }

  return {
    invoice,
    lines,
    taxSnapshots,
    issuer,
    recipient,
    paymentInstruction,
    spcPayload,
    creditorAccount,
    isVoid,
    includeSwissPaymentSection,
  };
}
