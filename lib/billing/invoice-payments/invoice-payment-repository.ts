import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { InvoicePaymentRecord } from "./invoice-payment-types";

const paymentSelect = {
  id: true,
  key: true,
  invoiceId: true,
  amountMinor: true,
  currency: true,
  paymentDate: true,
  method: true,
  reference: true,
  note: true,
  source: true,
  status: true,
  externalReference: true,
  bankTransactionId: true,
  reversedAt: true,
  reversedByUserId: true,
  reversalReason: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapPayment(
  row: Prisma.InvoicePaymentGetPayload<{ select: typeof paymentSelect }>,
): InvoicePaymentRecord {
  return {
    ...row,
    method: "BANK_TRANSFER_MANUAL",
    source: row.source as InvoicePaymentRecord["source"],
    status: row.status as InvoicePaymentRecord["status"],
  };
}

export async function listInvoicePaymentsForInvoiceId(
  invoiceId: string,
): Promise<InvoicePaymentRecord[]> {
  const rows = await prisma.invoicePayment.findMany({
    where: { invoiceId },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    select: paymentSelect,
  });
  return rows.map(mapPayment);
}

export async function findInvoicePaymentByKey(
  paymentKey: string,
): Promise<InvoicePaymentRecord | null> {
  const row = await prisma.invoicePayment.findUnique({
    where: { key: paymentKey },
    select: paymentSelect,
  });
  return row ? mapPayment(row) : null;
}

export async function sumConfirmedPaymentsMinor(
  invoiceId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<number> {
  const agg = await tx.invoicePayment.aggregate({
    where: { invoiceId, status: "CONFIRMED" },
    _sum: { amountMinor: true },
  });
  return agg._sum.amountMinor ?? 0;
}

export type CreateInvoicePaymentRecordInput = {
  key: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  paymentDate: Date;
  method: "BANK_TRANSFER_MANUAL";
  reference: string | null;
  note: string | null;
  source: InvoicePaymentRecord["source"];
  createdByUserId: string | null;
  externalReference?: string | null;
  bankTransactionId?: string | null;
};

export async function createInvoicePaymentRecord(
  input: CreateInvoicePaymentRecordInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<InvoicePaymentRecord> {
  const row = await tx.invoicePayment.create({
    data: {
      key: input.key,
      invoiceId: input.invoiceId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      paymentDate: input.paymentDate,
      method: input.method,
      reference: input.reference,
      note: input.note,
      source: input.source,
      status: "CONFIRMED",
      createdByUserId: input.createdByUserId,
      externalReference: input.externalReference ?? null,
      bankTransactionId: input.bankTransactionId ?? null,
    },
    select: paymentSelect,
  });
  return mapPayment(row);
}

export async function findConfirmedPaymentByBankTransactionId(
  bankTransactionId: string,
): Promise<InvoicePaymentRecord | null> {
  const row = await prisma.invoicePayment.findFirst({
    where: {
      bankTransactionId,
      status: "CONFIRMED",
    },
    select: paymentSelect,
  });
  return row ? mapPayment(row) : null;
}

export async function markInvoicePaymentReversed(
  paymentId: string,
  input: { reversedByUserId: string; reversalReason: string },
  tx: Prisma.TransactionClient = prisma,
): Promise<InvoicePaymentRecord> {
  const row = await tx.invoicePayment.update({
    where: { id: paymentId },
    data: {
      status: "REVERSED",
      reversedAt: new Date(),
      reversedByUserId: input.reversedByUserId,
      reversalReason: input.reversalReason,
    },
    select: paymentSelect,
  });
  return mapPayment(row);
}
