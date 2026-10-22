import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  FINANCE_PERMISSION_KEYS,
  reconcileFinancePermissions,
} from "@/lib/permissions/finance-permission-reconciliation";

const reconcileClubAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/tenant-club-admin-permission-reconciliation", () => ({
  reconcileTenantClubAdminPermissions: reconcileClubAdmin,
}));

describe("reconcileFinancePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconcileClubAdmin.mockResolvedValue({
      expectedDelegatablePermissionKeys: FINANCE_PERMISSION_KEYS,
      expectedAssignedPermissionKeys: FINANCE_PERMISSION_KEYS,
      tenantClubAdminRoles: [],
    });
  });

  it("upserts finance catalog rows and delegates Club Admin alignment to catalog reconciliation", async () => {
    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      if (where.key === "finance.view") {
        return {
          id: "p-view",
          name: "View organisation finance",
          module: "FINANCE",
          scope: "TENANT",
          grantableByAdmin: true,
        };
      }
      return null;
    });
    const permissionCreate = vi.fn(async () => ({}));
    const permissionUpdate = vi.fn(async () => ({}));

    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === "super_admin" ? { id: "role-sa" } : null,
    );
    const rolePermissionFindUnique = vi.fn(async () => null);
    const rolePermissionUpsert = vi.fn(async () => ({}));

    const prisma = {
      permission: {
        findUnique: permissionFindUnique,
        create: permissionCreate,
        update: permissionUpdate,
      },
      role: { findUnique: roleFindUnique },
      rolePermission: {
        findUnique: rolePermissionFindUnique,
        upsert: rolePermissionUpsert,
      },
    } as unknown as PrismaClient;

    await reconcileFinancePermissions(prisma, false);

    expect(permissionCreate).toHaveBeenCalled();
    expect(reconcileClubAdmin).toHaveBeenCalledWith(prisma, false);
    expect(rolePermissionUpsert).toHaveBeenCalled();
  });
});
