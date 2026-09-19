import { findBillingBankAccountById } from "../native-billing-repository";
import type { InvoicePaymentInstructionRecord } from "../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceRecipientSnapshotRecord,
} from "../native-billing-commercial-types";
import { NativeBillingNotFoundError, NativeBillingValidationError } from "../native-billing-types";
import { paymentAccountForStrategy } from "../swiss-qr/swiss-iban";
import { buildSwissQrBillDataFromInvoiceContext } from "../swiss-qr-compliance/build-swiss-qr-bill-from-instruction";
import { runSwissQrCompliance } from "../swiss-qr-compliance/run-swiss-qr-compliance";
import { SWISS_QR_COMPLIANCE_CODES } from "../swiss-qr-compliance/swiss-qr-compliance-codes";
import { SwissQrComplianceBlockedError } from "../swiss-qr-compliance/swiss-qr-compliance-error";

export type ResolvedInvoicePaymentSpc = {
  spcPayload: string;
  creditorAccount: string;
};

export async function resolveInvoicePaymentSpcFromInstruction(input: {
  instruction: InvoicePaymentInstructionRecord;
  issuer: InvoiceIssuerSnapshotRecord;
  recipient: InvoiceRecipientSnapshotRecord;
}): Promise<ResolvedInvoicePaymentSpc> {
  const bankAccount = await findBillingBankAccountById(input.instruction.billingBankAccountId);
  if (!bankAccount) {
    throw new NativeBillingNotFoundError("Bankkonto für Zahlungsanweisung nicht gefunden.");
  }

  const creditorAccount = paymentAccountForStrategy(
    { iban: bankAccount.iban, qrIban: bankAccount.qrIban },
    input.instruction.referenceType,
  );

  const billData = await buildSwissQrBillDataFromInvoiceContext(input);
  const compliance = await runSwissQrCompliance(billData, {
    verifyQrArtifact: true,
    verifyPdfArtifact: false,
  });
  if (!compliance.ok) {
    const issue = compliance.issues[0];
    throw new SwissQrComplianceBlockedError(
      issue?.code ?? SWISS_QR_COMPLIANCE_CODES.QR_PAYLOAD_MISMATCH,
      issue?.message ?? "Swiss QR compliance failed",
      "Swiss-QR-Daten sind nicht standardskonform. PDF kann nicht erstellt werden.",
    );
  }

  if (input.instruction.referenceType === "QRR" && !input.instruction.reference?.trim()) {
    throw new NativeBillingValidationError("QRR-Referenz fehlt in der Zahlungsanweisung.");
  }

  return {
    spcPayload: compliance.canonicalPayload,
    creditorAccount,
  };
}
