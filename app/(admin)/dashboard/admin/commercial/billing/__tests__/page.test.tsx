import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getBillingOperationsDashboard: vi.fn(),
}));

vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("@/lib/billing/operations/billing-operations-service", () => ({
  getBillingOperationsDashboard: mocks.getBillingOperationsDashboard,
}));

vi.mock("@/lib/billing/billing-inbound/billing-inbound-mailbox-repository", () => ({
  countBillingInboundUnresolvedMessages: vi.fn().mockResolvedValue(0),
}));

import PlatformCommercialBillingPage from "../page";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const emptyDashboard = {
  metrics: {
    activeCustomerCount: 0,
    activeContractCount: 0,
    openInvoiceCount: 0,
    overdueInvoiceCount: 0,
    attentionInvoiceCount: 0,
    chf: {
      currency: "CHF",
      openReceivablesMinor: 0,
      overdueReceivablesMinor: 0,
      paidThisMonthMinor: 0,
    },
  },
  attention: [],
  activity: [],
  reconciliation: {
    unmatchedTransactionCount: 0,
    reviewRequiredTransactionCount: 0,
    latestImportKey: null,
    latestImportFilename: null,
    latestImportUploadedAt: null,
    latestImportStatus: null,
    legalEntityKey: null,
    reconciliationHref: "/dashboard/admin/commercial/billing/reconciliation",
  },
  customerBalances: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ user: { id: "platform-admin" } });
  mocks.getBillingOperationsDashboard.mockResolvedValue(emptyDashboard);
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
    expect(mocks.getBillingOperationsDashboard).not.toHaveBeenCalled();
  });

  it("renders SCE operations dashboard empty state", async () => {
    const page = await PlatformCommercialBillingPage();
    expect(mocks.getBillingOperationsDashboard).toHaveBeenCalled();
    expect(page).toBeTruthy();
  });
});
