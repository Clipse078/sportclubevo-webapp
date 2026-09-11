import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getTenantBillingSummary: vi.fn(),
  getTenantInvoices: vi.fn(),
  getStripeInvoiceForTenant: vi.fn(),
  resolveTenantIdFromTenantKey: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/integrations/stripe/billing-read-service", () => ({
  getTenantBillingSummary: mocks.getTenantBillingSummary,
  getTenantInvoices: mocks.getTenantInvoices,
  getStripeInvoiceForTenant: mocks.getStripeInvoiceForTenant,
  resolveTenantIdFromTenantKey: mocks.resolveTenantIdFromTenantKey,
}));

import { GET as getSummary } from "../[tenantKey]/summary/route";
import { GET as getInvoices } from "../[tenantKey]/invoices/route";
import { GET as getInvoiceDetail } from "../[tenantKey]/invoices/[invoiceId]/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { StripeIntegrationError } from "@/lib/integrations/stripe/errors";

const TENANT_KEY = "fc-demo";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveTenantIdFromTenantKey.mockResolvedValue("tenant-1");
  mocks.requireApiAnyPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    session: { user: { id: "platform-admin" } },
  });
});

describe("platform billing read routes authorization", () => {
  it("requires billing.view for summary", async () => {
    mocks.getTenantBillingSummary.mockResolvedValue({
      tenantId: "tenant-1",
      tenantKey: TENANT_KEY,
      subscriptions: [],
    });

    await getSummary(new NextRequest("http://localhost"), {
      params: Promise.resolve({ tenantKey: TENANT_KEY }),
    });

    expect(mocks.requireApiAnyPermission).toHaveBeenCalledWith([
      PERMISSIONS.BILLING_VIEW,
    ]);
  });

  it("denies ordinary callers without billing.view", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });

    const response = await getSummary(new NextRequest("http://localhost"), {
      params: Promise.resolve({ tenantKey: TENANT_KEY }),
    });

    expect(response.status).toBe(403);
    expect(mocks.getTenantBillingSummary).not.toHaveBeenCalled();
  });
});

describe("platform billing read routes", () => {
  it("returns summary payload", async () => {
    mocks.getTenantBillingSummary.mockResolvedValue({ tenantId: "tenant-1" });

    const response = await getSummary(new NextRequest("http://localhost"), {
      params: Promise.resolve({ tenantKey: TENANT_KEY }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: { tenantId: "tenant-1" },
    });
  });

  it("returns invoice list page", async () => {
    mocks.getTenantInvoices.mockResolvedValue({
      invoices: [],
      hasMore: false,
      nextCursor: null,
    });

    const response = await getInvoices(
      new NextRequest("http://localhost/api/platform/billing/tenants/x/invoices?limit=10"),
      { params: Promise.resolve({ tenantKey: TENANT_KEY }) },
    );

    expect(mocks.getTenantInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", limit: 10 }),
    );
    expect(response.status).toBe(200);
  });

  it("maps NO_BILLING_ACCOUNT to 404", async () => {
    mocks.getStripeInvoiceForTenant.mockRejectedValue(
      new StripeIntegrationError("NO_BILLING_ACCOUNT", "missing"),
    );

    const response = await getInvoiceDetail(new NextRequest("http://localhost"), {
      params: Promise.resolve({ tenantKey: TENANT_KEY, invoiceId: "in_1" }),
    });

    expect(response.status).toBe(404);
  });
});
