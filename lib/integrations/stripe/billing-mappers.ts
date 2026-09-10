import type Stripe from "stripe";
import type {
  BillingInvoiceSummary,
  BillingSubscriptionSummary,
} from "./billing-types";

function unixToIso(seconds: number | null | undefined): string | null {
  if (seconds == null) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

function resolveProductName(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined,
): string | null {
  if (!product || typeof product === "string") {
    return null;
  }
  if ("deleted" in product && product.deleted) {
    return null;
  }
  return product.name ?? null;
}

function resolveProductId(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined,
): string | null {
  if (!product) {
    return null;
  }
  return typeof product === "string" ? product : product.id;
}

export function mapStripeSubscription(
  subscription: Stripe.Subscription,
): BillingSubscriptionSummary {
  const item = subscription.items.data[0];
  const price = item?.price;

  return {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    planName: resolveProductName(price?.product),
    priceId: price?.id ?? null,
    productId: resolveProductId(price?.product),
    unitAmount: price?.unit_amount ?? null,
    currency: price?.currency ?? null,
    interval: price?.recurring?.interval ?? null,
    intervalCount: price?.recurring?.interval_count ?? null,
    currentPeriodStart: unixToIso(item?.current_period_start),
    currentPeriodEnd: unixToIso(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: unixToIso(subscription.trial_end),
  };
}

function sumInvoiceTax(invoice: Stripe.Invoice): number {
  return (invoice.total_taxes ?? []).reduce(
    (sum, entry) => sum + (entry.amount ?? 0),
    0,
  );
}

export function mapStripeInvoice(invoice: Stripe.Invoice): BillingInvoiceSummary {
  return {
    stripeInvoiceId: invoice.id,
    number: invoice.number,
    status: invoice.status,
    subtotal: invoice.subtotal ?? 0,
    tax: sumInvoiceTax(invoice),
    total: invoice.total ?? 0,
    amountDue: invoice.amount_due ?? 0,
    amountPaid: invoice.amount_paid ?? 0,
    amountRemaining: invoice.amount_remaining ?? 0,
    currency: invoice.currency,
    createdAt: unixToIso(invoice.created) ?? new Date(0).toISOString(),
    dueDate: unixToIso(invoice.due_date),
    paidAt: unixToIso(invoice.status_transitions?.paid_at),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
  };
}

export function sumOutstandingFromInvoices(
  invoices: BillingInvoiceSummary[],
): number {
  return invoices.reduce((sum, invoice) => {
    if (invoice.status === "open" || invoice.status === "uncollectible") {
      return sum + invoice.amountRemaining;
    }
    return sum;
  }, 0);
}

export function pickPrimaryCurrency(
  invoices: BillingInvoiceSummary[],
  subscriptions: BillingSubscriptionSummary[],
): string | null {
  return (
    subscriptions.find((s) => s.currency)?.currency ??
    invoices.find((i) => i.currency)?.currency ??
    null
  );
}
