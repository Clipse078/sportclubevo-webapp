import { prisma } from "@/lib/db/prisma";
import { recordCamt054InvoicePayment } from "@/lib/billing/invoice-payments/invoice-payment-service";
import { getInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-service";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import { isCamt054InvoicePayable } from "./camt054-invoice-matcher";
import { findBankReconciliationTransactionByKey } from "./camt054-reconciliation-repository";

export type ManualCamt054MatchInput = {
  transactionKey: string;
  invoiceKey: string;
  actorUserId: string;
};

export async function listEligibleInvoicesForManualCamt054Match(
  legalEntityKey: string,
): Promise<
  Array<{
    invoiceKey: string;
    invoiceNumber: string | null;
    customerName: string;
    grossTotalMinor: number;
    paidTotalMinor: number;
    outstandingMinor: number;
    currency: string;
    status: string;
  }>
> {
  const legalEntity = await prisma.legalEntity.findUnique({
    where: { key: legalEntityKey },
    select: { id: true },
  });
  if (!legalEntity) {
    throw new NativeBillingNotFoundError("Rechtsträger nicht gefunden.");
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      legalEntityId: legalEntity.id,
      status: { in: ["FINALIZED", "OPEN", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: {
      key: true,
      invoiceNumber: true,
      grossTotalMinor: true,
      currency: true,
      status: true,
      billingCustomer: { select: { displayName: true } },
    },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const rows: Array<{
    invoiceKey: string;
    invoiceNumber: string | null;
    customerName: string;
    grossTotalMinor: number;
    paidTotalMinor: number;
    outstandingMinor: number;
    currency: string;
    status: string;
  }> = [];

  for (const invoice of invoices) {
    const summary = await getInvoicePaymentSummary(invoice.key);
    const outstanding = summary?.outstandingMinor ?? invoice.grossTotalMinor;
    if (outstanding <= 0) continue;
    rows.push({
      invoiceKey: invoice.key,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.billingCustomer.displayName,
      grossTotalMinor: invoice.grossTotalMinor,
      paidTotalMinor: summary?.paidTotalMinor ?? 0,
      outstandingMinor: outstanding,
      currency: invoice.currency,
      status: invoice.status,
    });
  }

  return rows;
}

export async function manuallyAssignCamt054Transaction(
  input: ManualCamt054MatchInput,
): Promise<{ paymentKey: string; invoiceKey: string }> {
  const row = await findBankReconciliationTransactionByKey(input.transactionKey);
  if (!row) {
    throw new NativeBillingNotFoundError("Banktransaktion nicht gefunden.");
  }
  if (row.matchStatus !== "UNMATCHED") {
    throw new NativeBillingConflictError("Transaktion ist nicht mehr offen.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { key: input.invoiceKey },
    include: {
      billingCustomer: { select: { displayName: true } },
      paymentInstruction: { select: { id: true } },
    },
  });
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.legalEntityId !== row.import.legalEntityId) {
    throw new NativeBillingValidationError("Rechnung gehört zu einem anderen Rechtsträger.");
  }
  if (!isCamt054InvoicePayable(invoice.status)) {
    throw new NativeBillingValidationError("Rechnung ist nicht zahlbar.");
  }
  if (invoice.currency.toUpperCase() !== row.currency.toUpperCase()) {
    throw new NativeBillingValidationError("Währung stimmt nicht überein.");
  }

  const summary = await getInvoicePaymentSummary(invoice.key);
  const outstanding = summary?.outstandingMinor ?? invoice.grossTotalMinor;
  if (outstanding <= 0) {
    throw new NativeBillingConflictError("Rechnung ist bereits vollständig bezahlt.");
  }
  if (row.amountMinor > outstanding) {
    throw new NativeBillingValidationError("Der Betrag übersteigt den offenen Rechnungsbetrag.");
  }

  const result = await recordCamt054InvoicePayment({
    invoiceKey: invoice.key,
    amountMinor: row.amountMinor,
    currency: row.currency,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    creditorReference: row.creditorReference,
    bankTransactionId: row.bankTransactionId,
    externalReference: `manual:${row.key}`,
    actorUserId: input.actorUserId,
  });

  await prisma.bankReconciliationTransaction.update({
    where: { id: row.id },
    data: {
      matchStatus: "MATCHED",
      matchMethod: "MANUAL_ASSIGNMENT",
      matchReason: "Manuell zugeordnet",
      invoiceId: invoice.id,
      invoicePaymentInstructionId: invoice.paymentInstruction?.id ?? null,
      invoicePaymentId: result.payment.id,
    },
  });

  await prisma.bankReconciliationImport.update({
    where: { id: row.importId },
    data: {
      matchedCount: { increment: 1 },
      unmatchedCount: { decrement: 1 },
    },
  });

  return { paymentKey: result.payment.key, invoiceKey: invoice.key };
}
