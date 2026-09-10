import type {
  BillingInvoiceSummary,
  BillingSubscriptionSummary,
  TenantBillingSummary,
} from "@/lib/integrations/stripe/billing-types";

const DELINQUENT_SUBSCRIPTION_STATUSES = new Set(["past_due", "unpaid"]);

/**
 * Whether a single open invoice represents blocking delinquency for SCE access policy.
 * Open invoices without due_date (typical failed auto-charge) count as blocking when
 * amount remains; dated invoices block only when past due.
 */
export function isInvoiceBlockingDelinquent(
  invoice: BillingInvoiceSummary,
  nowMs: number = Date.now(),
): boolean {
  if (invoice.amountRemaining <= 0) {
    return false;
  }
  if (invoice.status === "uncollectible") {
    return true;
  }
  if (invoice.status !== "open") {
    return false;
  }
  if (!invoice.dueDate) {
    return true;
  }
  return new Date(invoice.dueDate).getTime() < nowMs;
}

export function hasBlockingSubscriptionDelinquency(
  subscriptions: BillingSubscriptionSummary[],
): boolean {
  return subscriptions.some((sub) => DELINQUENT_SUBSCRIPTION_STATUSES.has(sub.status));
}

export function hasBlockingBillingDelinquencyFromParts(input: {
  subscriptions: BillingSubscriptionSummary[];
  openInvoices: BillingInvoiceSummary[];
  now?: Date;
}): boolean {
  const nowMs = (input.now ?? new Date()).getTime();
  if (hasBlockingSubscriptionDelinquency(input.subscriptions)) {
    return true;
  }
  return input.openInvoices.some((invoice) =>
    isInvoiceBlockingDelinquent(invoice, nowMs),
  );
}

/**
 * Uses summary aggregates when open invoice list is unavailable (conservative).
 */
export function hasBlockingBillingDelinquencyFromSummary(
  summary: TenantBillingSummary,
  now?: Date,
): boolean {
  if (hasBlockingSubscriptionDelinquency(summary.subscriptions)) {
    return true;
  }
  if (summary.outstandingAmount <= 0) {
    return false;
  }
  const nowMs = (now ?? new Date()).getTime();
  if (summary.overdueOpenInvoiceCount > 0) {
    return true;
  }
  const latest = summary.latestInvoice;
  if (latest && isInvoiceBlockingDelinquent(latest, nowMs)) {
    return true;
  }
  return summary.outstandingAmount > 0;
}

export function isTenantBillingDelinquencyResolved(
  summary: TenantBillingSummary,
  openInvoices?: BillingInvoiceSummary[],
  now?: Date,
): boolean {
  if (openInvoices) {
    return !hasBlockingBillingDelinquencyFromParts({
      subscriptions: summary.subscriptions,
      openInvoices,
      now,
    });
  }
  return !hasBlockingBillingDelinquencyFromSummary(summary, now);
}
