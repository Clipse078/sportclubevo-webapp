import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getPlatformBillingOverview: vi.fn(),
}));

vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("@/lib/billing/platform-billing-overview-service", () => ({
  getPlatformBillingOverview: mocks.getPlatformBillingOverview,
}));

import PlatformCommercialBillingPage from "../page";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ user: { id: "platform-admin" } });
  mocks.getPlatformBillingOverview.mockResolvedValue({
    stripeState: { kind: "ready" },
    linkedTenantCount: 0,
    rows: [],
    kpis: {
      mrrByCurrency: {},
      activeCustomerCount: 0,
      outstandingByCurrency: {},
      overdueInvoiceCount: 0,
    },
  });
});

describe("SCE-SUPERADMIN-BILLING-01D billing page authorization", () => {
  it("requires platform billing.view", async () => {
    const page = await PlatformCommercialBillingPage();
    expect(mocks.requirePermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
    expect(page).toBeTruthy();
  });

  it("denies when authorization fails (tenant admin)", async () => {
    mocks.requirePermission.mockImplementation(() => {
      throw new Error("redirect");
    });
    await expect(PlatformCommercialBillingPage()).rejects.toThrow("redirect");
    expect(mocks.getPlatformBillingOverview).not.toHaveBeenCalled();
  });

  it("renders empty overview without linked tenants", async () => {
    const page = await PlatformCommercialBillingPage();
    expect(mocks.getPlatformBillingOverview).toHaveBeenCalled();
    expect(page).toBeTruthy();
  });
});
