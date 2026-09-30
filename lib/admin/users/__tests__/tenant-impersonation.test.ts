import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  tenantMembershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    tenantMembership: { findFirst: mocks.tenantMembershipFindFirst },
  },
}));

import { assertCanImpersonateTenantMember } from "@/lib/admin/users/tenant-impersonation";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertCanImpersonateTenantMember", () => {
  it("rejects cross-tenant / missing membership", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "target-1",
      isActive: true,
      userRoles: [],
    });
    mocks.tenantMembershipFindFirst.mockResolvedValue(null);

    const result = await assertCanImpersonateTenantMember({
      actorUserId: "actor-1",
      actorTenantId: "tenant-a",
      targetUserId: "target-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("CROSS_TENANT_OR_INACTIVE_MEMBERSHIP");
    }
  });

  it("rejects platform system identity targets", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "target-1",
      isActive: true,
      userRoles: [{ role: { key: "super_admin", scope: "PLATFORM" } }],
    });

    const result = await assertCanImpersonateTenantMember({
      actorUserId: "actor-1",
      actorTenantId: "tenant-a",
      targetUserId: "target-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("PLATFORM_TARGET");
    }
  });

  it("allows same-tenant active member", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "target-1",
      isActive: true,
      userRoles: [],
    });
    mocks.tenantMembershipFindFirst.mockResolvedValue({ id: "m-1" });

    const result = await assertCanImpersonateTenantMember({
      actorUserId: "actor-1",
      actorTenantId: "tenant-a",
      targetUserId: "target-1",
    });

    expect(result).toEqual({
      ok: true,
      actorUserId: "actor-1",
      targetUserId: "target-1",
      tenantId: "tenant-a",
    });
  });
});
