import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { SANDRA_FISCHER_SPIELBETRIEB_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { canShowImpersonateTenantUserAction } from "@/lib/admin/users/tenant-impersonation";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("PEOPLE-ACCESS-IMPERSONATION-01 UAT-PERM-01R6 — discoverable start UI", () => {
  it("People & Access page derives actor impersonation capability from live DB helper", () => {
    const page = readRelative("app/(admin)/dashboard/admin/people-access/page.tsx");
    expect(page).toContain("actorHasImpersonateTenantPermission");
    expect(page).toContain("canImpersonateTenant");
    expect(page).toContain("actorUserId");
    expect(page).toContain("!session.user.isImpersonating");
  });

  it("row overflow menu exposes Als Benutzer ansehen via canonical ImpersonateButton", () => {
    const menu = readRelative("components/admin/users/UserRowActionsMenu.tsx");
    const button = readRelative("components/admin/users/ImpersonateButton.tsx");
    expect(menu).toContain("canImpersonateTarget");
    expect(menu).toContain('variant="row-menu"');
    expect(menu).toContain("Aus Verein entfernen");
    expect(button).toContain("/api/users/${userId}/impersonate");
    expect(button).toContain("Als Benutzer ansehen");
    expect(button).toContain('redirectTo');
  });

  it("person quick-detail drawer exposes the same start control", () => {
    const drawer = readRelative("components/admin/users/people-access/PersonAccessDrawer.tsx");
    expect(drawer).toContain("canShowImpersonateTenantUserAction");
    expect(drawer).toContain("ImpersonateButton");
    expect(drawer).toContain("Zugriff bearbeiten");
    expect(drawer).toContain("Detailseite");
  });

  it("start API remains actor-scoped with users.impersonate_tenant", () => {
    const route = readRelative("app/api/users/[userId]/impersonate/route.ts");
    expect(route).toContain("requireApiActorTenantPermission");
    expect(route).toContain("USERS_IMPERSONATE_TENANT");
    expect(route).toContain("assertCanImpersonateTenantMember");
    expect(route).toContain('redirectTo: "/dashboard"');
    expect(route).toContain("NESTED_IMPERSONATION");
  });

  it("UI eligibility never uses target permissions for actor capability", () => {
    const list = readRelative("components/admin/users/TenantUsersSearchableList.tsx");
    expect(list).toContain("canImpersonateTenant");
    expect(list).not.toContain("USERS_IMPERSONATE_TENANT");
    expect(
      canShowImpersonateTenantUserAction({
        actorCanImpersonate: true,
        actorUserId: "admin",
        targetUserId: "sandra",
        pendingInvitation: false,
        membershipIsActive: true,
        userIsActive: true,
        isPlatformSystemIdentity: false,
      }),
    ).toBe(true);
  });

  it("self target hidden when actor equals target", () => {
    expect(
      canShowImpersonateTenantUserAction({
        actorCanImpersonate: true,
        actorUserId: "admin",
        targetUserId: "admin",
        pendingInvitation: false,
        membershipIsActive: true,
        userIsActive: true,
        isPlatformSystemIdentity: false,
      }),
    ).toBe(false);
  });

  it("R5 sticky safety chrome architecture unchanged", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout).toContain("sce-authenticated-sticky-shell-chrome");
    expect(layout).toContain("ImpersonationSafetyChrome");
  });

  it("R4 Match allocation editor gate preserved", () => {
    const workspace = readRelative("components/admin/planner/WeekPlannerWorkspace.tsx");
    expect(workspace).toContain("canOpenPlannerCanonicalEditor");
    expect(workspace).toContain("canManageAllocations");
  });

  it("Sandra persona still lacks impersonation permission", () => {
    expect(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.USERS_IMPERSONATE_TENANT,
    );
  });
});
