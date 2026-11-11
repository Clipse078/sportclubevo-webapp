import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantMembershipFindFirst: vi.fn(),
  userRoleFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findFirst: mocks.tenantMembershipFindFirst },
    userRole: { findFirst: mocks.userRoleFindFirst },
  },
}));

import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";

describe("userHasVereinsleitungWorkspaceAccess (SCE-CD-01R1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantMembershipFindFirst.mockResolvedValue({ id: "m1" });
    mocks.userRoleFindFirst.mockResolvedValue(null);
  });

  it("denies when tenant membership is missing", async () => {
    mocks.tenantMembershipFindFirst.mockResolvedValue(null);
    await expect(
      userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1"),
    ).resolves.toBe(false);
    expect(mocks.userRoleFindFirst).not.toHaveBeenCalled();
  });

  it("denies when no role grants canAccessVereinsleitung", async () => {
    mocks.userRoleFindFirst.mockResolvedValue(null);
    await expect(
      userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1"),
    ).resolves.toBe(false);
  });

  it("allows when a VL-flagged role is assigned", async () => {
    mocks.userRoleFindFirst.mockResolvedValue({ id: "ur-1" });
    await expect(
      userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1"),
    ).resolves.toBe(true);
  });

  it("scopes userRole lookup to platform or matching tenant roles", async () => {
    mocks.userRoleFindFirst.mockResolvedValue({ id: "ur-1" });
    await userHasVereinsleitungWorkspaceAccess("user-1", "tenant-1");
    expect(mocks.userRoleFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          role: expect.objectContaining({ canAccessVereinsleitung: true }),
        }),
      }),
    );
  });
});
