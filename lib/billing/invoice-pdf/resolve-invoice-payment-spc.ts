import { findBillingBankAccountById } from "../native-billing-repository";
import type { InvoicePaymentInstructionRecord } from "../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceRecipientSnapshotRecord,
} from "../native-billing-commercial-types";
import { NativeBillingNotFoundError, NativeBillingValidationError } from "../native-billing-types";
import { paymentAccountForStrategy } from "../swiss-qr/swiss-iban";
import { buildSwissSpcPayload } from "../swiss-qr/swiss-spc-payload";

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

  const spcPayload = buildSwissSpcPayload({
    creditorAccount,
    creditor: {
      name: input.issuer.legalName,
      street: input.issuer.addressLine1,
      houseNumber: input.issuer.houseNumber,
      postalCode: input.issuer.postalCode,
      city: input.issuer.city,
      countryCode: input.issuer.countryCode,
    },
    amountMinor: input.instruction.amountMinor,
    currency: input.instruction.currency,
    debtor: {
      name: input.recipient.companyOrName,
      street: input.recipient.street,
      houseNumber: input.recipient.houseNumber,
      postalCode: input.recipient.postalCode,
      city: input.recipient.city,
      countryCode: input.recipient.countryCode,
    },
    referenceType: input.instruction.referenceType,
    reference: input.instruction.reference,
    additionalInformation: input.instruction.additionalInformation,
  });

  if (input.instruction.referenceType === "QRR" && !input.instruction.reference?.trim()) {
    throw new NativeBillingValidationError("QRR-Referenz fehlt in der Zahlungsanweisung.");
  }

  return { spcPayload, creditorAccount };
}
