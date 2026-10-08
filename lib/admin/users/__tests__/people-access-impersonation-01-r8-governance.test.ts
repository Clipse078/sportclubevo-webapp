import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  isTenantClubAdminDelegatablePermission,
  isTenantClubAdminPrivilegedPossessionKey,
  mergeTenantClubAdminAssignedPermissionKeys,
  TENANT_CLUB_ADMIN_PRIVILEGED_POSSESSION_KEYS,
} from "@/lib/permissions/tenant-club-admin-permission-contract";
import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import {
  PILOT_TENANT_KEY,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { assertTenantDelegationAllowed } from "@/lib/roles/delegation";
import { DelegationForbiddenError } from "@/lib/roles/errors";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const delegationMocks = vi.hoisted(() => ({
  getEffectivePermissions: vi.fn(),
  permissionFindMany: vi.fn(),
  roleFindMany: vi.fn(),
  membershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: delegationMocks.getEffectivePermissions,
  }),
}));

describe("PEOPLE-ACCESS-IMPERSONATION-01R8 — non-delegatable impersonation governance", () => {
  it("1. catalog marks users.impersonate_tenant as non-delegatable (seed)", () => {
    const seed = readRelative("prisma/seed.ts");
    expect(seed).toContain('"users.impersonate_tenant"');
    expect(seed).toMatch(
      /users\.impersonate_tenant[\s\S]*?grantableByAdmin:\s*false/,
    );
  });

  it("2. privileged possession keys include impersonation for Club Admin reconciliation", () => {
    expect(TENANT_CLUB_ADMIN_PRIVILEGED_POSSESSION_KEYS).toContain(
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    );
    expect(isTenantClubAdminPrivilegedPossessionKey(PERMISSIONS.USERS_IMPERSONATE_TENANT)).toBe(
      true,
    );
    expect(
      mergeTenantClubAdminAssignedPermissionKeys(["teams.view"]).includes(
        PERMISSIONS.USERS_IMPERSONATE_TENANT,
      ),
    ).toBe(true);
  });

  it("3. users.impersonate_tenant is NOT tenant-admin delegatable", () => {
    expect(
      isTenantClubAdminDelegatablePermission({
        key: PERMISSIONS.USERS_IMPERSONATE_TENANT,
        scope: "TENANT",
        grantableByAdmin: false,
      }),
    ).toBe(false);
  });

  it("4. delegation boundary rejects direct assignment of impersonation permission", async () => {
    const db = {
      permission: { findMany: delegationMocks.permissionFindMany },
      role: { findMany: delegationMocks.roleFindMany },
      tenantMembership: { findFirst: delegationMocks.membershipFindFirst },
    } as unknown as PrismaClient;

    delegationMocks.membershipFindFirst.mockResolvedValue({ id: "m1" });
    delegationMocks.roleFindMany.mockResolvedValue([]);
    delegationMocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.ROLES_MANAGE, PERMISSIONS.USERS_IMPERSONATE_TENANT],
    });
    delegationMocks.permissionFindMany.mockResolvedValue([]);

    await expect(
      assertTenantDelegationAllowed(
        {
          tenantId: "tenant-a",
          actorUserId: "club-admin",
          permissionKeys: [PERMISSIONS.USERS_IMPERSONATE_TENANT],
        },
        db,
      ),
    ).rejects.toMatchObject({ name: "RoleDomainError" });
  });

  it("5. role permission catalog and mutation resolver exclude non-delegatable impersonation", () => {
    const tenantQueries = readRelative("lib/roles/tenant-queries.ts");
    const mutations = readRelative("lib/roles/mutations.ts");
    expect(tenantQueries).toContain("grantableByAdmin: true");
    expect(tenantQueries).not.toContain("users.impersonate_tenant");
    expect(mutations).toContain("grantableByAdmin !== true");
    expect(mutations).toContain("assertTenantDelegationAllowed");
  });

  it("6. Sandra and Präsident pilot roles exclude impersonation", () => {
    expect(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    );
    const pilotSource = readRelative("lib/roles/pilot-fc-allschwil-role-definitions.ts");
    expect(pilotSource).toContain("PILOT_TENANT_KEY");
    expect(pilotSource).not.toMatch(
      /pilot_president[\s\S]*users\.impersonate_tenant/,
    );
    expect(PILOT_TENANT_KEY).toBe("fc-allschwil");
  });

  it("7. impersonation start API remains actor-scoped (R6 security unchanged)", () => {
    const route = readRelative("app/api/users/[userId]/impersonate/route.ts");
    expect(route).toContain("requireApiActorTenantPermission");
    expect(route).toContain("USERS_IMPERSONATE_TENANT");
    expect(route).toContain("NESTED_IMPERSONATION");
  });

  it("8. People & Access row menu still wired for eligible targets (R6/R7)", () => {
    const menu = readRelative("components/admin/users/UserRowActionsMenu.tsx");
    expect(menu).toContain("canImpersonateTarget");
    expect(menu).toContain('variant="row-menu"');
  });

  it("9. reconcileTenantClubAdminPermissions assigns privileged possession to club_admin roles", async () => {
    const FCA_CLUB_ADMIN = { id: "role-ca-fca", key: "club_admin__fc-allschwil" };
    const catalog = [
      { key: "teams.view", scope: "TENANT", grantableByAdmin: true, id: "perm-teams-view" },
      {
        key: PERMISSIONS.USERS_IMPERSONATE_TENANT,
        scope: "TENANT",
        grantableByAdmin: false,
        id: "perm-impersonate",
      },
    ];

    const permissionFindMany = vi.fn(async () =>
      catalog.map(({ key, scope, grantableByAdmin }) => ({
        key,
        scope,
        grantableByAdmin,
      })),
    );
    const roleFindMany = vi.fn(async () => [{ key: FCA_CLUB_ADMIN.key }]);
    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === FCA_CLUB_ADMIN.key ? FCA_CLUB_ADMIN : null,
    );
    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      const row = catalog.find((p) => p.key === where.key);
      return row ? { id: row.id } : null;
    });
    const rolePermissionFindUnique = vi.fn(async () => null);
    const rolePermissionUpsert = vi.fn(async () => ({}));

    const prisma = {
      permission: { findMany: permissionFindMany, findUnique: permissionFindUnique },
      role: { findMany: roleFindMany, findUnique: roleFindUnique },
      rolePermission: {
        findUnique: rolePermissionFindUnique,
        upsert: rolePermissionUpsert,
      },
    } as unknown as PrismaClient;

    const result = await reconcileTenantClubAdminPermissions(prisma, false);

    expect(result.expectedDelegatablePermissionKeys).toEqual(["teams.view"]);
    expect(result.expectedAssignedPermissionKeys).toEqual([
      "teams.view",
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    ]);
    expect(rolePermissionUpsert).toHaveBeenCalledTimes(2);
  });
});
