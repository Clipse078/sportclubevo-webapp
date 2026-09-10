import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getPlatformTenantBillingDetail: vi.fn(),
  canManagePlatformBilling: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("@/lib/billing/platform-billing-detail-service", () => ({
  getPlatformTenantBillingDetail: mocks.getPlatformTenantBillingDetail,
}));

vi.mock("@/lib/billing/platform-billing-page-auth", () => ({
  canManagePlatformBilling: mocks.canManagePlatformBilling,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import PlatformCommercialBillingDetailPage from "../page";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ user: { id: "platform-admin" } });
  mocks.canManagePlatformBilling.mockResolvedValue(false);
  mocks.getPlatformTenantBillingDetail.mockResolvedValue({
    kind: "detail",
    tenant: { tenantId: "t1", tenantKey: "club", tenantName: "Club" },
    lifecycle: {
      tenantId: "t1",
      tenantKey: "club",
      tenantName: "Club",
      status: "ACTIVE",
      suspendedAt: null,
      suspensionReason: null,
      suspensionReasonNote: null,
      reactivatedAt: null,
      terminatedAt: null,
      terminationReason: null,
      terminationReasonNote: null,
    },
    stripeState: { kind: "ready" },
    billingAccount: { linkageStatus: "linked", linkedAt: null, currency: "chf" },
    summary: null,
    subscription: null,
    invoices: [],
    stripeDegraded: false,
    degradedMessage: null,
    invoicesLoadFailed: false,
    summaryLoadFailed: false,
  });
});

describe("SCE-SUPERADMIN-BILLING-01E billing detail page", () => {
  it("requires billing.view without activeTenant dependency", async () => {
    const page = await PlatformCommercialBillingDetailPage({
      params: Promise.resolve({ tenantId: "t1" }),
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1);
    expect(page).toBeTruthy();
  });

  it("loads detail by route tenantId", async () => {
    await PlatformCommercialBillingDetailPage({
      params: Promise.resolve({ tenantId: "t1" }),
    });
    expect(mocks.getPlatformTenantBillingDetail).toHaveBeenCalledWith("t1");
  });

  it("denies when authorization fails", async () => {
    mocks.requirePermission.mockImplementation(() => {
      throw new Error("redirect");
    });
    await expect(
      PlatformCommercialBillingDetailPage({
        params: Promise.resolve({ tenantId: "t1" }),
      }),
    ).rejects.toThrow("redirect");
    expect(mocks.getPlatformTenantBillingDetail).not.toHaveBeenCalled();
  });

  it("calls notFound for missing tenant", async () => {
    mocks.notFound.mockImplementation(() => {
      throw new Error("not-found");
    });
    mocks.getPlatformTenantBillingDetail.mockResolvedValue({ kind: "tenant_not_found" });
    await expect(
      PlatformCommercialBillingDetailPage({
        params: Promise.resolve({ tenantId: "missing" }),
      }),
    ).rejects.toThrow("not-found");
  });
});
