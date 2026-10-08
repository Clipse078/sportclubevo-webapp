import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  getFacilitiesForTenantCached: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

vi.mock("@/lib/server/request-cache", () => ({
  getFacilitiesForTenantCached: mocks.getFacilitiesForTenantCached,
}));

import { GET } from "../facility-groups/route";

describe("GET /api/planning-hub/facility-groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1" });
    mocks.getFacilitiesForTenantCached.mockResolvedValue([]);
  });

  it("authorizes planning.allocations.manage for operational resource catalog reads", async () => {
    mocks.requireAnyPermission.mockResolvedValue({ user: { id: "u1" } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(
      expect.arrayContaining([PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE]),
    );
  });
});
