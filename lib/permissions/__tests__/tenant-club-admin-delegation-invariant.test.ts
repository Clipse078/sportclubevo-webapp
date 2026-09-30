import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  computeTenantClubAdminPermissionDrift,
  filterTenantClubAdminDelegatablePermissionKeys,
  isTenantClubAdminDelegatablePermission,
  TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS,
  TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS,
  TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX,
} from "@/lib/permissions/tenant-club-admin-permission-contract";
import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import {
  assertTenantDelegationAllowed,
  findMissingDelegatedPermissions,
} from "@/lib/roles/delegation";

const mocks = vi.hoisted(() => ({
  getEffectivePermissions: vi.fn(),
  permissionFindMany: vi.fn(),
  roleFindMany: vi.fn(),
  membershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

describe("tenant Club Admin delegatable permission contract", () => {
  it("includes TENANT grantable permissions and excludes governance break-glass keys", () => {
    expect(
      isTenantClubAdminDelegatablePermission({
        key: "teams.view",
        scope: "TENANT",
        grantableByAdmin: true,
      }),
    ).toBe(true);

    expect(
      isTenantClubAdminDelegatablePermission({
        key: "users.manage",
        scope: "PLATFORM",
        grantableByAdmin: false,
      }),
    ).toBe(false);

    expect(
      isTenantClubAdminDelegatablePermission({
        key: "workspace.break_glass",
        scope: "TENANT",
        grantableByAdmin: true,
      }),
    ).toBe(false);

    for (const key of TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS) {
      expect(
        isTenantClubAdminDelegatablePermission({
          key,
          scope: "TENANT",
          grantableByAdmin: true,
        }),
      ).toBe(false);
    }
  });

  it("does not grant TENANT permissions merely because of tenant scope when grantableByAdmin=false", () => {
    expect(
      filterTenantClubAdminDelegatablePermissionKeys([
        { key: "users.delete", scope: "PLATFORM", grantableByAdmin: false },
        {
          key: "hypothetical.protected",
          scope: "TENANT",
          grantableByAdmin: false,
        },
        { key: "teams.view", scope: "TENANT", grantableByAdmin: true },
      ]),
    ).toEqual(["teams.view"]);
  });

  it("covers known regression delegation keys in the contract filter", () => {
    for (const key of TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS) {
      expect(
        isTenantClubAdminDelegatablePermission({
          key,
          scope: "TENANT",
          grantableByAdmin: true,
        }),
      ).toBe(true);
    }
  });

  it("prisma/seed derives tenant Club Admin keys via the shared catalog filter", () => {
    const seedSource = readFileSync(resolve(process.cwd(), "prisma/seed.ts"), "utf8");
    expect(seedSource).toContain("filterTenantClubAdminDelegatablePermissionKeys");
    expect(seedSource).not.toContain("TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS.has");
  });
});

describe("reconcileTenantClubAdminPermissions", () => {
  const FCA_CLUB_ADMIN = { id: "role-ca-fca", key: "club_admin__fc-allschwil" };
  const CUSTOM_ROLE = { id: "role-custom", key: "pilot_president" };

  function buildPrisma(options: {
    catalog: Array<{ key: string; scope: string; grantableByAdmin: boolean; id?: string }>;
    clubAdminRoles?: Array<{ key: string }>;
    assigned?: Set<string>;
    customRoleAssigned?: Set<string>;
  }) {
    const permissionByKey = new Map(
      options.catalog.map((row, index) => [
        row.key,
        { id: row.id ?? `perm-${index}`, ...row },
      ]),
    );
    const assigned = options.assigned ?? new Set<string>();
    const customAssigned = options.customRoleAssigned ?? new Set<string>();

    const roleFindMany = vi.fn(async (args: { where?: { key?: { startsWith?: string } } }) => {
      if (args.where?.key?.startsWith === TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX) {
        return options.clubAdminRoles ?? [{ key: FCA_CLUB_ADMIN.key }];
      }
      return [];
    });

    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      if (where.key === FCA_CLUB_ADMIN.key) return FCA_CLUB_ADMIN;
      if (where.key === CUSTOM_ROLE.key) return CUSTOM_ROLE;
      return null;
    });

    const permissionFindMany = vi.fn(async () =>
      options.catalog.map(({ key, scope, grantableByAdmin }) => ({
        key,
        scope,
        grantableByAdmin,
      })),
    );

    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      const row = permissionByKey.get(where.key);
      return row ? { id: row.id } : null;
    });

    const rolePermissionFindUnique = vi.fn(
      async ({
        where,
      }: {
        where: { roleId_permissionId: { roleId: string; permissionId: string } };
      }) => {
        const roleId = where.roleId_permissionId.roleId;
        const permissionId = where.roleId_permissionId.permissionId;
        const permissionKey = [...permissionByKey.values()].find((p) => p.id === permissionId)?.key;
        if (!permissionKey) return null;
        const bucket = roleId === CUSTOM_ROLE.id ? customAssigned : assigned;
        return bucket.has(`${roleId}:${permissionKey}`) ? { roleId } : null;
      },
    );

    const rolePermissionUpsert = vi.fn(async () => ({}));

    return {
      prisma: {
        permission: { findMany: permissionFindMany, findUnique: permissionFindUnique },
        role: { findMany: roleFindMany, findUnique: roleFindUnique },
        rolePermission: {
          findUnique: rolePermissionFindUnique,
          upsert: rolePermissionUpsert,
        },
      } as unknown as PrismaClient,
      rolePermissionUpsert,
      roleFindMany,
    };
  }

  it("assigns every catalog delegatable permission to canonical Club Admin only", async () => {
    const catalog = [
      { key: "teams.view", scope: "TENANT", grantableByAdmin: true },
      { key: "communication.club.view", scope: "TENANT", grantableByAdmin: true },
      { key: "workspace.break_glass", scope: "TENANT", grantableByAdmin: true },
      { key: "users.manage", scope: "PLATFORM", grantableByAdmin: false },
    ];
    const { prisma, rolePermissionUpsert, roleFindMany } = buildPrisma({ catalog });

    const result = await reconcileTenantClubAdminPermissions(prisma, false);

    expect(result.expectedDelegatablePermissionKeys).toEqual([
      "communication.club.view",
      "teams.view",
    ]);
    expect(roleFindMany).toHaveBeenCalled();
    expect(rolePermissionUpsert).toHaveBeenCalledTimes(2);
    expect(
      result.tenantClubAdminRoles.every((row) => row.roleKey === FCA_CLUB_ADMIN.key),
    ).toBe(true);
  });

  it("does not modify custom tenant roles", async () => {
    const catalog = [{ key: "news.view", scope: "TENANT", grantableByAdmin: true }];
    const { prisma, rolePermissionUpsert } = buildPrisma({ catalog });

    await reconcileTenantClubAdminPermissions(prisma, false);

    const touchedRoleKeys = new Set(
      (rolePermissionUpsert.mock.calls as unknown[][]).map(
        (call) => (call[0] as { where: { roleId_permissionId: { roleId: string } } }).where
          .roleId_permissionId.roleId,
      ),
    );
    expect(touchedRoleKeys.has(CUSTOM_ROLE.id)).toBe(false);
  });
});

