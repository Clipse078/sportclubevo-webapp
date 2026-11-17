/**
 * Pending invitation admin projection — planned access from persisted UserRole rows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildPersonDetailAccessOverviewLine } from "@/lib/admin/users/person-detail-access-summary";

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindUnique: vi.fn(),
  userRoleFindMany: vi.fn(),
  userPermissionOverrideFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findUnique: prismaMocks.tenantMembershipFindUnique },
    userRole: { findMany: prismaMocks.userRoleFindMany },
    userPermissionOverride: { findMany: prismaMocks.userPermissionOverrideFindMany },
  },
}));

vi.mock("@/lib/roles/effective-access", () => ({
  getUserEffectiveAccessView: vi.fn(async () => ({
    user: { id: "u-1", firstName: "A", lastName: "B", email: "a@b.ch" },
    tenantId: "tenant-1",
    membershipIsActive: false,
    assignedRoles: [],
    platformRoles: [],
    effectiveTenantPermissionKeys: [],
    effectivePlatformPermissionKeys: [],
    visibleNavItems: [],
    deniedNavItems: [],
  })),
}));

import { resolveAssignedTenantPermissionKeysForProjection } from "@/lib/admin/users/person-assigned-role-permissions";
import { getPersonNavEffectiveAccessSections } from "@/lib/admin/users/person-nav-effective-access";

const TENANT_ID = "tenant-fca";
const USER_ID = "user-invited";
const ROLE_PERMISSION_KEYS = [
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.MEETINGS_MANAGE,
];

const moduleGroups = [
  {
    module: "WORKSPACE",
    permissions: [
      { id: "1", key: PERMISSIONS.WORKSPACE_VIEW, name: "Workspace view", module: "WORKSPACE" },
      { id: "2", key: PERMISSIONS.MEETINGS_VIEW, name: "Meetings view", module: "WORKSPACE" },
      { id: "3", key: PERMISSIONS.MEETINGS_MANAGE, name: "Meetings manage", module: "WORKSPACE" },
      { id: "4", key: PERMISSIONS.TASKS_VIEW, name: "Tasks view", module: "WORKSPACE" },
    ],
  },
];

describe("person invited access projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.tenantMembershipFindUnique.mockResolvedValue({ id: "mem-1" });
    prismaMocks.userPermissionOverrideFindMany.mockResolvedValue([]);
    prismaMocks.userRoleFindMany.mockResolvedValue([
      {
        role: {
          rolePermissions: ROLE_PERMISSION_KEYS.map((key) => ({
            permission: { key, scope: "TENANT" },
          })),
        },
      },
    ]);
  });

  it("resolveAssignedTenantPermissionKeysForProjection reads roles without active membership", async () => {
    const keys = await resolveAssignedTenantPermissionKeysForProjection(TENANT_ID, USER_ID);
    expect(keys).not.toBeNull();
    for (const key of ROLE_PERMISSION_KEYS) {
      expect(keys!.has(key)).toBe(true);
    }
    expect(prismaMocks.tenantMembershipFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: TENANT_ID, userId: USER_ID } },
      }),
    );
  });

  it("returns null when user has no membership in tenant", async () => {
    prismaMocks.tenantMembershipFindUnique.mockResolvedValue(null);
    const keys = await resolveAssignedTenantPermissionKeysForProjection(TENANT_ID, USER_ID);
    expect(keys).toBeNull();
  });

  it("planned projection surfaces modules; effective mode stays empty when membership inactive", async () => {
    const planned = await getPersonNavEffectiveAccessSections(TENANT_ID, USER_ID, moduleGroups, {
      projectionMode: "planned",
    });
    const effective = await getPersonNavEffectiveAccessSections(TENANT_ID, USER_ID, moduleGroups, {
      projectionMode: "effective",
    });

    expect(planned.length).toBeGreaterThan(0);
    expect(planned.some((section) => section.items.length > 0)).toBe(true);
    expect(effective).toEqual([]);
  });

  it("buildPersonDetailAccessOverviewLine distinguishes pending vs active copy", () => {
    const sections = [
      {
        label: "Vereinsentwicklung",
        modules: ["Vereinsentwicklung"],
        items: [{ label: "Vereinsentwicklung", access: "Ansehen" }],
      },
    ];
    expect(buildPersonDetailAccessOverviewLine([], { pendingInvitation: true })).toContain(
      "geplanter",
    );
    expect(buildPersonDetailAccessOverviewLine(sections, { pendingInvitation: true })).toMatch(
      /^Nach Annahme geplant:/,
    );
    expect(buildPersonDetailAccessOverviewLine(sections)).not.toContain("Nach Annahme");
  });
});