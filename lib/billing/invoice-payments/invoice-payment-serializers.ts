import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { InvoicePaymentRecord, InvoicePaymentSummary } from "./invoice-payment-types";

export type SerializedInvoicePayment = {
  key: string;
  amountMinor: number;
  amountFormatted: string;
  currency: string;
  paymentDate: string;
  paymentDateDisplay: string;
  method: string;
  methodLabel: string;
  source: string;
  sourceLabel: string;
  status: string;
  statusLabel: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  createdAtDisplay: string;
  createdByUserId: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
};

export type SerializedInvoicePaymentSummary = {
  grossTotalMinor: number;
  grossTotalFormatted: string;
  paidTotalMinor: number;
  paidTotalFormatted: string;
  outstandingMinor: number;
  outstandingFormatted: string;
  isFullyPaid: boolean;
  lastPaymentDate: string | null;
  lastPaymentDateDisplay: string | null;
  payments: SerializedInvoicePayment[];
};

function presentMethodLabel(method: InvoicePaymentRecord["method"]): string {
  if (method === "BANK_TRANSFER_MANUAL") {
    return "Banküberweisung";
  }
  return method;
}

function presentSourceLabel(source: InvoicePaymentRecord["source"]): string {
  switch (source) {
    case "MANUAL":
      return "Manuell erfasst";
    case "CAMT054":
      return "Bankimport";
    case "STRIPE":
      return "Stripe";
    default:
      return source;
  }
}

function presentStatusLabel(status: InvoicePaymentRecord["status"]): string {
  return status === "REVERSED" ? "Storniert" : "Verbucht";
}

export function serializeInvoicePayment(payment: InvoicePaymentRecord): SerializedInvoicePayment {
  return {
    key: payment.key,
    amountMinor: payment.amountMinor,
    amountFormatted: formatBillingMoney(payment.amountMinor, payment.currency),
    currency: payment.currency,
    paymentDate: payment.paymentDate.toISOString().slice(0, 10),
    paymentDateDisplay: formatBillingDateDisplay(payment.paymentDate),
    method: payment.method,
    methodLabel: presentMethodLabel(payment.method),
    source: payment.source,
    sourceLabel: presentSourceLabel(payment.source),
    status: payment.status,
    statusLabel: presentStatusLabel(payment.status),
    reference: payment.reference,
    note: payment.note,
    createdAt: payment.createdAt.toISOString(),
    createdAtDisplay: new Intl.DateTimeFormat("de-CH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(payment.createdAt),
    createdByUserId: payment.createdByUserId,
    reversedAt: payment.reversedAt?.toISOString() ?? null,
    reversalReason: payment.reversalReason,
  };
}

export function serializeInvoicePaymentSummary(
  summary: InvoicePaymentSummary,
): SerializedInvoicePaymentSummary {
  return {
    grossTotalMinor: summary.grossTotalMinor,
    grossTotalFormatted: formatBillingMoney(summary.grossTotalMinor, summary.currency),
    paidTotalMinor: summary.paidTotalMinor,
    paidTotalFormatted: formatBillingMoney(summary.paidTotalMinor, summary.currency),
    outstandingMinor: summary.outstandingMinor,
    outstandingFormatted: formatBillingMoney(summary.outstandingMinor, summary.currency),
    isFullyPaid: summary.isFullyPaid,
    lastPaymentDate: summary.lastPaymentDate?.toISOString().slice(0, 10) ?? null,
    lastPaymentDateDisplay: summary.lastPaymentDate
      ? formatBillingDateDisplay(summary.lastPaymentDate)
      : null,
    payments: summary.payments.map(serializeInvoicePayment),
  };
}
