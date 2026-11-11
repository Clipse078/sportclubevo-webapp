import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiTenantPermissionContext: vi.fn(),
  userHasVereinsleitungWorkspaceAccess: vi.fn(),
  getActorContext: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-tenant-context", () => ({
  requireApiTenantPermissionContext: mocks.requireApiTenantPermissionContext,
}));

vi.mock("@/lib/permissions/vereinsleitung-workspace-access", () => ({
  userHasVereinsleitungWorkspaceAccess: mocks.userHasVereinsleitungWorkspaceAccess,
}));

vi.mock("@/lib/visibility/get-actor-context", () => ({
  getActorContext: mocks.getActorContext,
}));

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

describe("requireStrategicApiContext VL gate (SCE-CD-01R1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiTenantPermissionContext.mockResolvedValue({
      ok: true,
      context: {
        tenantId: "tenant-1",
        actorUserId: "user-1",
        roleKeys: ["board"],
        permissionKeys: [PERMISSIONS.TARGETS_VIEW],
      },
    });
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(false);
    mocks.getActorContext.mockResolvedValue({ userId: "user-1", tenantId: "tenant-1" });
  });

  it("returns 403 when permissions pass but VL membership is missing", async () => {
    const result = await requireStrategicApiContext([PERMISSIONS.TARGETS_VIEW]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
    expect(mocks.getActorContext).not.toHaveBeenCalled();
  });

  it("resolves actor when VL membership is present", async () => {
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(true);
    const result = await requireStrategicApiContext([PERMISSIONS.TARGETS_VIEW]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.tenantId).toBe("tenant-1");
    }
    expect(mocks.getActorContext).toHaveBeenCalled();
  });
});
