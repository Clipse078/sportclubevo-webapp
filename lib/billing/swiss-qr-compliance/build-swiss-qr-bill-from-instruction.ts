import type { InvoicePaymentInstructionRecord } from "../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceRecipientSnapshotRecord,
} from "../native-billing-commercial-types";
import { findBillingBankAccountById } from "../native-billing-repository";
import { NativeBillingNotFoundError } from "../native-billing-types";
import { createSwissQrBillData, type SwissQrBillData } from "./swiss-qr-bill-data";

export async function buildSwissQrBillDataFromInvoiceContext(input: {
  instruction: InvoicePaymentInstructionRecord;
  issuer: InvoiceIssuerSnapshotRecord;
  recipient: InvoiceRecipientSnapshotRecord;
}): Promise<SwissQrBillData> {
  const bankAccount = await findBillingBankAccountById(input.instruction.billingBankAccountId);
  if (!bankAccount) {
    throw new NativeBillingNotFoundError("Bankkonto für Zahlungsanweisung nicht gefunden.");
  }

  return createSwissQrBillData({
    account: {
      iban: bankAccount.iban,
      qrIban: bankAccount.qrIban,
    },
    creditor: {
      name: input.issuer.legalName,
      street: input.issuer.addressLine1,
      houseNumber: input.issuer.houseNumber,
      postalCode: input.issuer.postalCode,
      city: input.issuer.city,
      countryCode: input.issuer.countryCode,
    },
    debtor: {
      name: input.recipient.companyOrName,
      street: input.recipient.street,
      houseNumber: input.recipient.houseNumber,
      postalCode: input.recipient.postalCode,
      city: input.recipient.city,
      countryCode: input.recipient.countryCode,
    },
    amount: {
      amountMinor: input.instruction.amountMinor,
      currency: input.instruction.currency,
    },
    reference: {
      type: input.instruction.referenceType,
      value: input.instruction.reference,
    },
    additionalInformation: {
      unstructuredMessage: input.instruction.additionalInformation,
      billingInformation: null,
    },
  });
}
