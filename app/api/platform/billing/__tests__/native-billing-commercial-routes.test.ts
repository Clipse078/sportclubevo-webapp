import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  getBillingContractsOverview: vi.fn(),
  getBillingProductsCatalogue: vi.fn(),
  createBillingContract: vi.fn(),
  getInvoicesOverview: vi.fn(),
  createDraftInvoiceFromContract: vi.fn(),
  finalizeInvoice: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/native-billing-commercial-service", () => ({
  getBillingContractsOverview: mocks.getBillingContractsOverview,
  getBillingProductsCatalogue: mocks.getBillingProductsCatalogue,
  createBillingContract: mocks.createBillingContract,
  getBillingContractDetail: vi.fn(),
  updateBillingContract: vi.fn(),
  getInvoicesOverview: mocks.getInvoicesOverview,
  createDraftInvoiceFromContract: mocks.createDraftInvoiceFromContract,
  getInvoiceDetail: vi.fn(),
  updateDraftInvoice: vi.fn(),
  finalizeInvoice: mocks.finalizeInvoice,
}));

import { GET as listContracts, POST as createContract } from "../contracts/route";
import { GET as listInvoices, POST as createInvoice } from "../invoices/route";
import { POST as finalize } from "../invoices/[invoiceKey]/finalize/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformApiPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    actorUserId: "platform-admin",
  });
});

describe("native billing commercial API authorization", () => {
  it("requires billing.view for contract list", async () => {
    mocks.getBillingContractsOverview.mockResolvedValue([]);
    mocks.getBillingProductsCatalogue.mockResolvedValue([]);
    await listContracts();
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("requires billing.manage for contract create", async () => {
    mocks.createBillingContract.mockResolvedValue({
      id: "c1",
      key: "c-key",
      contractNumber: "2026-1",
      legalEntityId: "le1",
      billingCustomerId: "bc1",
      billingProductId: null,
      productName: "Platform",
      productDescription: null,
      status: "DRAFT",
      currency: "CHF",
      monthlyNetAmountMinor: 19900,
      billingInterval: "MONTHLY",
      vatTreatment: "STANDARD_81",
      startDate: new Date("2026-01-01"),
      endDate: null,
      minimumTermMonths: null,
      paymentTermsDays: 30,
      invoiceRecipientProfileId: null,
      description: null,
      internalNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createContract(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          legalEntityId: "le1",
          billingCustomerId: "bc1",
          contractNumber: "2026-1",
          monthlyNetAmountMinor: 19900,
          startDate: "2026-01-01",
        }),
      }),
    );

    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("requires billing.manage to finalize invoice", async () => {
    mocks.finalizeInvoice.mockResolvedValue({
      id: "i1",
      key: "inv",
      invoiceNumber: "2026-000001",
      legalEntityId: "le1",
      billingCustomerId: "bc1",
      billingContractId: "c1",
      status: "FINALIZED",
      currency: "CHF",
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-30"),
      invoiceDate: new Date("2026-09-01"),
      dueDate: new Date("2026-10-01"),
      paymentTermsDays: 30,
      netTotalMinor: 19900,
      vatTotalMinor: 1612,
      grossTotalMinor: 21512,
      contractLabel: null,
      finalizedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await finalize(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ invoiceKey: "inv" }),
    });

    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("denies without platform permission", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    mocks.getInvoicesOverview.mockResolvedValue([]);
    const res = await listInvoices();
    expect(res.status).toBe(403);
  });
});
