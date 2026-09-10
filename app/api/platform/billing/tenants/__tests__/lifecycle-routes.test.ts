import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  resolveTenantIdFromKey: vi.fn(),
  suspendPlatformTenant: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mocks.requireApiPermission,
}));

vi.mock("@/lib/billing/tenant-billing-account-service", () => ({
  resolveTenantIdFromKey: mocks.resolveTenantIdFromKey,
}));

vi.mock("@/lib/tenants/platform-tenant-lifecycle-service", () => ({
  suspendPlatformTenant: mocks.suspendPlatformTenant,
}));

import { POST as suspendPost } from "../[tenantKey]/lifecycle/suspend/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveTenantIdFromKey.mockResolvedValue("t1");
  mocks.suspendPlatformTenant.mockResolvedValue({
    ok: true,
    outcome: "applied",
    previousStatus: "ACTIVE",
    newStatus: "SUSPENDED",
    tenant: { tenantId: "t1", status: "SUSPENDED" },
  });
});

describe("lifecycle suspend route", () => {
  it("requires billing.manage", async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const response = await suspendPost(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ reason: "NON_PAYMENT", billingBehavior: "KEEP_BILLING" }),
      }),
      { params: Promise.resolve({ tenantKey: "club-a" }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("applies suspension for authorized actor", async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin" } },
    });
    const response = await suspendPost(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ reason: "NON_PAYMENT", billingBehavior: "KEEP_BILLING" }),
      }),
      { params: Promise.resolve({ tenantKey: "club-a" }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.suspendPlatformTenant).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", actorUserId: "admin" }),
    );
  });
});
