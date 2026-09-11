import { logAction } from "@/lib/audit/log-action";
import { maskIban } from "./iban-mask";
import {
  findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot,
  findInvoiceByKey,
} from "./native-billing-commercial-repository";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "./native-billing-audit";
import { listBillingBankAccountsForLegalEntity } from "./native-billing-repository";
import type { InvoicePaymentInstructionRecord } from "./invoice-payment-instruction-types";
import {
  createInvoicePaymentInstructionRecord,
  findInvoicePaymentInstructionByInvoiceId,
} from "./invoice-payment-instruction-repository";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "./native-billing-types";
import { paymentAccountForStrategy } from "./swiss-qr/swiss-iban";
import { generateQrrReference } from "./swiss-qr/swiss-qrr";
import { generateScorReference } from "./swiss-qr/swiss-scor";
import { selectEligibleBillingBankAccount } from "./swiss-qr/swiss-bank-account-selection";
import { validateSwissStructuredAddress } from "./swiss-qr/swiss-structured-address";
import { assertSwissReferenceAccountCompatibility } from "./swiss-qr/swiss-reference-compat";

function assertFinalizedInvoice(
  invoice: Awaited<ReturnType<typeof findInvoiceByKey>>,
): NonNullable<Awaited<ReturnType<typeof findInvoiceByKey>>> & {
  invoiceNumber: string;
} {
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.status !== "FINALIZED") {
    throw new NativeBillingConflictError(
      "Zahlungsanweisung ist nur für finalisierte Rechnungen verfügbar.",
    );
  }
  if (!invoice.invoiceNumber) {
    throw new NativeBillingValidationError("Rechnungsnummer fehlt.");
  }
  return { ...invoice, invoiceNumber: invoice.invoiceNumber };
}

function buildPaymentReference(
  invoice: { id: string; legalEntityId: string; invoiceNumber: string },
  account: {
    referenceStrategy: "QRR" | "SCOR" | "NON";
    qrrReferencePrefix: string | null;
  },
): string | null {
  if (account.referenceStrategy === "NON") {
    return null;
  }
  if (account.referenceStrategy === "QRR") {
    return generateQrrReference(
      {
        invoiceId: invoice.id,
        legalEntityId: invoice.legalEntityId,
        invoiceNumber: invoice.invoiceNumber,
      },
      account.qrrReferencePrefix,
    );
  }
  return generateScorReference({
    invoiceId: invoice.id,
    legalEntityId: invoice.legalEntityId,
    invoiceNumber: invoice.invoiceNumber,
  });
}

export async function getInvoicePaymentInstruction(
  invoiceKey: string,
): Promise<InvoicePaymentInstructionRecord | null> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  return findInvoicePaymentInstructionByInvoiceId(invoice.id);
}

export async function createInvoicePaymentInstruction(
  invoiceKey: string,
  actorUserId: string,
): Promise<InvoicePaymentInstructionRecord> {
  const invoiceRow = await findInvoiceByKey(invoiceKey);
  const invoice = assertFinalizedInvoice(invoiceRow);

  const existing = await findInvoicePaymentInstructionByInvoiceId(invoice.id);
  if (existing) {
    return existing;
  }

  const [issuer, recipient, accounts] = await Promise.all([
    findInvoiceIssuerSnapshot(invoice.id),
    findInvoiceRecipientSnapshot(invoice.id),
    listBillingBankAccountsForLegalEntity(invoice.legalEntityId),
  ]);

  if (!issuer) {
    throw new NativeBillingValidationError("Aussteller-Snapshot fehlt.");
  }
  if (!recipient) {
    throw new NativeBillingValidationError("Empfänger-Snapshot fehlt.");
  }

  validateSwissStructuredAddress(
    {
      name: issuer.legalName,
      street: issuer.addressLine1,
      houseNumber: issuer.houseNumber,
      postalCode: issuer.postalCode,
      city: issuer.city,
      countryCode: issuer.countryCode,
    },
    "Gläubiger",
  );
  validateSwissStructuredAddress(
    {
      name: recipient.companyOrName,
      street: recipient.street,
      houseNumber: recipient.houseNumber,
      postalCode: recipient.postalCode,
      city: recipient.city,
      countryCode: recipient.countryCode,
    },
    "Schuldner",
  );

  const bankAccount = selectEligibleBillingBankAccount(
    accounts,
    invoice.legalEntityId,
    invoice.currency,
  );

  assertSwissReferenceAccountCompatibility({
    iban: bankAccount.iban,
    qrIban: bankAccount.qrIban,
    referenceStrategy: bankAccount.referenceStrategy,
  });

  const paymentAccount = paymentAccountForStrategy(
    { iban: bankAccount.iban, qrIban: bankAccount.qrIban },
    bankAccount.referenceStrategy,
  );

  const reference = buildPaymentReference(invoice, bankAccount);

  const created = await createInvoicePaymentInstructionRecord({
    invoiceId: invoice.id,
    billingBankAccountId: bankAccount.id,
    paymentMethod: "BANK_TRANSFER_SWISS_QR",
    referenceType: bankAccount.referenceStrategy,
    reference,
    amountMinor: invoice.grossTotalMinor,
    currency: invoice.currency,
    creditorAccountMasked: maskIban(paymentAccount) ?? "****",
    additionalInformation: null,
  });

  void logAction({
    actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "InvoicePaymentInstruction",
    entityId: created.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_INSTRUCTION_CREATED,
    afterJson: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      billingCustomerId: invoice.billingCustomerId,
      referenceType: created.referenceType,
      reference: created.reference,
      creditorAccountMasked: created.creditorAccountMasked,
      amountMinor: created.amountMinor,
      currency: created.currency,
    },
  });

  return created;
}
