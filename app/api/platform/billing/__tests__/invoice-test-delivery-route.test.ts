import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
  assertBillingTestDeliveryAllowed: vi.fn(),
  executeBillingInvoiceTestDelivery: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/security/platform-superadmin", () => ({
  isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
}));

vi.mock("@/lib/billing/invoice-delivery/billing-test-delivery-guards", () => ({
  assertBillingTestDeliveryAllowed: mocks.assertBillingTestDeliveryAllowed,
}));

vi.mock("@/lib/billing/invoice-delivery/billing-test-delivery-service", () => ({
  executeBillingInvoiceTestDelivery: mocks.executeBillingInvoiceTestDelivery,
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

describe("invoice test delivery route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: true,
      actorUserId: "user-1",
    });
    mocks.isPlatformSuperAdmin.mockResolvedValue(true);
    mocks.assertBillingTestDeliveryAllowed.mockImplementation(() => undefined);
    mocks.executeBillingInvoiceTestDelivery.mockResolvedValue({
      kind: "BILLING_INVOICE_TEST_DELIVERY",
      invoiceKey: "inv-key",
      invoiceNumber: "2026-000002",
      recipientEmail: "billing-test@sportclubevo.test",
      provider: "infomaniak-smtp",
      messageId: "msg-1",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      replyTo: "billing@sportclubevo.com",
      attachmentFilename: "invoice-2026-000002.pdf",
      subject: "Rechnung",
    });
  });

  it("requires BILLING_MANAGE and platform superadmin", async () => {
    const { POST } = await import("../invoices/[invoiceKey]/test-delivery/route");
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });

    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(
      PERMISSIONS.BILLING_MANAGE,
    );
    expect(mocks.isPlatformSuperAdmin).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("rejects non-superadmin", async () => {
    mocks.isPlatformSuperAdmin.mockResolvedValue(false);
    const { POST } = await import("../invoices/[invoiceKey]/test-delivery/route");
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.executeBillingInvoiceTestDelivery).not.toHaveBeenCalled();
  });

  it("does not accept recipient from request body", async () => {
    const { POST } = await import("../invoices/[invoiceKey]/test-delivery/route");
    await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ recipientEmail: "evil@example.com" }),
      }),
      { params: Promise.resolve({ invoiceKey: "inv-key" }) },
    );

    expect(mocks.executeBillingInvoiceTestDelivery).toHaveBeenCalledWith({
      invoiceKey: "inv-key",
      actorUserId: "user-1",
    });
  });
});
