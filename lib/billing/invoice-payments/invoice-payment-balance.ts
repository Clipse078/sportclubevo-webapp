import type { InvoicePaymentRecord } from "./invoice-payment-types";

export function sumConfirmedPaymentAmountMinor(payments: InvoicePaymentRecord[]): number {
  return payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((sum, p) => sum + p.amountMinor, 0);
}

export function calculateOutstandingMinor(
  grossTotalMinor: number,
  paidTotalMinor: number,
): number {
  return Math.max(0, grossTotalMinor - paidTotalMinor);
}

export function isInvoiceFullyPaid(grossTotalMinor: number, paidTotalMinor: number): boolean {
  return paidTotalMinor >= grossTotalMinor && grossTotalMinor > 0;
}
