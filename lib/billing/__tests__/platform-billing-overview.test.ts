import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantBillingSummary } from "@/lib/integrations/stripe/billing-types";

const mocks = vi.hoisted(() => ({
  findAllLinkedTenantBillingAccounts: vi.fn(),
  getTenantBillingSummary: vi.fn(),
  getStripeConfigStatus: vi.fn(),
}));

vi.mock("@/lib/billing/tenant-billing-account-repository", () => ({
  findAllLinkedTenantBillingAccounts: mocks.findAllLinkedTenantBillingAccounts,
}));

vi.mock("@/lib/integrations/stripe/billing-read-service", () => ({
  getTenantBillingSummary: mocks.getTenantBillingSummary,
}));

vi.mock("@/lib/integrations/stripe/config", () => ({
  getStripeConfigStatus: mocks.getStripeConfigStatus,
}));

import { getPlatformBillingOverview } from "../platform-billing-overview-service";
import { StripeIntegrationError } from "@/lib/integrations/stripe/errors";

function summary(overrides: Partial<TenantBillingSummary> = {}): TenantBillingSummary {
  return {
    tenantId: "t1",
    tenantKey: "club-a",
    tenantName: "Club A",
    stripeCustomerId: "cus_a",
    subscriptions: [
      {
        stripeSubscriptionId: "sub_1",
        status: "active",
        planName: "Plan",
        priceId: "price_1",
        productId: "prod_1",
        unitAmount: 10000,
        currency: "chf",
        interval: "month",
        intervalCount: 1,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ],
    latestInvoice: {
      stripeInvoiceId: "in_1",
      number: "INV-1",
      status: "open",
      subtotal: 10000,
      tax: 0,
      total: 10000,
      amountDue: 10000,
      amountPaid: 0,
      amountRemaining: 10000,
      currency: "chf",
      createdAt: "2025-01-01T00:00:00.000Z",
      dueDate: "2024-12-01T00:00:00.000Z",
      paidAt: null,
      hostedInvoiceUrl: null,
      invoicePdfUrl: null,
    },
    outstandingAmount: 10000,
    overdueOpenInvoiceCount: 1,
    currency: "chf",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStripeConfigStatus.mockReturnValue({
    hasSecretKey: true,
    keyMode: "test",
    keyFormatValid: true,
    providerEnabled: true,
    runtimeAllowsKeyMode: true,
    allValid: true,
  });
});

describe("getPlatformBillingOverview", () => {
  it("returns empty state when no linked tenants", async () => {
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([]);

    const overview = await getPlatformBillingOverview();
    expect(overview.linkedTenantCount).toBe(0);
    expect(overview.rows).toEqual([]);
    expect(mocks.getTenantBillingSummary).not.toHaveBeenCalled();
  });

  it("loads active subscription summary for linked tenant", async () => {
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([
      {
        tenantId: "t1",
        tenantKey: "club-a",
        tenantName: "Club A",
        stripeCustomerId: "cus_a",
      },
    ]);
    mocks.getTenantBillingSummary.mockResolvedValue(summary());

    const overview = await getPlatformBillingOverview();
    expect(overview.rows[0]?.kind).toBe("loaded");
    expect(overview.kpis.activeCustomerCount).toBe(1);
  });

  it("handles tenant without subscription", async () => {
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([
      {
        tenantId: "t1",
        tenantKey: "club-a",
        tenantName: "Club A",
        stripeCustomerId: "cus_a",
      },
    ]);
    mocks.getTenantBillingSummary.mockResolvedValue(
      summary({ subscriptions: [], outstandingAmount: 0, overdueOpenInvoiceCount: 0 }),
    );

    const overview = await getPlatformBillingOverview();
    expect(overview.kpis.activeCustomerCount).toBe(0);
  });

  it("aggregates paid and open invoice scenarios via summaries", async () => {
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([
      {
        tenantId: "t1",
        tenantKey: "a",
        tenantName: "A",
        stripeCustomerId: "cus_a",
      },
      {
        tenantId: "t2",
        tenantKey: "b",
        tenantName: "B",
        stripeCustomerId: "cus_b",
      },
    ]);
    mocks.getTenantBillingSummary
      .mockResolvedValueOnce(summary())
      .mockResolvedValueOnce(
        summary({
          tenantId: "t2",
          tenantKey: "b",
          tenantName: "B",
          outstandingAmount: 0,
          overdueOpenInvoiceCount: 0,
          latestInvoice: {
            ...summary().latestInvoice!,
            status: "paid",
            amountRemaining: 0,
          },
        }),
      );

    const overview = await getPlatformBillingOverview();
    expect(overview.kpis.outstandingByCurrency.chf).toBe(10000);
    expect(overview.kpis.overdueInvoiceCount).toBe(1);
  });

  it("continues when one tenant Stripe load fails", async () => {
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([
      {
        tenantId: "t1",
        tenantKey: "a",
        tenantName: "A",
        stripeCustomerId: "cus_a",
      },
      {
        tenantId: "t2",
        tenantKey: "b",
        tenantName: "B",
        stripeCustomerId: "cus_b",
      },
    ]);
    mocks.getTenantBillingSummary
      .mockRejectedValueOnce(new StripeIntegrationError("STRIPE_UNAVAILABLE", "down"))
      .mockResolvedValueOnce(summary({ tenantId: "t2", tenantKey: "b", tenantName: "B" }));

    const overview = await getPlatformBillingOverview();
    expect(overview.rows).toHaveLength(2);
    expect(overview.rows[0]?.kind).toBe("error");
    expect(overview.rows[1]?.kind).toBe("loaded");
  });

  it("marks stripe not configured without calling tenant summaries", async () => {
    mocks.getStripeConfigStatus.mockReturnValue({
      hasSecretKey: false,
      keyMode: null,
      keyFormatValid: false,
      providerEnabled: false,
      runtimeAllowsKeyMode: false,
      allValid: false,
    });
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([
      {
        tenantId: "t1",
        tenantKey: "a",
        tenantName: "A",
        stripeCustomerId: "cus_a",
      },
    ]);

    const overview = await getPlatformBillingOverview();
    expect(overview.stripeState.kind).toBe("not_configured");
    expect(mocks.getTenantBillingSummary).not.toHaveBeenCalled();
    expect(overview.rows[0]?.kind).toBe("error");
  });

  it("loads multiple linked tenants", async () => {
    mocks.findAllLinkedTenantBillingAccounts.mockResolvedValue([
      {
        tenantId: "t1",
        tenantKey: "a",
        tenantName: "A",
        stripeCustomerId: "cus_a",
      },
      {
        tenantId: "t2",
        tenantKey: "b",
        tenantName: "B",
        stripeCustomerId: "cus_b",
      },
    ]);
    mocks.getTenantBillingSummary.mockResolvedValue(summary());

    const overview = await getPlatformBillingOverview();
    expect(overview.rows).toHaveLength(2);
    expect(mocks.getTenantBillingSummary).toHaveBeenCalledTimes(2);
  });
});
