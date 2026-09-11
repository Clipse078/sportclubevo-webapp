import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  getInvoicePaymentInstruction: vi.fn(),
  createInvoicePaymentInstruction: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/invoice-payment-instruction-service", () => ({
  getInvoicePaymentInstruction: mocks.getInvoicePaymentInstruction,
  createInvoicePaymentInstruction: mocks.createInvoicePaymentInstruction,
}));

import { GET, POST } from "../invoices/[invoiceKey]/payment-instruction/route";
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

describe("invoice payment instruction API", () => {
  it("requires billing.view for GET", async () => {
    mocks.getInvoicePaymentInstruction.mockResolvedValue(null);
    await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("requires billing.manage for POST", async () => {
    mocks.createInvoicePaymentInstruction.mockResolvedValue({
      id: "pi-1",
      invoiceId: "inv-1",
      billingBankAccountId: "ba-1",
      paymentMethod: "BANK_TRANSFER_SWISS_QR",
      referenceType: "NON",
      reference: null,
      amountMinor: 100,
      currency: "CHF",
      creditorAccountMasked: "****2957",
      additionalInformation: null,
      createdAt: new Date(),
    });
    await POST(new NextRequest("http://localhost"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });
});
