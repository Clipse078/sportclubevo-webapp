import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { DelegationForbiddenError, toRoleApiErrorResponse } from "@/lib/roles/errors";
import {
  assertTenantDelegationAllowed,
  formatDelegationForbiddenMessage,
  sortDelegationMissingPermissionKeys,
} from "@/lib/roles/delegation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  effectiveTenantPermissions: [] as string[],
  permissionFindMany: vi.fn(),
  roleFindMany: vi.fn(),
  membershipFindFirst: vi.fn(),
  getEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

const db = {
  permission: { findMany: mocks.permissionFindMany },
  role: { findMany: mocks.roleFindMany },
  tenantMembership: { findFirst: mocks.membershipFindFirst },
} as unknown as PrismaClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.effectiveTenantPermissions = [PERMISSIONS.ROLES_MANAGE, PERMISSIONS.TEAMS_VIEW];
  mocks.getEffectivePermissions.mockImplementation(async () => ({
    platform: [],
    tenant: mocks.effectiveTenantPermissions,
  }));
  mocks.permissionFindMany.mockImplementation(
    async ({ where }: { where: { key: { in: string[] } } }) =>
      where.key.in.map((key) => ({ key })),
  );
  mocks.roleFindMany.mockResolvedValue([]);
  mocks.membershipFindFirst.mockResolvedValue({ id: "membership-a" });
});

describe("delegation error UX", () => {
  it("reports missing permission keys in deterministic sorted order", async () => {
    await expect(
      assertTenantDelegationAllowed(
        {
          tenantId: "tenant-a",
          actorUserId: "actor-a",
          permissionKeys: [
            PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
            PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
          ],
        },
        db,
      ),
    ).rejects.toMatchObject({
      missingPermissionKeys: [
        PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
        PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
      ],
    });

    try {
      await assertTenantDelegationAllowed(
        {
          tenantId: "tenant-a",
          actorUserId: "actor-a",
          permissionKeys: [
            PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
            PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
          ],
        },
        db,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(DelegationForbiddenError);
      const response = toRoleApiErrorResponse(error);
      expect(response.body.missingPermissionKeys).toEqual([
        PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
        PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
      ]);
      expect(response.body.error).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    }
  });

  it("sorts missing keys lexicographically", () => {
    expect(
      sortDelegationMissingPermissionKeys([
        "z.permission",
        "a.permission",
        "m.permission",
      ]),
    ).toEqual(["a.permission", "m.permission", "z.permission"]);
  });

  it("uses the product delegation message helper", () => {
    expect(
      formatDelegationForbiddenMessage([PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE]),
    ).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
  });

  it("keeps generic messaging for invalid/non-grantable permission requests", async () => {
    mocks.permissionFindMany.mockResolvedValueOnce([]);
    await expect(
      assertTenantDelegationAllowed(
        {
          tenantId: "tenant-a",
          actorUserId: "actor-a",
          permissionKeys: ["tenants.manage"],
        },
        db,
      ),
    ).rejects.toMatchObject({
      missingPermissionKeys: [],
    });
  });
});
