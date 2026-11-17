/**
 * USER-ADMIN-02C / #1008 — route, page, and access catalog agree on who may
 * sync tenant-wide role assignments via PUT /api/admin/users/[userId]/roles.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  TENANT_ROLES_ASSIGN,
  TENANT_USER_ROLES_SYNC,
} from "@/lib/roles/access";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("tenant user roles sync — authorization surface alignment", () => {
  it("TENANT_USER_ROLES_SYNC is the union of membership manage + role assign", () => {
    expect(TENANT_USER_ROLES_SYNC).toEqual(
      expect.arrayContaining([
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
        ...TENANT_ROLES_ASSIGN,
      ]),
    );
    expect(new Set(TENANT_USER_ROLES_SYNC).size).toBe(TENANT_USER_ROLES_SYNC.length);
  });

  it("PUT route gates on TENANT_USER_ROLES_SYNC", () => {
    const route = readRelative("app/api/admin/users/[userId]/roles/route.ts");
    expect(route).toContain("TENANT_USER_ROLES_SYNC");
    expect(route).toContain("requireApiAnyPermission(TENANT_USER_ROLES_SYNC)");
    expect(route).not.toContain("TENANT_USER_ROLES_MANAGE");
  });

  it('admin user detail page gates "Rollen & Funktionen" on TENANT_USER_ROLES_SYNC', () => {
    const page = readRelative("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    expect(page).toContain("TENANT_USER_ROLES_SYNC");
    expect(page).toContain("canManageTenantRoles");
    expect(page).toMatch(/canManage=\{canManageTenantRoles/);
  });

  it("setTenantUserRoles enforces grant ceiling only for newly added roles", () => {
    const mutations = readRelative("lib/roles/mutations.ts");
    expect(mutations).toMatch(/if \(toAdd\.length > 0\)[\s\S]*assertTenantDelegationAllowed/);
    expect(mutations).not.toMatch(
      /toRemove[\s\S]{0,200}assertTenantDelegationAllowed/,
    );
  });
});