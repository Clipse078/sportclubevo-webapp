import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  resolveBillingInboundUnresolvedMessage: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/billing-inbound/billing-inbound-unresolved-resolution-service", () => ({
  resolveBillingInboundUnresolvedMessage: mocks.resolveBillingInboundUnresolvedMessage,
}));

import { POST } from "../inbound-unresolved/[messageId]/resolve/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformApiPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    actorUserId: "admin",
  });
});

describe("inbound unresolved resolve route", () => {
  it("requires BILLING_MANAGE", async () => {
    await POST(
      new NextRequest("http://test", {
        method: "POST",
        body: JSON.stringify({ invoiceKey: "inv-1" }),
      }),
      { params: Promise.resolve({ messageId: "msg-1" }) },
    );
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });
});
