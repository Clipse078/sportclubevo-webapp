import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  sendNativeInvoiceEmail: vi.fn(),
  findInvoiceByKey: vi.fn(),
  listInvoiceDeliveriesForInvoiceId: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/invoice-delivery/invoice-delivery-service", () => ({
  sendNativeInvoiceEmail: mocks.sendNativeInvoiceEmail,
}));

vi.mock("@/lib/billing/invoice-delivery/invoice-delivery-summary", () => ({
  buildInvoiceDeliverySummary: vi.fn(() => ({
    aggregateStatus: "SENT",
    latestSentAt: new Date(),
    latestRecipientEmail: "a@b.test",
    lastSuccessfulAttemptNumber: 1,
    attempts: [],
  })),
}));

vi.mock("@/lib/billing/invoice-delivery/invoice-delivery-repository", () => ({
  listInvoiceDeliveriesForInvoiceId: mocks.listInvoiceDeliveriesForInvoiceId,
}));

vi.mock("@/lib/billing/native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
}));

const { POST } = await import("../invoices/[invoiceKey]/send/route");

describe("invoice send route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: true,
      actorUserId: "user-1",
    });
    mocks.sendNativeInvoiceEmail.mockResolvedValue({
      delivery: {
        key: "del-key",
        status: "SENT",
        attemptNumber: 1,
        sentAt: new Date(),
        recipientEmail: "a@b.test",
      },
      aggregateStatus: "SENT",
    });
    mocks.findInvoiceByKey.mockResolvedValue({ id: "inv-1" });
    mocks.listInvoiceDeliveriesForInvoiceId.mockResolvedValue([]);
  });

  it("requires billing manage permission", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      error: "Forbidden",
      status: 403,
    });
    const res = await POST(
      new NextRequest("http://localhost/api/platform/billing/invoices/k/send", {
        method: "POST",
        body: JSON.stringify({ resend: false }),
      }),
      { params: Promise.resolve({ invoiceKey: "k" }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(
      PERMISSIONS.BILLING_MANAGE,
    );
  });

  it("authorized user can send", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/platform/billing/invoices/k/send", {
        method: "POST",
        body: JSON.stringify({ resend: false }),
      }),
      { params: Promise.resolve({ invoiceKey: "k" }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.sendNativeInvoiceEmail).toHaveBeenCalledWith({
      invoiceKey: "k",
      actorUserId: "user-1",
      resend: false,
    });
  });
});
