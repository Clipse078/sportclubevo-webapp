import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { isTenantClubAdminDelegatablePermission } from "@/lib/permissions/tenant-club-admin-permission-contract";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("PEOPLE-ACCESS-IMPERSONATION-01R7 — row menu UX polish", () => {
  it("uses canonical PopoverContent dark surface (no white card menu)", () => {
    const menu = readRelative("components/admin/users/UserRowActionsMenu.tsx");
    expect(menu).toContain("PopoverContent");
    expect(menu).not.toContain("bg-white py-1 shadow");
    expect(menu).toContain('placement="bottom-end"');
    expect(menu).toContain("w-[min(100vw-2rem,14.5rem)]");
    expect(menu).toContain('role="menu"');
  });

  it("preserves R6 impersonation wiring and hierarchy labels", () => {
    const menu = readRelative("components/admin/users/UserRowActionsMenu.tsx");
    expect(menu).toContain("canImpersonateTarget");
    expect(menu).toContain('variant="row-menu"');
    expect(menu).toContain("Zugriff bearbeiten");
    expect(menu).toContain("Detailseite");
    expect(menu).toContain("Aus Verein entfernen");
    expect(menu).toContain("MenuDivider");
  });

  it("documents impersonation permission delegatability audit (catalog unchanged in R7)", () => {
    const delegatable = isTenantClubAdminDelegatablePermission({
      key: PERMISSIONS.USERS_IMPERSONATE_TENANT,
      scope: "TENANT",
      grantableByAdmin: true,
    });
    expect(delegatable).toBe(true);
  });
});
