import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  tenantUpdate: vi.fn(),
  scheduleSubscriptionEndAtPeriod: vi.fn(),
  undoSubscriptionCancellation: vi.fn(),
  resolveTenantPrimarySubscription: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: mocks.tenantFindUnique,
      update: mocks.tenantUpdate,
    },
  },
}));

vi.mock("@/lib/integrations/stripe/stripe-subscription-write-service", () => ({
  scheduleSubscriptionEndAtPeriod: mocks.scheduleSubscriptionEndAtPeriod,
  undoSubscriptionCancellation: mocks.undoSubscriptionCancellation,
  resolveTenantPrimarySubscription: mocks.resolveTenantPrimarySubscription,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

import {
  reactivatePlatformTenant,
  suspendPlatformTenant,
  terminatePlatformTenant,
} from "../platform-tenant-lifecycle-service";

const baseTenant = {
  id: "t1",
  key: "club-a",
  name: "Club A",
  status: "ACTIVE" as const,
  suspendedAt: null,
  suspensionReason: null,
  suspensionReasonNote: null,
  reactivatedAt: null,
  terminatedAt: null,
  terminationReason: null,
  terminationReasonNote: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tenantFindUnique.mockResolvedValue(baseTenant);
  mocks.tenantUpdate.mockImplementation(async ({ data }: { data: { status: string } }) => ({
    ...baseTenant,
    ...data,
  }));
});

describe("platform-tenant-lifecycle-service", () => {
  it("suspends ACTIVE tenant with KEEP_BILLING without Stripe", async () => {
    const result = await suspendPlatformTenant({
      tenantId: "t1",
      actorUserId: "admin",
      reason: "NON_PAYMENT",
      billingBehavior: "KEEP_BILLING",
    });
    expect(result.ok).toBe(true);
    expect(mocks.scheduleSubscriptionEndAtPeriod).not.toHaveBeenCalled();
    expect(mocks.tenantUpdate).toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalled();
  });

  it("schedules Stripe cancellation before suspend when requested", async () => {
    mocks.scheduleSubscriptionEndAtPeriod.mockResolvedValue({
      stripeSubscriptionId: "sub_1",
      status: "active",
      cancelAtPeriodEnd: true,
    });
    const result = await suspendPlatformTenant({
      tenantId: "t1",
      actorUserId: "admin",
      reason: "ADMINISTRATIVE",
      billingBehavior: "SCHEDULE_CANCELLATION",
    });
    expect(result.ok).toBe(true);
    expect(mocks.scheduleSubscriptionEndAtPeriod).toHaveBeenCalledWith("t1");
  });

  it("does not suspend locally when Stripe fails", async () => {
    mocks.scheduleSubscriptionEndAtPeriod.mockRejectedValue(new Error("stripe down"));
    const result = await suspendPlatformTenant({
      tenantId: "t1",
      actorUserId: "admin",
      reason: "ADMINISTRATIVE",
      billingBehavior: "SCHEDULE_CANCELLATION",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("STRIPE_FAILED");
    }
    expect(mocks.tenantUpdate).not.toHaveBeenCalled();
  });

  it("reactivates SUSPENDED tenant", async () => {
    mocks.tenantFindUnique.mockResolvedValue({ ...baseTenant, status: "SUSPENDED" });
    const result = await reactivatePlatformTenant({
      tenantId: "t1",
      actorUserId: "admin",
      undoScheduledStripeCancellation: false,
    });
    expect(result.ok).toBe(true);
    expect(mocks.tenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("rejects terminate from ARCHIVED", async () => {
    mocks.tenantFindUnique.mockResolvedValue({ ...baseTenant, status: "ARCHIVED" });
    const result = await terminatePlatformTenant({
      tenantId: "t1",
      actorUserId: "admin",
      reason: "CONTRACT_ENDED",
    });
    expect(result.ok).toBe(false);
  });

  it("is idempotent when already suspended", async () => {
    mocks.tenantFindUnique.mockResolvedValue({ ...baseTenant, status: "SUSPENDED" });
    const result = await suspendPlatformTenant({
      tenantId: "t1",
      actorUserId: "admin",
      reason: "NON_PAYMENT",
      billingBehavior: "KEEP_BILLING",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe("already_suspended");
    }
    expect(mocks.tenantUpdate).not.toHaveBeenCalled();
  });
});
