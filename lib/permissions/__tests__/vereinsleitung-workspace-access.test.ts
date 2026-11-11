import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantMembershipFindFirst: vi.fn(),
  userRoleFindFirst: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
  isTenantClubAdmin: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findFirst: mocks.tenantMembershipFindFirst },
    userRole: { findFirst: mocks.userRoleFindFirst },
  },
}));

vi.mock("@/lib/security/platform-superadmin", () => ({
  isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
}));

vi.mock("@/lib/roles/is-tenant-club-admin", () => ({
  isTenantClubAdmin: mocks.isTenantClubAdmin,
}));

import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";

describe("userHasVereinsleitungWorkspaceAccess (SCE-CD-01R2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPlatformSuperAdmin.mockResolvedValue(false);
    mocks.isTenantClubAdmin.mockResolvedValue(false);
    mocks.tenantMembershipFindFirst.mockResolvedValue({
      tenant: { key: "fc-demo" },
    });
    mocks.userRoleFindFirst.mockResolvedValue(null);
  });

  it("allows SCE platform superadmin without tenant membership lookup", async () => {
    mocks.isPlatformSuperAdmin.mockResolvedValue(true);
    await expect(
      userHasVereinsleitungWorkspaceAccess("super-1", "tenant-1"),
    ).resolves.toBe(true);
    expect(mocks.tenantMembershipFindFirst).not.toHaveBeenCalled();
  });

  it("denies unprivileged users without VL flag, club admin, or superadmin", async () => {
    await expect(
      userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1"),
    ).resolves.toBe(false);
  });

  it("allows materialized tenant Club Admin within their club", async () => {
    mocks.isTenantClubAdmin.mockResolvedValue(true);
    await expect(
      userHasVereinsleitungWorkspaceAccess("club-admin-1", "tenant-1"),
    ).resolves.toBe(true);
    expect(mocks.userRoleFindFirst).not.toHaveBeenCalled();
  });

  it("allows explicitly authorized VL role holders", async () => {
    mocks.userRoleFindFirst.mockResolvedValue({ id: "ur-1" });
    await expect(
      userHasVereinsleitungWorkspaceAccess("vl-1", "tenant-1"),
    ).resolves.toBe(true);
  });

  it("denies when tenant membership is missing (non-superadmin)", async () => {
    mocks.tenantMembershipFindFirst.mockResolvedValue(null);
    await expect(
      userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1"),
    ).resolves.toBe(false);
    expect(mocks.isTenantClubAdmin).not.toHaveBeenCalled();
  });

  it("scopes club admin check to the active tenant key", async () => {
    await userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1");
    expect(mocks.isTenantClubAdmin).toHaveBeenCalledWith(
      "user-1",
      "tenant-1",
      "fc-demo",
    );
  });
});
