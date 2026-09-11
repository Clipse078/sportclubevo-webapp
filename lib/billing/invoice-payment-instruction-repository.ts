import { prisma } from "@/lib/db/prisma";
import type { InvoicePaymentInstructionRecord } from "./invoice-payment-instruction-types";

const select = {
  id: true,
  invoiceId: true,
  billingBankAccountId: true,
  paymentMethod: true,
  referenceType: true,
  reference: true,
  amountMinor: true,
  currency: true,
  creditorAccountMasked: true,
  additionalInformation: true,
  createdAt: true,
} as const;

export async function findInvoicePaymentInstructionByInvoiceId(
  invoiceId: string,
): Promise<InvoicePaymentInstructionRecord | null> {
  return prisma.invoicePaymentInstruction.findUnique({
    where: { invoiceId },
    select,
  });
}

export async function createInvoicePaymentInstructionRecord(
  data: Omit<InvoicePaymentInstructionRecord, "id" | "createdAt">,
): Promise<InvoicePaymentInstructionRecord> {
  return prisma.invoicePaymentInstruction.create({
    data: {
      invoiceId: data.invoiceId,
      billingBankAccountId: data.billingBankAccountId,
      paymentMethod: data.paymentMethod,
      referenceType: data.referenceType,
      reference: data.reference,
      amountMinor: data.amountMinor,
      currency: data.currency,
      creditorAccountMasked: data.creditorAccountMasked,
      additionalInformation: data.additionalInformation,
    },
    select,
  });
}
