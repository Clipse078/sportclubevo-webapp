import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  FINANCE_PERMISSION_KEYS,
  reconcileFinanceActualPermissionsForClubAdmin,
  reconcileFinancePermissions,
  reconcileFinancePublicationPermissionsForClubAdmin,
} from "@/lib/permissions/finance-permission-reconciliation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const reconcileClubAdmin = vi.hoisted(() => vi.fn());
const listClubAdminRoles = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/tenant-club-admin-permission-reconciliation", () => ({
  reconcileTenantClubAdminPermissions: reconcileClubAdmin,
}));

vi.mock("@/lib/permissions/tenant-club-admin-role-discovery", () => ({
  listTenantClubAdminRoleKeysForReconciliation: listClubAdminRoles,
}));

describe("reconcileFinanceActualPermissionsForClubAdmin", () => {
  it("assigns finance.actual.view and finance.actual.manage to discovered Club Admin roles", async () => {
    listClubAdminRoles.mockResolvedValue(["club_admin__demo"]);
    const permissionCreate = vi.fn(async () => ({}));
    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      if (
        where.key === PERMISSIONS.FINANCE_ACTUAL_VIEW ||
        where.key === PERMISSIONS.FINANCE_ACTUAL_MANAGE
      ) {
        return { id: `p-${where.key}` };
      }
      return null;
    });
    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === "club_admin__demo" ? { id: "role-ca" } : null,
    );
    const rolePermissionFindUnique = vi.fn(async () => null);
    const rolePermissionUpsert = vi.fn(async () => ({}));

    const prisma = {
      permission: {
        findUnique: permissionFindUnique,
        create: permissionCreate,
      },
      role: { findUnique: roleFindUnique },
      rolePermission: {
        findUnique: rolePermissionFindUnique,
        upsert: rolePermissionUpsert,
      },
    } as unknown as PrismaClient;

    const outcomes = await reconcileFinanceActualPermissionsForClubAdmin(prisma, false);
    expect(outcomes).toHaveLength(2);
    expect(rolePermissionUpsert).toHaveBeenCalledTimes(2);
  });
});

describe("reconcileFinancePublicationPermissionsForClubAdmin", () => {
  it("assigns FIN-06 publication keys to discovered Club Admin roles", async () => {
    listClubAdminRoles.mockResolvedValue(["club_admin__demo"]);
    const permissionCreate = vi.fn(async () => ({}));
    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      if (where.key.startsWith("finance.")) {
        return { id: `p-${where.key}` };
      }
      return null;
    });
    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === "club_admin__demo" ? { id: "role-ca" } : null,
    );
    const rolePermissionFindUnique = vi.fn(async () => null);
    const rolePermissionUpsert = vi.fn(async () => ({}));

    const prisma = {
      permission: {
        findUnique: permissionFindUnique,
        create: permissionCreate,
      },
      role: { findUnique: roleFindUnique },
      rolePermission: {
        findUnique: rolePermissionFindUnique,
        upsert: rolePermissionUpsert,
      },
    } as unknown as PrismaClient;

    const outcomes = await reconcileFinancePublicationPermissionsForClubAdmin(prisma, false);
    expect(outcomes).toHaveLength(4);
    expect(rolePermissionUpsert).toHaveBeenCalledTimes(4);
    expect(
      outcomes.some(
        (row) =>
          row.permissionKey === PERMISSIONS.FINANCE_REPORTING_PUBLISH &&
          row.action === "assigned",
      ),
    ).toBe(true);
  });
});

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
