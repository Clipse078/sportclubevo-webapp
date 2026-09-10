import type {
  BillingSubscriptionSummary,
  TenantBillingSummary,
} from "@/lib/integrations/stripe/billing-types";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function isActiveSubscriptionStatus(status: string): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

/** Monthly recurring revenue in minor units (excl. tax), active/trialing subs only. */
export function subscriptionMonthlyMinorUnits(
  subscription: BillingSubscriptionSummary,
): number {
  if (!isActiveSubscriptionStatus(subscription.status)) {
    return 0;
  }
  if (subscription.unitAmount == null || subscription.unitAmount <= 0) {
    return 0;
  }

  const intervalCount = subscription.intervalCount ?? 1;
  const amount = subscription.unitAmount;

  switch (subscription.interval) {
    case "month":
      return amount * intervalCount;
    case "year":
      return Math.round(amount / (12 * intervalCount));
    case "week":
      return Math.round((amount * 52) / (12 * intervalCount));
    case "day":
      return Math.round((amount * 365) / (12 * intervalCount));
    default:
      return 0;
  }
}

export function computeTenantMrrMinorUnits(summary: TenantBillingSummary): number {
  return summary.subscriptions.reduce(
    (sum, sub) => sum + subscriptionMonthlyMinorUnits(sub),
    0,
  );
}

export function tenantHasActiveSubscription(summary: TenantBillingSummary): boolean {
  return summary.subscriptions.some((sub) => isActiveSubscriptionStatus(sub.status));
}

export type PlatformBillingKpis = {
  mrrByCurrency: Record<string, number>;
  activeCustomerCount: number;
  outstandingByCurrency: Record<string, number>;
  overdueInvoiceCount: number;
};

export function aggregatePlatformBillingKpis(
  summaries: TenantBillingSummary[],
): PlatformBillingKpis {
  const mrrByCurrency: Record<string, number> = {};
  const outstandingByCurrency: Record<string, number> = {};
  let activeCustomerCount = 0;
  let overdueInvoiceCount = 0;

  for (const summary of summaries) {
    const currency = summary.currency ?? "usd";
    const mrr = computeTenantMrrMinorUnits(summary);
    if (mrr > 0) {
      mrrByCurrency[currency] = (mrrByCurrency[currency] ?? 0) + mrr;
    }

    if (tenantHasActiveSubscription(summary)) {
      activeCustomerCount += 1;
    }

    if (summary.outstandingAmount > 0) {
      outstandingByCurrency[currency] =
        (outstandingByCurrency[currency] ?? 0) + summary.outstandingAmount;
    }

    overdueInvoiceCount += summary.overdueOpenInvoiceCount;
  }

  return {
    mrrByCurrency,
    activeCustomerCount,
    outstandingByCurrency,
    overdueInvoiceCount,
  };
}
