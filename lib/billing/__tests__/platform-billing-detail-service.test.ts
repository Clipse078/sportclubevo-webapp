import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantBillingSummary } from "@/lib/integrations/stripe/billing-types";

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  findBillingAccountByTenantId: vi.fn(),
  getTenantBillingSummary: vi.fn(),
  getTenantInvoiceHistory: vi.fn(),
  getStripeConfigStatus: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
  },
}));

vi.mock("@/lib/billing/tenant-billing-account-repository", () => ({
  findBillingAccountByTenantId: mocks.findBillingAccountByTenantId,
}));

vi.mock("@/lib/integrations/stripe/billing-read-service", () => ({
  getTenantBillingSummary: mocks.getTenantBillingSummary,
  getTenantInvoiceHistory: mocks.getTenantInvoiceHistory,
}));

vi.mock("@/lib/integrations/stripe/config", () => ({
  getStripeConfigStatus: mocks.getStripeConfigStatus,
}));

vi.mock("@/lib/tenants/platform-tenant-lifecycle-service", () => ({
  getTenantLifecycleSnapshot: vi.fn().mockResolvedValue({
    tenantId: "t1",
    tenantKey: "club-a",
    tenantName: "Club A",
    status: "ACTIVE",
    suspendedAt: null,
    suspensionReason: null,
    suspensionReasonNote: null,
    suspensionActionSource: null,
    reactivatedAt: null,
    terminatedAt: null,
    terminationReason: null,
    terminationReasonNote: null,
  }),
}));

import { getPlatformTenantBillingDetail } from "../platform-billing-detail-service";
import { StripeIntegrationError } from "@/lib/integrations/stripe/errors";

function billingSummary(overrides: Partial<TenantBillingSummary> = {}): TenantBillingSummary {
  return {
    tenantId: "t1",
    tenantKey: "club-a",
    tenantName: "Club A",
    stripeCustomerId: "cus_valid123",
    subscriptions: [
      {
        stripeSubscriptionId: "sub_1",
        status: "active",
        planName: "Pro",
        priceId: "price_1",
        productId: "prod_1",
        unitAmount: 10000,
        currency: "chf",
        interval: "month",
        intervalCount: 1,
        currentPeriodStart: "2025-01-01T00:00:00.000Z",
        currentPeriodEnd: "2025-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        trialEnd: null,
      },
    ],
    latestInvoice: null,
    outstandingAmount: 5000,
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
  mocks.tenantFindUnique.mockResolvedValue({
    id: "t1",
    key: "club-a",
    name: "Club A",
  });
  mocks.findBillingAccountByTenantId.mockResolvedValue({
    id: "acc-1",
    tenantId: "t1",
    stripeCustomerId: "cus_valid123",
    linkedAt: new Date("2025-01-01T00:00:00.000Z"),
    linkedByUserId: "u1",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    dunningStatus: "CURRENT",
    firstPaymentFailureAt: null,
    latestPaymentFailureAt: null,
    gracePeriodEndsAt: null,
    automaticallySuspendedAt: null,
    resolvedAt: null,
    lastDunningEventAt: null,
    dunningExemptUntil: null,
    dunningExemptNote: null,
    automaticDunningEnabled: true,
    lastStripeEventId: null,
  });
});

