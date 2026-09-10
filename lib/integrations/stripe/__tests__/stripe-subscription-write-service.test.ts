import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findBillingAccountByTenantId: vi.fn(),
  getStripeConfigStatus: vi.fn(),
  subscriptionsList: vi.fn(),
  subscriptionsUpdate: vi.fn(),
}));

vi.mock("@/lib/billing/tenant-billing-account-repository", () => ({
  findBillingAccountByTenantId: mocks.findBillingAccountByTenantId,
}));

vi.mock("../config", () => ({
  getStripeConfigStatus: mocks.getStripeConfigStatus,
}));

vi.mock("../client", () => ({
  getStripeClient: () => ({
    subscriptions: {
      list: mocks.subscriptionsList,
      update: mocks.subscriptionsUpdate,
    },
  }),
}));

import { setSubscriptionCancelAtPeriodEnd } from "../stripe-subscription-write-service";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStripeConfigStatus.mockReturnValue({ allValid: true, hasSecretKey: true, providerEnabled: true });
  mocks.findBillingAccountByTenantId.mockResolvedValue({
    tenantId: "t1",
    stripeCustomerId: "cus_1",
  });
  mocks.subscriptionsList.mockResolvedValue({
    data: [
      {
        id: "sub_1",
        status: "active",
        cancel_at_period_end: false,
        trial_end: null,
        items: {
          data: [
            {
              current_period_start: 1,
              current_period_end: 2,
              price: { id: "price_1", currency: "chf", unit_amount: 100, product: { id: "p", name: "Pro" } },
            },
          ],
        },
      },
    ],
  });
  mocks.subscriptionsUpdate.mockResolvedValue({
    id: "sub_1",
    status: "active",
    cancel_at_period_end: true,
    trial_end: null,
    items: {
      data: [
        {
          current_period_start: 1,
          current_period_end: 2,
          price: { id: "price_1", currency: "chf", unit_amount: 100, product: { id: "p", name: "Pro" } },
        },
      ],
    },
  });
});

describe("stripe-subscription-write-service", () => {
  it("sets cancel_at_period_end using tenant linkage only", async () => {
    const result = await setSubscriptionCancelAtPeriodEnd("t1", true);
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith(
      "sub_1",
      { cancel_at_period_end: true },
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it("rejects when billing account missing", async () => {
    mocks.findBillingAccountByTenantId.mockResolvedValue(null);
    await expect(setSubscriptionCancelAtPeriodEnd("t1", true)).rejects.toMatchObject({
      code: "NO_BILLING_ACCOUNT",
    });
  });
});
