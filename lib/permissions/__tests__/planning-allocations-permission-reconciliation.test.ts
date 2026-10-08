/**
 * SCE — planning.allocations.* Club Admin reconciliation tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  PLANNING_ALLOCATIONS_PERMISSION_KEYS,
  reconcilePlanningAllocationsPermissions,
  TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX,
} from "../planning-allocations-permission-reconciliation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS } from "@/lib/permissions/workspace-governance-permission-reconciliation";

function makeMockPrisma(overrides: {
  permissionFindUnique?: ReturnType<typeof vi.fn>;
  permissionCreate?: ReturnType<typeof vi.fn>;
  permissionUpdate?: ReturnType<typeof vi.fn>;
  roleFindUnique?: ReturnType<typeof vi.fn>;
  roleFindMany?: ReturnType<typeof vi.fn>;
  rolePermissionFindUnique?: ReturnType<typeof vi.fn>;
  rolePermissionUpsert?: ReturnType<typeof vi.fn>;
  tenantFindUnique?: ReturnType<typeof vi.fn>;
} = {}): PrismaClient {
  return {
    permission: {
      findUnique: overrides.permissionFindUnique ?? vi.fn().mockResolvedValue(null),
      create: overrides.permissionCreate ?? vi.fn().mockResolvedValue({}),
      update: overrides.permissionUpdate ?? vi.fn().mockResolvedValue({}),
    },
    role: {
      findUnique: overrides.roleFindUnique ?? vi.fn().mockResolvedValue(null),
      findMany: overrides.roleFindMany ?? vi.fn().mockResolvedValue([]),
    },
    rolePermission: {
      findUnique: overrides.rolePermissionFindUnique ?? vi.fn().mockResolvedValue(null),
      upsert: overrides.rolePermissionUpsert ?? vi.fn().mockResolvedValue({}),
    },
    tenant: {
      findUnique: overrides.tenantFindUnique ?? vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClient;
}

const SUPER_ADMIN_ROLE = { id: "role-super-admin" };
const FCA_CLUB_ADMIN_ROLE = { id: "role-club-admin-fca", key: "club_admin__fc-allschwil" };

describe("planning allocations reconciliation", () => {
  it("uses the canonical tenant Club Admin key prefix", () => {
    expect(TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX).toBe("club_admin__");
  });

  it("assigns both allocation keys to materialized tenant Club Admin roles", async () => {
    const roleFindUnique = vi.fn().mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === "super_admin") return Promise.resolve(SUPER_ADMIN_ROLE);
      if (where.key === FCA_CLUB_ADMIN_ROLE.key) return Promise.resolve(FCA_CLUB_ADMIN_ROLE);
      return Promise.resolve(null);
    });
    const roleFindMany = vi.fn().mockResolvedValue([{ key: FCA_CLUB_ADMIN_ROLE.key }]);
    const permFindUnique = vi.fn().mockResolvedValue({ id: "perm-id" });
    const rolePermissionUpsert = vi.fn().mockResolvedValue({});

    const prisma = makeMockPrisma({
      permissionFindUnique: permFindUnique,
      permissionCreate: vi.fn(),
      roleFindUnique,
      roleFindMany,
      rolePermissionFindUnique: vi.fn().mockResolvedValue(null),
      rolePermissionUpsert,
    });

    const result = await reconcilePlanningAllocationsPermissions(prisma, false);

    expect(result.tenantClubAdminRoles).toHaveLength(2);
    expect(result.tenantClubAdminRoles.map((row) => row.permissionKey).sort()).toEqual(
      [...PLANNING_ALLOCATIONS_PERMISSION_KEYS].sort(),
    );
    expect(rolePermissionUpsert).toHaveBeenCalled();
  });

  it("is idempotent when RolePermission rows already exist", async () => {
    const roleFindUnique = vi.fn().mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === "super_admin") return Promise.resolve(SUPER_ADMIN_ROLE);
      if (where.key === FCA_CLUB_ADMIN_ROLE.key) return Promise.resolve(FCA_CLUB_ADMIN_ROLE);
      return Promise.resolve(null);
    });
    const roleFindMany = vi.fn().mockResolvedValue([{ key: FCA_CLUB_ADMIN_ROLE.key }]);

    const prisma = makeMockPrisma({
      permissionFindUnique: vi.fn().mockResolvedValue({ id: "perm-id" }),
      roleFindUnique,
      roleFindMany,
      rolePermissionFindUnique: vi.fn().mockResolvedValue({ roleId: "x" }),
      rolePermissionUpsert: vi.fn(),
    });

    const result = await reconcilePlanningAllocationsPermissions(prisma, false);
    expect(result.tenantClubAdminRoles.every((row) => row.action === "already_assigned")).toBe(
      true,
    );
    expect(result.superAdmin.every((row) => row.action === "already_assigned")).toBe(true);
  });

  it("does not grant platform-only permissions as part of this reconciliation", () => {
    expect(PLANNING_ALLOCATIONS_PERMISSION_KEYS).not.toContain(PERMISSIONS.TENANTS_MANAGE);
    expect(PLANNING_ALLOCATIONS_PERMISSION_KEYS).not.toContain(PERMISSIONS.USERS_MANAGE);
  });

  it("keeps governance exclusions out of the automatic club_admin seed contract", () => {
    for (const key of PLANNING_ALLOCATIONS_PERMISSION_KEYS) {
      expect(TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS.has(key)).toBe(false);
    }
  });
});

describe("Sandra restricted role delegation (simulated)", () => {
  const SANDRA_KEYS = [
    PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.TEAMS_VIEW,
  ];

  it("club admin without reconciled allocation keys cannot delegate Sandra role", async () => {
    const actorWithoutAllocations = [
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.EVENTS_VIEW,
    ];
    const { findMissingDelegatedPermissions } = await import("@/lib/roles/delegation-utils");
    expect(findMissingDelegatedPermissions(actorWithoutAllocations, SANDRA_KEYS)).toEqual([
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
      PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    ]);
  });

  it("club admin with reconciled allocation keys can delegate Sandra role", async () => {
    const actorWithAllocations = [
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.EVENTS_VIEW,
    ];
    const { findMissingDelegatedPermissions } = await import("@/lib/roles/delegation-utils");
    expect(findMissingDelegatedPermissions(actorWithAllocations, SANDRA_KEYS)).toEqual([]);
  });

  it("Sandra role does not include trainings manage, events manage, or teams manage", () => {
    expect(SANDRA_KEYS).toContain(PERMISSIONS.TRAININGS_VIEW);
    expect(SANDRA_KEYS).toContain(PERMISSIONS.EVENTS_VIEW);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.TRAININGS_MANAGE);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.EVENTS_MANAGE);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.TEAMS_MANAGE);
  });
});
