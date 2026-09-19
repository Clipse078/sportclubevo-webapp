import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  getBillingCommunicationOperationsSnapshot: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/billing-inbound/billing-inbound-operations-service", () => ({
  getBillingCommunicationOperationsSnapshot: mocks.getBillingCommunicationOperationsSnapshot,
}));

import { GET } from "../communications-operations/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformApiPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    actorUserId: "admin",
  });
  mocks.getBillingCommunicationOperationsSnapshot.mockResolvedValue({ mailbox: {} });
});

describe("communications operations route", () => {
  it("requires BILLING_VIEW", async () => {
    await GET();
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });
});
