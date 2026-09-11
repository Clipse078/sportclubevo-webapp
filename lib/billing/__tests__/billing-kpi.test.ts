import { describe, expect, it } from "vitest";
import {
  aggregatePlatformBillingKpis,
  computeTenantMrrMinorUnits,
  subscriptionMonthlyMinorUnits,
  tenantHasActiveSubscription,
} from "../billing-kpi";
import type {
  BillingSubscriptionSummary,
  TenantBillingSummary,
} from "@/lib/integrations/stripe/billing-types";

function sub(
  overrides: Partial<BillingSubscriptionSummary> = {},
): BillingSubscriptionSummary {
  return {
    stripeSubscriptionId: "sub_1",
    status: "active",
    planName: "Club",
    priceId: "price_1",
    productId: "prod_1",
    unitAmount: 19900,
    currency: "chf",
    interval: "month",
    intervalCount: 1,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function summary(overrides: Partial<TenantBillingSummary> = {}): TenantBillingSummary {
  return {
    tenantId: "t1",
    tenantKey: "club-a",
    tenantName: "Club A",
    stripeCustomerId: "cus_a",
    subscriptions: [],
    latestInvoice: null,
    outstandingAmount: 0,
    overdueOpenInvoiceCount: 0,
    currency: "chf",
    ...overrides,
  };
}

describe("billing KPI helpers", () => {
  it("computes monthly MRR from active monthly price", () => {
    expect(subscriptionMonthlyMinorUnits(sub())).toBe(19900);
  });

  it("annualizes yearly subscriptions", () => {
    expect(
      subscriptionMonthlyMinorUnits(
        sub({ unitAmount: 120000, interval: "year", intervalCount: 1 }),
      ),
    ).toBe(10000);
  });

  it("ignores canceled subscriptions for MRR", () => {
    expect(subscriptionMonthlyMinorUnits(sub({ status: "canceled" }))).toBe(0);
  });

  it("detects active customer from trialing subscription", () => {
    const s = summary({ subscriptions: [sub({ status: "trialing" })] });
    expect(tenantHasActiveSubscription(s)).toBe(true);
  });

  it("aggregates platform KPIs across tenants", () => {
    const kpis = aggregatePlatformBillingKpis([
      summary({
        subscriptions: [sub()],
        outstandingAmount: 5000,
        overdueOpenInvoiceCount: 1,
        currency: "chf",
      }),
      summary({
        tenantId: "t2",
        subscriptions: [sub({ status: "canceled" })],
        outstandingAmount: 0,
        overdueOpenInvoiceCount: 0,
      }),
    ]);

    expect(computeTenantMrrMinorUnits(summary({ subscriptions: [sub()] }))).toBe(19900);
    expect(kpis.mrrByCurrency.chf).toBe(19900);
    expect(kpis.activeCustomerCount).toBe(1);
    expect(kpis.outstandingByCurrency.chf).toBe(5000);
    expect(kpis.overdueInvoiceCount).toBe(1);
  });
});
