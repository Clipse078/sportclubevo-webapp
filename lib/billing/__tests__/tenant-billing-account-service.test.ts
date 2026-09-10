import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TenantBillingAccountRecord } from "../tenant-billing-account-types";

const mocks = vi.hoisted(() => ({
  findBillingAccountByTenantId: vi.fn(),
  findBillingAccountByStripeCustomerId: vi.fn(),
  tenantExistsById: vi.fn(),
  createBillingAccount: vi.fn(),
  updateBillingAccountStripeCustomerId: vi.fn(),
  deleteBillingAccountByTenantId: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../tenant-billing-account-repository", () => ({
  findBillingAccountByTenantId: mocks.findBillingAccountByTenantId,
  findBillingAccountByStripeCustomerId: mocks.findBillingAccountByStripeCustomerId,
  tenantExistsById: mocks.tenantExistsById,
  createBillingAccount: mocks.createBillingAccount,
  updateBillingAccountStripeCustomerId: mocks.updateBillingAccountStripeCustomerId,
  deleteBillingAccountByTenantId: mocks.deleteBillingAccountByTenantId,
  findTenantIdByKey: vi.fn(),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const {
  linkTenantStripeCustomer,
  unlinkTenantStripeCustomer,
  getTenantBillingAccount,
} = await import("../tenant-billing-account-service");

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const ACTOR = "actor-1";
const CUS_A = "cus_AAAAAAAAAAAAAA";
const CUS_B = "cus_BBBBBBBBBBBBBB";

function account(overrides: Partial<TenantBillingAccountRecord> = {}): TenantBillingAccountRecord {
  return {
    id: "billing-1",
    tenantId: TENANT_A,
    stripeCustomerId: CUS_A,
    linkedAt: new Date("2026-09-01T00:00:00.000Z"),
    linkedByUserId: ACTOR,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
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
    ...overrides,
  };
}

describe("tenant billing account service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantExistsById.mockResolvedValue(true);
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("getTenantBillingAccount delegates to repository", async () => {
    mocks.findBillingAccountByTenantId.mockResolvedValue(account());
    await expect(getTenantBillingAccount(TENANT_A)).resolves.toEqual(account());
  });

  it("rejects unknown tenant on link", async () => {
    mocks.tenantExistsById.mockResolvedValue(false);
    await expect(
      linkTenantStripeCustomer({ tenantId: TENANT_A, stripeCustomerId: CUS_A, actorUserId: ACTOR }),
    ).rejects.toMatchObject({ name: "BillingTenantNotFoundError" });
  });

  it("rejects malformed stripe customer id", async () => {
    await expect(
      linkTenantStripeCustomer({ tenantId: TENANT_A, stripeCustomerId: "bad", actorUserId: ACTOR }),
    ).rejects.toMatchObject({ name: "BillingValidationError" });
  });

  it("rejects stripe customer already linked to another tenant", async () => {
    mocks.findBillingAccountByStripeCustomerId.mockResolvedValue(account({ tenantId: TENANT_B }));
    mocks.findBillingAccountByTenantId.mockResolvedValue(null);
    await expect(
      linkTenantStripeCustomer({ tenantId: TENANT_A, stripeCustomerId: CUS_A, actorUserId: ACTOR }),
    ).rejects.toMatchObject({ name: "BillingCustomerAlreadyLinkedError" });
  });

  it("creates linkage and audits LINKED", async () => {
    mocks.findBillingAccountByStripeCustomerId.mockResolvedValue(null);
    mocks.findBillingAccountByTenantId.mockResolvedValue(null);
    const created = account();
    mocks.createBillingAccount.mockResolvedValue(created);

    const result = await linkTenantStripeCustomer({
      tenantId: TENANT_A,
      stripeCustomerId: CUS_A,
      actorUserId: ACTOR,
    });

    expect(result).toEqual(created);
    expect(mocks.createBillingAccount).toHaveBeenCalledWith({
      tenantId: TENANT_A,
      stripeCustomerId: CUS_A,
      linkedByUserId: ACTOR,
    });
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BILLING_ACCOUNT_LINKED" }),
    );
  });

  it("is idempotent when the same customer is already linked", async () => {
    const existing = account();
    mocks.findBillingAccountByStripeCustomerId.mockResolvedValue(existing);
    mocks.findBillingAccountByTenantId.mockResolvedValue(existing);

    const result = await linkTenantStripeCustomer({
      tenantId: TENANT_A,
      stripeCustomerId: CUS_A,
      actorUserId: ACTOR,
    });

    expect(result).toEqual(existing);
    expect(mocks.createBillingAccount).not.toHaveBeenCalled();
    expect(mocks.updateBillingAccountStripeCustomerId).not.toHaveBeenCalled();
    expect(mocks.logAction).not.toHaveBeenCalled();
  });

  it("changes customer id and audits CHANGED", async () => {
    const existing = account({ stripeCustomerId: CUS_A });
    const updated = account({ stripeCustomerId: CUS_B });
    mocks.findBillingAccountByStripeCustomerId.mockResolvedValue(null);
    mocks.findBillingAccountByTenantId.mockResolvedValue(existing);
    mocks.updateBillingAccountStripeCustomerId.mockResolvedValue(updated);

    const result = await linkTenantStripeCustomer({
      tenantId: TENANT_A,
      stripeCustomerId: CUS_B,
      actorUserId: ACTOR,
    });

    expect(result.stripeCustomerId).toBe(CUS_B);
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BILLING_ACCOUNT_CHANGED" }),
    );
  });

  it("unlink removes linkage and audits UNLINKED", async () => {
    const existing = account();
    mocks.deleteBillingAccountByTenantId.mockResolvedValue(existing);

    await unlinkTenantStripeCustomer({ tenantId: TENANT_A, actorUserId: ACTOR });

    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BILLING_ACCOUNT_UNLINKED" }),
    );
  });

  it("unlink is idempotent when no linkage exists", async () => {
    mocks.deleteBillingAccountByTenantId.mockResolvedValue(null);
    await unlinkTenantStripeCustomer({ tenantId: TENANT_A, actorUserId: ACTOR });
    expect(mocks.logAction).not.toHaveBeenCalled();
  });
});
