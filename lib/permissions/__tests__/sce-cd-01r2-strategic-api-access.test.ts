import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireApiTenantPermissionContext: vi.fn(),
  userHasVereinsleitungWorkspaceAccess: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
  getActorContext: vi.fn(),
  getEffectivePermissions: vi.fn(),
  userRoleFindMany: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/permissions/require-api-tenant-context", () => ({
  requireApiTenantPermissionContext: mocks.requireApiTenantPermissionContext,
}));

vi.mock("@/lib/permissions/vereinsleitung-workspace-access", () => ({
  userHasVereinsleitungWorkspaceAccess: mocks.userHasVereinsleitungWorkspaceAccess,
}));

vi.mock("@/lib/security/platform-superadmin", () => ({
  isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
}));

vi.mock("@/lib/visibility/get-actor-context", () => ({
  getActorContext: mocks.getActorContext,
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userRole: { findMany: mocks.userRoleFindMany },
  },
}));

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

describe("requireStrategicApiContext (SCE-CD-01R2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: "user-1",
        effectiveUserId: "user-1",
        activeTenantId: "tenant-1",
      },
    });
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(true);
    mocks.isPlatformSuperAdmin.mockResolvedValue(false);
    mocks.requireApiTenantPermissionContext.mockResolvedValue({
      ok: true,
      context: {
        tenantId: "tenant-1",
        actorUserId: "user-1",
        roleKeys: ["board"],
        permissionKeys: [PERMISSIONS.TARGETS_VIEW],
      },
    });
    mocks.getActorContext.mockResolvedValue({ userId: "user-1", tenantId: "tenant-1" });
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.userRoleFindMany.mockResolvedValue([]);
  });

  it("returns 403 when VL workspace policy denies", async () => {
    mocks.userHasVereinsleitungWorkspaceAccess.mockResolvedValue(false);
    const result = await requireStrategicApiContext([PERMISSIONS.TARGETS_VIEW]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("bypasses tenant permission context for platform superadmin", async () => {
    mocks.isPlatformSuperAdmin.mockResolvedValue(true);
    const result = await requireStrategicApiContext([PERMISSIONS.TARGETS_VIEW]);
    expect(result.ok).toBe(true);
    expect(mocks.requireApiTenantPermissionContext).not.toHaveBeenCalled();
  });

  it("uses tenant permission context for club admins and VL members", async () => {
    const result = await requireStrategicApiContext([PERMISSIONS.TARGETS_VIEW]);
    expect(result.ok).toBe(true);
    expect(mocks.requireApiTenantPermissionContext).toHaveBeenCalled();
  });
});
