import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findBillingAccountByStripeCustomerId: vi.fn(),
  findBillingAccountByTenantId: vi.fn(),
  updateTenantBillingAccountDunning: vi.fn(),
  getTenantBillingSummary: vi.fn(),
  getTenantOpenInvoicesForDelinquency: vi.fn(),
  suspendPlatformTenant: vi.fn(),
  reactivatePlatformTenant: vi.fn(),
  tenantFindUnique: vi.fn(),
  logAction: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/billing/tenant-billing-account-repository", () => ({
  findBillingAccountByStripeCustomerId: mocks.findBillingAccountByStripeCustomerId,
  findBillingAccountByTenantId: mocks.findBillingAccountByTenantId,
  updateTenantBillingAccountDunning: mocks.updateTenantBillingAccountDunning,
  findGracePeriodBillingAccountsDue: vi.fn().mockResolvedValue([]),
  findBillingAccountsForDunningReconciliation: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/integrations/stripe/billing-read-service", () => ({
  getTenantBillingSummary: mocks.getTenantBillingSummary,
  getTenantOpenInvoicesForDelinquency: mocks.getTenantOpenInvoicesForDelinquency,
}));

vi.mock("@/lib/tenants/platform-tenant-lifecycle-service", () => ({
  suspendPlatformTenant: mocks.suspendPlatformTenant,
  reactivatePlatformTenant: mocks.reactivatePlatformTenant,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: mocks.tenantFindUnique },
    tenantBillingAccount: { count: vi.fn().mockResolvedValue(0) },
    $transaction: mocks.transaction,
  },
}));

mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({ $queryRawUnsafe: vi.fn() }),
);

import {
  attemptAutomaticReactivation,
  handlePaymentFailure,
} from "../platform-dunning-service";

const baseAccount = {
  id: "b1",
  tenantId: "t1",
  stripeCustomerId: "cus_1",
  linkedAt: new Date(),
  linkedByUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  dunningStatus: "CURRENT" as const,
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
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findBillingAccountByStripeCustomerId.mockResolvedValue(baseAccount);
  mocks.findBillingAccountByTenantId.mockResolvedValue(baseAccount);
  mocks.tenantFindUnique.mockResolvedValue({
    id: "t1",
    status: "ACTIVE",
    suspensionReason: null,
    suspensionActionSource: null,
  });
  mocks.updateTenantBillingAccountDunning.mockImplementation(async (_id, data) => ({
    ...baseAccount,
    ...data,
  }));
});

describe("platform-dunning-service", () => {
  it("starts grace on first payment failure", async () => {
    const result = await handlePaymentFailure({
      stripeCustomerId: "cus_1",
      eventAt: new Date("2026-09-01T12:00:00.000Z"),
      stripeEventId: "evt_1",
    });
    expect(result).toBe("started_grace");
    expect(mocks.updateTenantBillingAccountDunning).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ dunningStatus: "GRACE_PERIOD" }),
    );
  });

  it("does not extend grace on repeated failure", async () => {
    const graceEnd = new Date("2026-09-15T12:00:00.000Z");
    mocks.findBillingAccountByTenantId.mockResolvedValue({
      ...baseAccount,
      dunningStatus: "GRACE_PERIOD",
      firstPaymentFailureAt: new Date("2026-09-01T12:00:00.000Z"),
      gracePeriodEndsAt: graceEnd,
    });
    const result = await handlePaymentFailure({
      stripeCustomerId: "cus_1",
      eventAt: new Date("2026-09-05T12:00:00.000Z"),
      stripeEventId: "evt_2",
    });
    expect(result).toBe("updated_grace");
    expect(mocks.updateTenantBillingAccountDunning).toHaveBeenCalledWith(
      "t1",
      expect.not.objectContaining({ gracePeriodEndsAt: expect.anything() }),
    );
  });

  it("blocks auto reactivation for administrative suspension", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1",
      status: "SUSPENDED",
      suspensionReason: "ADMINISTRATIVE",
      suspensionActionSource: "MANUAL",
    });
    const result = await attemptAutomaticReactivation({ tenantId: "t1" });
    expect(result).toBe("blocked");
    expect(mocks.reactivatePlatformTenant).not.toHaveBeenCalled();
  });

  it("reactivates only dunning-owned non-payment suspension", async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      id: "t1",
      status: "SUSPENDED",
      suspensionReason: "NON_PAYMENT",
      suspensionActionSource: "DUNNING_AUTOMATION",
    });
    mocks.reactivatePlatformTenant.mockResolvedValue({
      ok: true,
      outcome: "applied",
      previousStatus: "SUSPENDED",
      newStatus: "ACTIVE",
      tenant: {},
    });
    const result = await attemptAutomaticReactivation({ tenantId: "t1" });
    expect(result).toBe("reactivated");
    expect(mocks.reactivatePlatformTenant).toHaveBeenCalledWith(
      expect.objectContaining({ actionSource: "DUNNING_AUTOMATION" }),
    );
  });
});