describe("getPlatformTenantBillingDetail", () => {
  it("returns tenant_not_found", async () => {
    mocks.tenantFindUnique.mockResolvedValue(null);
    const result = await getPlatformTenantBillingDetail("missing");
    expect(result.kind).toBe("tenant_not_found");
  });

  it("returns no_billing_linkage", async () => {
    mocks.findBillingAccountByTenantId.mockResolvedValue(null);
    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("no_billing_linkage");
  });

  it("returns invalid_linkage for malformed stripe customer id", async () => {
    mocks.findBillingAccountByTenantId.mockResolvedValue({
      id: "acc-1",
      tenantId: "t1",
      stripeCustomerId: "not-a-customer",
      linkedAt: new Date(),
      linkedByUserId: "u1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("invalid_linkage");
  });

  it("loads linked tenant summary and invoices via tenant id only", async () => {
    mocks.getTenantBillingSummary.mockResolvedValue(billingSummary());
    mocks.getTenantInvoiceHistory.mockResolvedValue({
      invoices: [
        {
          stripeInvoiceId: "in_2",
          number: "INV-2",
          status: "paid",
          subtotal: 10000,
          tax: 0,
          total: 10000,
          amountDue: 0,
          amountPaid: 10000,
          amountRemaining: 0,
          currency: "chf",
          createdAt: "2025-02-01T00:00:00.000Z",
          dueDate: null,
          paidAt: "2025-02-02T00:00:00.000Z",
          hostedInvoiceUrl: null,
          invoicePdfUrl: null,
        },
        {
          stripeInvoiceId: "in_1",
          number: "INV-1",
          status: "open",
          subtotal: 5000,
          tax: 0,
          total: 5000,
          amountDue: 5000,
          amountPaid: 0,
          amountRemaining: 5000,
          currency: "chf",
          createdAt: "2025-01-01T00:00:00.000Z",
          dueDate: "2025-01-15T00:00:00.000Z",
          paidAt: null,
          hostedInvoiceUrl: "https://invoice.stripe.com/i/test",
          invoicePdfUrl: null,
        },
      ],
      hasMore: false,
      nextCursor: null,
    });

    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("detail");
    if (result.kind !== "detail") return;

    expect(mocks.getTenantBillingSummary).toHaveBeenCalledWith("t1");
    expect(mocks.getTenantInvoiceHistory).toHaveBeenCalledWith({
      tenantId: "t1",
      limit: 25,
    });
    expect(result.summary?.planName).toBe("Pro");
    expect(result.invoices).toHaveLength(2);
    expect(result.invoices[0]?.number).toBe("INV-2");
    expect(result.invoices[0]?.hostedInvoiceUrl).toBeNull();
    expect(result.invoices[1]?.hostedInvoiceUrl).toBe("https://invoice.stripe.com/i/test");
    expect(result.invoices.every((inv) => !("stripeInvoiceId" in inv))).toBe(true);
  });

  it("handles no subscription", async () => {
    mocks.getTenantBillingSummary.mockResolvedValue(
      billingSummary({ subscriptions: [], outstandingAmount: 0, overdueOpenInvoiceCount: 0 }),
    );
    mocks.getTenantInvoiceHistory.mockResolvedValue({
      invoices: [],
      hasMore: false,
      nextCursor: null,
    });

    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("detail");
    if (result.kind !== "detail") return;
    expect(result.subscription).toBeNull();
    expect(result.summary?.monthlyRecurringMinorUnits).toBe(0);
  });

  it("handles stripe not configured", async () => {
    mocks.getStripeConfigStatus.mockReturnValue({
      hasSecretKey: false,
      providerEnabled: false,
      allValid: false,
    });

    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("detail");
    if (result.kind !== "detail") return;
    expect(result.stripeState.kind).toBe("not_configured");
    expect(mocks.getTenantBillingSummary).not.toHaveBeenCalled();
  });

  it("degrades when stripe summary fails but keeps tenant context", async () => {
    mocks.getTenantBillingSummary.mockRejectedValue(
      new StripeIntegrationError("STRIPE_UNAVAILABLE", "down"),
    );
    mocks.getTenantInvoiceHistory.mockResolvedValue({
      invoices: [],
      hasMore: false,
      nextCursor: null,
    });

    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("detail");
    if (result.kind !== "detail") return;
    expect(result.summaryLoadFailed).toBe(true);
    expect(result.stripeDegraded).toBe(true);
    expect(result.degradedMessage).toContain("nicht vollständig");
  });

  it("degrades when invoice load fails but summary succeeds", async () => {
    mocks.getTenantBillingSummary.mockResolvedValue(billingSummary());
    mocks.getTenantInvoiceHistory.mockRejectedValue(
      new StripeIntegrationError("STRIPE_UNAVAILABLE", "down"),
    );

    const result = await getPlatformTenantBillingDetail("t1");
    expect(result.kind).toBe("detail");
    if (result.kind !== "detail") return;
    expect(result.summary?.planName).toBe("Pro");
    expect(result.invoicesLoadFailed).toBe(true);
    expect(result.invoices).toHaveLength(0);
  });
});