describe("delegation boundary with Club Admin contract", () => {
  const db = {
    permission: { findMany: mocks.permissionFindMany },
    role: { findMany: mocks.roleFindMany },
    tenantMembership: { findFirst: mocks.membershipFindFirst },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membershipFindFirst.mockResolvedValue({ id: "membership-a" });
    mocks.roleFindMany.mockResolvedValue([]);
    mocks.permissionFindMany.mockImplementation(
      async ({ where }: { where: { key: { in: string[] } } }) =>
        where.key.in.map((key) => ({ key })),
    );
  });

  it("allows delegation when the actor holds every requested tenant-grantable permission", async () => {
    const held = ["roles.manage", ...TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS];
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: held });

    await expect(
      assertTenantDelegationAllowed(
        {
          tenantId: "tenant-a",
          actorUserId: "actor-a",
          permissionKeys: [...TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS],
        },
        db,
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects delegation of protected permissions the actor lacks", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: ["roles.manage", PERMISSIONS.TEAMS_VIEW],
    });

    await expect(
      assertTenantDelegationAllowed(
        {
          tenantId: "tenant-a",
          actorUserId: "actor-a",
          permissionKeys: [PERMISSIONS.WORKSPACE_BREAK_GLASS],
        },
        db,
      ),
    ).rejects.toMatchObject({ name: "RoleDomainError" });
  });

  it("President pilot read permissions are delegatable when held by Club Admin", () => {
    const presidentPilotKeys = [
      PERMISSIONS.COMMUNICATION_CLUB_VIEW,
      PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
      PERMISSIONS.INFOBOARD_VIEW,
      PERMISSIONS.NEWS_VIEW,
    ];
    const actorKeys = [
      PERMISSIONS.ROLES_MANAGE,
      ...TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS,
    ];
    expect(findMissingDelegatedPermissions(actorKeys, presidentPilotKeys)).toEqual([]);
  });
});

describe("drift detection helper", () => {
  it("reports missing and unexpected Club Admin permission keys", () => {
    const drift = computeTenantClubAdminPermissionDrift(
      ["teams.view", "news.view"],
      ["teams.view", "legacy.test.perm"],
    );
    expect(drift.missingFromClubAdmin).toEqual(["news.view"]);
    expect(drift.unexpectedOnClubAdmin).toEqual(["legacy.test.perm"]);
  });
});
