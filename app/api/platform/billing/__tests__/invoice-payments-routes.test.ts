import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  getInvoicePaymentSummary: vi.fn(),
  recordInvoicePayment: vi.fn(),
  reverseInvoicePayment: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/invoice-payments/invoice-payment-service", () => ({
  getInvoicePaymentSummary: mocks.getInvoicePaymentSummary,
  recordInvoicePayment: mocks.recordInvoicePayment,
  reverseInvoicePayment: mocks.reverseInvoicePayment,
}));

vi.mock("@/lib/billing/invoice-payments/invoice-payment-serializers", () => ({
  serializeInvoicePaymentSummary: (s: unknown) => s,
}));

const { GET, POST } = await import("../invoices/[invoiceKey]/payments/route");
const { POST: POST_REVERSE } = await import(
  "../invoices/[invoiceKey]/payments/[paymentKey]/reverse/route"
);

const summary = {
  grossTotalMinor: 100,
  paidTotalMinor: 0,
  outstandingMinor: 100,
  currency: "CHF",
  payments: [],
};

describe("invoice payments routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: true,
      actorUserId: "user-1",
    });
    mocks.getInvoicePaymentSummary.mockResolvedValue(summary);
    mocks.recordInvoicePayment.mockResolvedValue({
      payment: { key: "pay-key" },
      summary,
    });
    mocks.reverseInvoicePayment.mockResolvedValue({ summary });
  });

  it("GET requires BILLING_VIEW", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      error: "Forbidden",
      status: 403,
    });
    const res = await GET(
      new NextRequest("http://localhost/api/platform/billing/invoices/k/payments"),
      { params: Promise.resolve({ invoiceKey: "k" }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(
      PERMISSIONS.BILLING_VIEW,
    );
  });

  it("POST requires BILLING_MANAGE", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      error: "Forbidden",
      status: 403,
    });
    const res = await POST(
      new NextRequest("http://localhost/api/platform/billing/invoices/k/payments", {
        method: "POST",
        body: JSON.stringify({ amountMinor: 100, paymentDate: "2026-09-12" }),
      }),
      { params: Promise.resolve({ invoiceKey: "k" }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(
      PERMISSIONS.BILLING_MANAGE,
    );
  });

  it("authorized POST records payment", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/platform/billing/invoices/k/payments", {
        method: "POST",
        body: JSON.stringify({
          amountMinor: 100,
          currency: "CHF",
          paymentDate: "2026-09-12",
        }),
      }),
      { params: Promise.resolve({ invoiceKey: "k" }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.recordInvoicePayment).toHaveBeenCalled();
  });

  it("reverse route requires BILLING_MANAGE", async () => {
    const res = await POST_REVERSE(
      new NextRequest("http://localhost/api/platform/billing/invoices/k/payments/p/reverse", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      }),
      { params: Promise.resolve({ invoiceKey: "k", paymentKey: "p" }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.reverseInvoicePayment).toHaveBeenCalledWith({
      paymentKey: "p",
      reason: "test",
      actorUserId: "user-1",
    });
  });
});
