import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
  membershipFindFirst: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    tenantMembership: { findFirst: mocks.membershipFindFirst },
  },
}));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasPermission: mocks.hasPermission,
  }),
}));

import { requireApiActorTenantPermission } from "@/lib/permissions/require-api-actor-tenant-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const actorSession = {
  user: {
    id: "actor-1",
    actorUserId: "actor-1",
    effectiveUserId: "actor-1",
    isImpersonating: false,
    activeTenantId: "tenant-a",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(actorSession);
  mocks.userFindUnique.mockResolvedValue({ isActive: true });
  mocks.membershipFindFirst.mockResolvedValue({ id: "membership-a" });
  mocks.hasPermission.mockResolvedValue(true);
});

describe("requireApiActorTenantPermission", () => {
  it("allows the real actor with live tenant permission", async () => {
    const result = await requireApiActorTenantPermission(
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    );

    expect(result.ok).toBe(true);
    expect(mocks.hasPermission).toHaveBeenCalledWith({
      userId: "actor-1",
      permission: PERMISSIONS.USERS_IMPERSONATE_TENANT,
      tenantId: "tenant-a",
    });
  });

  it("denies when the effective impersonated user would have permission but the actor does not", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: "target-1",
        actorUserId: "actor-1",
        effectiveUserId: "target-1",
        isImpersonating: true,
        activeTenantId: "tenant-a",
      },
    });

    const result = await requireApiActorTenantPermission(
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
    expect(mocks.hasPermission).not.toHaveBeenCalled();
  });

  it("denies unauthorized actors", async () => {
    mocks.hasPermission.mockResolvedValue(false);

    const result = await requireApiActorTenantPermission(
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});
