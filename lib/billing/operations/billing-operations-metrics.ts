import { calculateOutstandingMinor } from "@/lib/billing/invoice-payments/invoice-payment-balance";
import type { InvoiceStatus } from "@prisma/client";
import type {
  BillingCustomerBalanceSummary,
  BillingOperationsCurrencyMetrics,
  BillingOperationsSummaryMetrics,
  InvoiceOperationalStatus,
} from "./billing-operations-types";

export const RECEIVABLE_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "FINALIZED",
  "OPEN",
  "PARTIALLY_PAID",
  "OVERDUE",
]);

export type InvoiceMetricsInput = {
  id: string;
  billingCustomerId: string;
  status: InvoiceStatus;
  currency: string;
  grossTotalMinor: number;
  dueDate: Date | null;
  paidTotalMinor: number;
};

export function resolveInvoiceOperationalStatus(
  status: InvoiceStatus,
  outstandingMinor: number,
  paidTotalMinor: number,
): InvoiceOperationalStatus {
  if (status === "VOID") return "VOID";
  if (status === "CREDITED") return "CREDITED";
  if (status === "DRAFT") return "DRAFT";
  if (outstandingMinor === 0 && paidTotalMinor > 0) return "PAID";
  if (status === "OVERDUE") return "OVERDUE";
  if (status === "PARTIALLY_PAID" || (paidTotalMinor > 0 && outstandingMinor > 0)) {
    return "PARTIALLY_PAID";
  }
  if (status === "OPEN") return "OPEN";
  if (status === "FINALIZED") return "FINALIZED";
  if (status === "PAID") return "PAID";
  return "OPEN";
}

export function isInvoiceOverdueForMetrics(
  invoice: InvoiceMetricsInput,
  outstandingMinor: number,
  referenceDate: Date,
): boolean {
  if (outstandingMinor <= 0) return false;
  if (!RECEIVABLE_INVOICE_STATUSES.has(invoice.status) && invoice.status !== "OVERDUE") {
    return false;
  }
  if (invoice.status === "OVERDUE") return true;
  if (!invoice.dueDate) return false;
  const due = new Date(invoice.dueDate);
  due.setUTCHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setUTCHours(0, 0, 0, 0);
  return due < ref;
}

export function computeChfMetricsFromInvoices(
  invoices: InvoiceMetricsInput[],
  paidThisMonthMinor: number,
  referenceDate: Date,
): BillingOperationsCurrencyMetrics {
  let openReceivablesMinor = 0;
  let overdueReceivablesMinor = 0;

  for (const invoice of invoices) {
    if (invoice.currency.toUpperCase() !== "CHF") continue;
    const outstanding = calculateOutstandingMinor(
      invoice.grossTotalMinor,
      invoice.paidTotalMinor,
    );
    if (outstanding <= 0) continue;
    if (invoice.status === "VOID" || invoice.status === "DRAFT" || invoice.status === "PAID") {
      continue;
    }
    if (!RECEIVABLE_INVOICE_STATUSES.has(invoice.status) && invoice.status !== "OVERDUE") {
      continue;
    }
    openReceivablesMinor += outstanding;
    if (isInvoiceOverdueForMetrics(invoice, outstanding, referenceDate)) {
      overdueReceivablesMinor += outstanding;
    }
  }

  return {
    currency: "CHF",
    openReceivablesMinor,
    overdueReceivablesMinor,
    paidThisMonthMinor,
  };
}

export function buildSummaryMetrics(input: {
  activeCustomerCount: number;
  activeContractCount: number;
  invoices: InvoiceMetricsInput[];
  paidThisMonthMinorChf: number;
  attentionInvoiceCount: number;
  referenceDate: Date;
}): BillingOperationsSummaryMetrics {
  const chf = computeChfMetricsFromInvoices(
    input.invoices,
    input.paidThisMonthMinorChf,
    input.referenceDate,
  );

  let openInvoiceCount = 0;
  let overdueInvoiceCount = 0;
  for (const invoice of input.invoices) {
    if (invoice.currency.toUpperCase() !== "CHF") continue;
    const outstanding = calculateOutstandingMinor(
      invoice.grossTotalMinor,
      invoice.paidTotalMinor,
    );
    if (outstanding <= 0) continue;
    if (invoice.status === "VOID" || invoice.status === "DRAFT" || invoice.status === "PAID") {
      continue;
    }
    if (!RECEIVABLE_INVOICE_STATUSES.has(invoice.status) && invoice.status !== "OVERDUE") {
      continue;
    }
    openInvoiceCount += 1;
    if (isInvoiceOverdueForMetrics(invoice, outstanding, input.referenceDate)) {
      overdueInvoiceCount += 1;
    }
  }

  return {
    activeCustomerCount: input.activeCustomerCount,
    activeContractCount: input.activeContractCount,
    openInvoiceCount,
    overdueInvoiceCount,
    attentionInvoiceCount: input.attentionInvoiceCount,
    chf,
  };
}

export function aggregateCustomerBalances(
  invoices: InvoiceMetricsInput[],
  customerKeyById: Map<string, string>,
  referenceDate: Date,
): BillingCustomerBalanceSummary[] {
  const byCustomer = new Map<
    string,
    { open: number; overdue: number; currency: string; customerKey: string }
  >();

  for (const invoice of invoices) {
    const outstanding = calculateOutstandingMinor(
      invoice.grossTotalMinor,
      invoice.paidTotalMinor,
    );
    if (outstanding <= 0) continue;
    if (invoice.status === "VOID" || invoice.status === "DRAFT" || invoice.status === "PAID") {
      continue;
    }
    if (!RECEIVABLE_INVOICE_STATUSES.has(invoice.status) && invoice.status !== "OVERDUE") {
      continue;
    }
    const customerKey = customerKeyById.get(invoice.billingCustomerId);
    if (!customerKey) continue;

    const existing = byCustomer.get(invoice.billingCustomerId) ?? {
      open: 0,
      overdue: 0,
      currency: invoice.currency,
      customerKey,
    };
    existing.open += outstanding;
    if (isInvoiceOverdueForMetrics(invoice, outstanding, referenceDate)) {
      existing.overdue += outstanding;
    }
    byCustomer.set(invoice.billingCustomerId, existing);
  }

  return [...byCustomer.entries()].map(([customerId, row]) => ({
    customerId,
    customerKey: row.customerKey,
    openBalanceMinor: row.open,
    overdueBalanceMinor: row.overdue,
    currency: row.currency,
  }));
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}
