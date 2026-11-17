/**
 * USER-ADMIN-02C — /api/admin/users/[userId]/roles route unit tests
 *
 * Verifies request/response plumbing and permission gates for the tenant
 * role management endpoint on the admin user detail page. Business logic
 * (last-admin guard, membership check, cross-tenant isolation) is covered
 * by the service-layer integration tests in
 * lib/roles/__tests__/user-admin-02c-set-tenant-user-roles.test.ts.
 *
 * Covers:
 *   RT-01  GET: requires users.view OR users.manage; returns roles + assignedRoleIds
 *   RT-02  GET: 403 when unauthenticated
 *   RT-03  GET: 404 when user is not a member of the active tenant
 *   RT-04  PUT: requires role-manage permission set; 403 for users.view-only caller
 *   RT-05  PUT: delegates to setTenantUserRoles with session-derived tenantId
 *   RT-06  PUT: tenantId in body is ignored; only session tenantId is used
 *   RT-07  PUT: maps LastRequiredAdminError → 409 LAST_REQUIRED_ADMIN
 *   RT-08  PUT: maps RoleNotFoundError → 404 ROLE_NOT_FOUND (cross-tenant/platform)
 *   RT-09  PUT: 400 when roleIds is not an array
 *   RT-10  PUT: 401 for unauthenticated request
 *   RT-11  PUT: passes TENANT_USER_ROLES_SYNC to requireApiAnyPermission
 *   RT-12  PUT: maps DelegationForbiddenError → 403 DELEGATION_FORBIDDEN
 *   RT-13  PUT: service rejection still runs after route allows roles.assign-only caller
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_USER_ROLES_SYNC } from "@/lib/roles/access";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getTenantRolesOverview: vi.fn(),
  setTenantUserRoles: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/roles/tenant-queries", () => ({
  getTenantRolesOverview: mocks.getTenantRolesOverview,
}));

vi.mock("@/lib/roles/mutations", () => ({
  setTenantUserRoles: mocks.setTenantUserRoles,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findUnique: mocks.findUnique },
    userRole: { findMany: mocks.findMany },
  },
}));

import { GET, PUT } from "@/app/api/admin/users/[userId]/roles/route";
import {
  DelegationForbiddenError,
  LastRequiredAdminError,
  RoleNotFoundError,
} from "@/lib/roles/errors";
import { NextRequest } from "next/server";

const SESSION_TENANT_ID = "tenant-session";
const ACTOR_USER_ID = "actor-1";
const TARGET_USER_ID = "user-42";

function ctx() {
  return { params: Promise.resolve({ userId: TARGET_USER_ID }) };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: ACTOR_USER_ID,
      activeTenantId: SESSION_TENANT_ID,
      ...overrides,
    },
  };
}

function mockViewAccess() {
  mocks.requireApiAnyPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    session: makeSession(),
  });
}

function mockManageAccess() {
  mocks.requireApiAnyPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    session: makeSession(),
  });
}

function mockMembershipFound(isActive = true) {
  mocks.findUnique.mockResolvedValue({ isActive });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/admin/users/[userId]/roles", () => {
  it("RT-01: returns roles and assignedRoleIds for authorized caller", async () => {
    mockViewAccess();
    mockMembershipFound();
    mocks.getTenantRolesOverview.mockResolvedValue([
      { id: "role-1", name: "Admin", isSystem: true, isArchived: false },
      { id: "role-2", name: "Trainer", isSystem: false, isArchived: false },
      { id: "role-3", name: "Old Archived", isSystem: false, isArchived: true },
    ]);
    mocks.findMany.mockResolvedValue([{ roleId: "role-1" }]);

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
    );
    const res = await GET(req, ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.roles).toHaveLength(2); // archived filtered out
    expect(body.roles.map((r: { id: string }) => r.id)).not.toContain("role-3");
    expect(body.assignedRoleIds).toEqual(["role-1"]);
  });

  it("RT-02: 403 when not authenticated", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
    );
    const res = await GET(req, ctx());
    expect(res.status).toBe(403);
  });

  it("RT-03: 404 when user is not a member of the active tenant", async () => {
    mockViewAccess();
    mocks.findUnique.mockResolvedValue(null); // No membership

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
    );
    const res = await GET(req, ctx());
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe("PUT /api/admin/users/[userId]/roles", () => {
  it("RT-04: 403 with German message for a caller without role-manage permissions", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
    });

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: [] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toMatch(/Keine Berechtigung/i);
    expect(mocks.setTenantUserRoles).not.toHaveBeenCalled();
  });

  it("RT-05: delegates to setTenantUserRoles with session-derived tenantId", async () => {
    mockManageAccess();
    mocks.setTenantUserRoles.mockResolvedValue({ assigned: [], removed: [] });

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: ["role-1", "role-2"] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    await PUT(req, ctx());

    expect(mocks.setTenantUserRoles).toHaveBeenCalledWith({
      tenantId: SESSION_TENANT_ID,
      userId: TARGET_USER_ID,
      roleIds: ["role-1", "role-2"],
      actorUserId: ACTOR_USER_ID,
    });
  });

  it("RT-06: body-supplied tenantId is ignored; only session tenantId is used", async () => {
    mockManageAccess();
    mocks.setTenantUserRoles.mockResolvedValue({ assigned: [], removed: [] });

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({
          roleIds: ["role-1"],
          tenantId: "attacker-tenant",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );
    await PUT(req, ctx());

    expect(mocks.setTenantUserRoles).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: SESSION_TENANT_ID }),
    );
  });

  it("RT-07: maps LastRequiredAdminError to 409 with LAST_REQUIRED_ADMIN code", async () => {
    mockManageAccess();
    mocks.setTenantUserRoles.mockRejectedValue(new LastRequiredAdminError());

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: [] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe("LAST_REQUIRED_ADMIN");
  });

  it("RT-08: maps RoleNotFoundError to 404 with ROLE_NOT_FOUND code", async () => {
    mockManageAccess();
    mocks.setTenantUserRoles.mockRejectedValue(new RoleNotFoundError());

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: ["foreign-role-id"] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("ROLE_NOT_FOUND");
  });

  it("RT-09: 400 when roleIds is missing or not an array", async () => {
    mockManageAccess();

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: "not-an-array" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());
    expect(res.status).toBe(400);
    expect(mocks.setTenantUserRoles).not.toHaveBeenCalled();
  });

  it("RT-11: authorize PUT with TENANT_USER_ROLES_SYNC (route guard only)", async () => {
    mockManageAccess();

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: [] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    await PUT(req, ctx());

    const [permissionKeys] = mocks.requireApiAnyPermission.mock.calls.at(-1) ?? [];
    expect(permissionKeys).toEqual(TENANT_USER_ROLES_SYNC);
    expect(permissionKeys).toContain(PERMISSIONS.ROLES_ASSIGN);
    expect(permissionKeys).toContain(PERMISSIONS.USERS_MANAGE_MEMBERSHIPS);
  });

  it("RT-12: maps DelegationForbiddenError to 403 with DELEGATION_FORBIDDEN code", async () => {
    mockManageAccess();
    mocks.setTenantUserRoles.mockRejectedValue(
      new DelegationForbiddenError(undefined, ["users.invite"]),
    );

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: ["role-new"] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("DELEGATION_FORBIDDEN");
    expect(body.missingPermissionKeys).toEqual(["users.invite"]);
  });

  it("RT-13: broadened route guard does not skip service delegation checks", async () => {
    mockManageAccess();
    mocks.setTenantUserRoles.mockRejectedValue(new DelegationForbiddenError());

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: ["role-1", "role-2"] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());

    expect(res.status).toBe(403);
    expect(mocks.setTenantUserRoles).toHaveBeenCalled();
  });

  it("RT-10: 401 for unauthenticated request", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
      session: null,
    });

    const req = new NextRequest(
      `http://localhost/api/admin/users/${TARGET_USER_ID}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: [] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await PUT(req, ctx());
    expect(res.status).toBe(401);
  });
});
