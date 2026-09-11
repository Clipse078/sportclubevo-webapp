import type { BillingReferenceStrategy, InvoicePaymentMethod } from "@prisma/client";

export type InvoicePaymentInstructionRecord = {
  id: string;
  invoiceId: string;
  billingBankAccountId: string;
  paymentMethod: InvoicePaymentMethod;
  referenceType: BillingReferenceStrategy;
  reference: string | null;
  amountMinor: number;
  currency: string;
  creditorAccountMasked: string;
  additionalInformation: string | null;
  createdAt: Date;
};
