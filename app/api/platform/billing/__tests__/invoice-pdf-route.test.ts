import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  generateNativeInvoicePdfBytes: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/invoice-pdf-service", () => ({
  generateNativeInvoicePdfBytes: mocks.generateNativeInvoicePdfBytes,
}));

import { GET } from "../invoices/[invoiceKey]/pdf/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformApiPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    actorUserId: "admin-1",
  });
  mocks.generateNativeInvoicePdfBytes.mockResolvedValue(
    Uint8Array.from([0x25, 0x50, 0x44, 0x46]),
  );
});

describe("invoice PDF route", () => {
  it("requires billing.view", async () => {
    await GET(new NextRequest("http://localhost/api/x/pdf"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("returns application/pdf", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/platform/billing/invoices/inv-key/pdf"),
      { params: Promise.resolve({ invoiceKey: "inv-key" }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });
});
