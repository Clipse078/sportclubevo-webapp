import { getInvoicePaymentInstruction } from "../invoice-payment-instruction-service";
import {
  findInvoiceByKey,
  findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot,
} from "../native-billing-commercial-repository";
import {
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "../native-billing-types";
import { buildSwissQrBillDataFromInvoiceContext } from "./build-swiss-qr-bill-from-instruction";
import { runSwissQrCompliance } from "./run-swiss-qr-compliance";
import { SWISS_QR_COMPLIANCE_CODES } from "./swiss-qr-compliance-codes";
import { SwissQrComplianceBlockedError } from "./swiss-qr-compliance-error";

const OPERATOR_MESSAGE =
  "Swiss-QR-Compliance konnte nicht bestätigt werden. Bitte prüfen Sie IBAN, Adressen, Referenz und Betrag, bevor Sie die Rechnung erneut senden.";

export async function assertInvoiceSwissQrDeliveryCompliance(invoiceKey: string): Promise<void> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }

  const paymentInstruction = await getInvoicePaymentInstruction(invoiceKey);
  if (!paymentInstruction) {
    throw new NativeBillingValidationError(
      "Zahlungsanweisung fehlt. Rechnung kann nicht versendet werden.",
    );
  }

  if (paymentInstruction.paymentMethod !== "BANK_TRANSFER_SWISS_QR") {
    return;
  }

  const [issuer, recipient] = await Promise.all([
    findInvoiceIssuerSnapshot(invoice.id),
    findInvoiceRecipientSnapshot(invoice.id),
  ]);
  if (!issuer || !recipient) {
    throw new NativeBillingValidationError("Rechnungs-Snapshot-Daten fehlen.");
  }

  const billData = await buildSwissQrBillDataFromInvoiceContext({
    instruction: paymentInstruction,
    issuer,
    recipient,
  });

  const result = await runSwissQrCompliance(billData, {
    verifyQrArtifact: true,
    verifyPdfArtifact: false,
  });

  if (!result.ok) {
    const primary = result.issues[0];
    throw new SwissQrComplianceBlockedError(
      primary?.code ?? SWISS_QR_COMPLIANCE_CODES.QR_PAYLOAD_MISMATCH,
      primary?.message ?? "Swiss QR compliance failed",
      OPERATOR_MESSAGE,
    );
  }
}
