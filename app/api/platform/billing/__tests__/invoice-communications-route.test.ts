import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  getInvoiceBillingCommunicationTimeline: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-service", () => ({
  getInvoiceBillingCommunicationTimeline: mocks.getInvoiceBillingCommunicationTimeline,
}));

import { GET } from "../invoices/[invoiceKey]/communications/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformApiPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    actorUserId: "admin",
  });
  mocks.getInvoiceBillingCommunicationTimeline.mockResolvedValue([]);
});

describe("invoice communications route", () => {
  it("requires BILLING_VIEW", async () => {
    await GET(new NextRequest("http://test"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("returns 403 when permission denied", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      actorUserId: null,
    });
    const response = await GET(new NextRequest("http://test"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns serialized communications", async () => {
    mocks.getInvoiceBillingCommunicationTimeline.mockResolvedValue([
      { id: "c1", statusLabel: "Gesendet" },
    ]);
    const response = await GET(new NextRequest("http://test"), {
      params: Promise.resolve({ invoiceKey: "inv-key" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.communications).toHaveLength(1);
  });
});
