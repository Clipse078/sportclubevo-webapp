import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { getVisibleNavSections, flattenNavSections } from "@/lib/nav/nav-config";
import { isFinanceWorkspaceRouteAuthorized } from "@/lib/finance/finance-route-authorization";
import { resolveFinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";

describe("FIN-01B-R2 existing-tenant permission lifecycle", () => {
  const TENANT_ID = "tenant-existing";
  const USER_CLUB_ADMIN = "user-club-admin";
  const USER_TRAINER = "user-trainer";

  const LEGACY_CLUB_ADMIN_KEY = "club_admin_fc_demo";
  const CANONICAL_CLUB_ADMIN_KEY = "club_admin__demo-club";

  function buildScenario(options: {
    clubAdminUsesLegacyRole?: boolean;
    financePermissionsInCatalog?: boolean;
    afterReconciliation?: boolean;
  }) {
    const financePerms = options.financePermissionsInCatalog
      ? [
          { id: "fp-view", key: "finance.view", scope: "TENANT", grantableByAdmin: true },
          {
            id: "fp-struct",
            key: "finance.structure.manage",
            scope: "TENANT",
            grantableByAdmin: true,
          },
          { id: "fp-admin", key: "finance.admin", scope: "TENANT", grantableByAdmin: true },
        ]
      : [];

    const catalog = [
      { id: "p-teams", key: "teams.view", scope: "TENANT", grantableByAdmin: true },
      ...financePerms,
    ];

    const roleAssignments = new Map<string, Set<string>>([
      [
        LEGACY_CLUB_ADMIN_KEY,
        new Set(options.afterReconciliation ? ["teams.view", "finance.view", "finance.structure.manage", "finance.admin"] : ["teams.view"]),
      ],
      [CANONICAL_CLUB_ADMIN_KEY, new Set(["teams.view"])],
      ["trainer", new Set(["teams.view"])],
    ]);

    const userRoleKey = options.clubAdminUsesLegacyRole ? LEGACY_CLUB_ADMIN_KEY : CANONICAL_CLUB_ADMIN_KEY;

    const permissionFindMany = vi.fn(async () =>
      catalog.map(({ key, scope, grantableByAdmin }) => ({ key, scope, grantableByAdmin })),
    );

    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      const row = catalog.find((p) => p.key === where.key);
      return row ? { id: row.id } : null;
    });

    const roles = [
      {
        id: "role-legacy",
        key: LEGACY_CLUB_ADMIN_KEY,
        scope: "TENANT",
        tenantId: TENANT_ID,
        isSystem: false,
        isArchived: false,
      },
      {
        id: "role-canonical",
        key: CANONICAL_CLUB_ADMIN_KEY,
        scope: "TENANT",
        tenantId: TENANT_ID,
        isSystem: true,
        isArchived: false,
      },
      { id: "role-trainer", key: "trainer", scope: "PLATFORM", tenantId: null, isSystem: false, isArchived: false },
    ];

    const roleFindMany = vi.fn(async (args?: { where?: Record<string, unknown> }) => {
      if (args?.where && "key" in (args.where as object)) {
        const startsWith = (args.where as { key?: { startsWith?: string } }).key?.startsWith;
        if (startsWith === "club_admin__") {
          return roles.filter((r) => r.key.startsWith("club_admin__"));
        }
      }
      if (args?.where && (args.where as { tenantId?: string }).tenantId === TENANT_ID) {
        return roles.filter((r) => r.scope === "TENANT" && r.tenantId === TENANT_ID);
      }
      return [];
    });

    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      const role = roles.find((r) => r.key === where.key);
      return role ? { id: role.id } : null;
    });

    const rolePermissionFindUnique = vi.fn(
      async ({
        where,
      }: {
        where: { roleId_permissionId: { roleId: string; permissionId: string } };
      }) => {
        const role = roles.find((r) => r.id === where.roleId_permissionId.roleId);
        if (!role) return null;
        const perm = catalog.find((p) => p.id === where.roleId_permissionId.permissionId);
        if (!perm) return null;
        return roleAssignments.get(role.key)?.has(perm.key) ? { roleId: role.id } : null;
      },
    );

    const rolePermissionUpsert = vi.fn(async ({ where }: { where: { roleId_permissionId: { roleId: string; permissionId: string } } }) => {
      const role = roles.find((r) => r.id === where.roleId_permissionId.roleId);
      const perm = catalog.find((p) => p.id === where.roleId_permissionId.permissionId);
      if (role && perm) {
        const bucket = roleAssignments.get(role.key) ?? new Set();
        bucket.add(perm.key);
        roleAssignments.set(role.key, bucket);
      }
    });

    const tenantFindMany = vi.fn(async () => [{ id: TENANT_ID, key: "demo-club" }]);

    const resolverData = {
      memberships: new Map([
        [USER_CLUB_ADMIN, { tenantId: TENANT_ID, isActive: true }],
        [USER_TRAINER, { tenantId: TENANT_ID, isActive: true }],
      ]),
      userRoles: new Map([
        [USER_CLUB_ADMIN, [{ roleKey: userRoleKey, tenantId: TENANT_ID }]],
        [USER_TRAINER, [{ roleKey: "trainer", tenantId: TENANT_ID }]],
      ]),
    };

    const prisma = {
      permission: { findMany: permissionFindMany, findUnique: permissionFindUnique },
      role: { findMany: roleFindMany, findUnique: roleFindUnique },
      rolePermission: { findUnique: rolePermissionFindUnique, upsert: rolePermissionUpsert },
      tenant: { findMany: tenantFindMany, findUnique: vi.fn(async () => ({ id: TENANT_ID, status: "ACTIVE" })) },
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          resolverData.memberships.has(where.id) ? { id: where.id } : null,
        ),
      },
      tenantMembership: {
        findFirst: vi.fn(async ({ where }: { where: { userId: string; tenantId: string; isActive?: boolean } }) => {
          const m = resolverData.memberships.get(where.userId);
          if (!m || m.tenantId !== where.tenantId) return null;
          return { id: "mem-1", isActive: m.isActive };
        }),
      },
      userRole: {
        findMany: vi.fn(async ({ where }: { where: { userId: string; tenantId?: string } }) => {
          const assignments = resolverData.userRoles.get(where.userId) ?? [];
          return assignments
            .filter((a) => a.tenantId === where.tenantId)
            .map((a) => ({
              tenantId: a.tenantId,
              role: roles.find((r) => r.key === a.roleKey),
            }));
        }),
      },
    } as unknown as PrismaClient;

    function effectiveTenantPermissionsFor(userId: string): string[] {
      const assignments = resolverData.userRoles.get(userId) ?? [];
      const keys = new Set<string>();
      for (const assignment of assignments) {
        const bucket = roleAssignments.get(assignment.roleKey);
        if (bucket) {
          for (const key of bucket) keys.add(key);
        }
      }
      return [...keys];
    }

    return { prisma, rolePermissionUpsert, roleAssignments, effectiveTenantPermissionsFor };
  }

  describe("existing tenant with legacy Club Admin role", () => {
    it("grants finance.view to legacy Club Admin after catalog reconciliation", async () => {
      const { prisma, rolePermissionUpsert, effectiveTenantPermissionsFor } = buildScenario({
        clubAdminUsesLegacyRole: true,
        financePermissionsInCatalog: true,
      });

      await reconcileTenantClubAdminPermissions(prisma, false);

      expect(rolePermissionUpsert).toHaveBeenCalled();
      const tenantPerms = effectiveTenantPermissionsFor(USER_CLUB_ADMIN);

      expect(isFinanceWorkspaceRouteAuthorized([], tenantPerms)).toBe(true);
      expect(tenantPerms).toContain(PERMISSIONS.FINANCE_VIEW);
      expect(tenantPerms).toContain(PERMISSIONS.FINANCE_ADMIN);
    });

    it("shows Finanzen nav targeting /dashboard/finance for authorized Club Admin", async () => {
      const { prisma, effectiveTenantPermissionsFor } = buildScenario({
        clubAdminUsesLegacyRole: true,
        financePermissionsInCatalog: true,
      });
      await reconcileTenantClubAdminPermissions(prisma, false);

      const keys = effectiveTenantPermissionsFor(USER_CLUB_ADMIN);
      const visible = flattenNavSections(getVisibleNavSections(keys));
      const finanzen = visible.find((item) => item.label === "Finanzen");

      expect(finanzen).toEqual(
        expect.objectContaining({ label: "Finanzen", href: "/dashboard/finance" }),
      );
      expect(visible.some((item) => item.label.includes("Partnerschaften"))).toBe(false);
    });

    it("does not grant finance permissions to trainer after reconciliation", async () => {
      const { prisma, effectiveTenantPermissionsFor } = buildScenario({
        clubAdminUsesLegacyRole: true,
        financePermissionsInCatalog: true,
      });
      await reconcileTenantClubAdminPermissions(prisma, false);

      const tenantPerms = effectiveTenantPermissionsFor(USER_TRAINER);

      expect(tenantPerms).not.toContain(PERMISSIONS.FINANCE_VIEW);
      expect(isFinanceWorkspaceRouteAuthorized([], tenantPerms)).toBe(false);
    });
  });

  describe("unconfigured finance workspace", () => {
    it("authorized user passes route gate; overview is NOT_CONFIGURED (no setup bypass needed)", () => {
      expect(
        isFinanceWorkspaceRouteAuthorized([], [PERMISSIONS.FINANCE_VIEW]),
      ).toBe(true);
      expect(
        resolveFinanceOverviewState({
          configuration: null,
          financeYearCount: 0,
          enabledCapabilityCount: 0,
        }),
      ).toBe("NOT_CONFIGURED");
    });
  });

  describe("new tenant bootstrap contract", () => {
    it("includes finance keys in Club Admin delegatable catalog filter", async () => {
      const { prisma } = buildScenario({
        financePermissionsInCatalog: true,
        clubAdminUsesLegacyRole: false,
      });
      const result = await reconcileTenantClubAdminPermissions(prisma, false);
      expect(result.expectedDelegatablePermissionKeys).toEqual(
        expect.arrayContaining([
          "finance.view",
          "finance.structure.manage",
          "finance.admin",
        ]),
      );
    });
  });
});
