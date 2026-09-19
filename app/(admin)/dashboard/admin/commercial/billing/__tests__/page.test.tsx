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

vi.mock("@/lib/billing/billing-inbound/billing-inbound-operations-service", () => ({
  getBillingCommunicationOperationsSnapshot: vi.fn().mockResolvedValue({
    mailbox: {
      configured: false,
      enabled: false,
      mailboxKey: "billing@sportclubevo.com",
      lastSyncAt: null,
      lastSyncStatus: null,
      lastError: null,
      uidValidity: null,
      lastProcessedUid: null,
      unresolvedCount: 0,
      cronHealth: "NOT_CONFIGURED",
      cronHealthLabel: "Inbound-E-Mail nicht konfiguriert",
    },
    unresolved: [],
    retentionPolicy: {},
    malwareScanning: { status: "NOT_CONFIGURED", operatorNote: "" },
  }),
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
