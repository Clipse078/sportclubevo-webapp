import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-FCA-ADMIN-UX-IMPERSONATION-01R1 — release hardening sentinels", () => {
  it("admin layout renders STAGE and impersonation banners in the main column", () => {
    const layout = readRelative("app/(admin)/layout.tsx");

    const stageIdx = layout.indexOf("<StageEnvironmentBanner");
    const impersonationIdx = layout.indexOf("<ImpersonationBanner");
    expect(stageIdx).toBeGreaterThan(-1);
    expect(impersonationIdx).toBeGreaterThan(stageIdx);
    expect(layout).toContain("session.user.isImpersonating");
  });

  it("impersonation banner keeps mobile-reachable exit control", () => {
    const banner = readRelative("components/admin/layout/ImpersonationBanner.tsx");
    const stop = readRelative("components/admin/layout/StopImpersonationButton.tsx");

    expect(banner).toContain("flex flex-col gap-3 sm:flex-row");
    expect(banner).toContain("StopImpersonationButton");
    expect(stop).toContain("shrink-0");
  });

  it("person detail impersonation is gated to fully active accounts in UI and API", () => {
    const panel = readRelative("components/admin/users/PersonAdminActionsPanel.tsx");
    const gate = readRelative("lib/admin/users/tenant-impersonation.ts");

    expect(panel).toContain("accessStatus.isFullyActive");
    expect(gate).toContain("PENDING_INVITATION");
    expect(gate).toContain("isInvitation: true");
  });

  it("users.impersonate_tenant migration is idempotent and scoped to system club_admin roles", () => {
    const migration = readRelative(
      "prisma/migrations/20260930180000_sce_users_impersonate_tenant/migration.sql",
    );

    expect(migration).toContain("WHERE NOT EXISTS");
    expect(migration).toContain("ON CONFLICT");
    expect(migration).toContain(`r."key" LIKE 'club_admin__%'`);
    expect(migration).toContain(`r."isSystem" = true`);
    expect(migration).not.toContain("pilot_");
  });

  it("person detail page avoids checkbox role toggles and raw English permission labels in effective access", () => {
    const page = readRelative("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    const roleControl = readRelative(
      "components/admin/users/TenantRoleAssignmentControl.tsx",
    );
    const effectiveView = readRelative(
      "components/admin/users/PersonNavEffectiveAccessView.tsx",
    );

    expect(page).toContain("TenantRoleAssignmentControl");
    expect(roleControl).not.toContain('type="checkbox"');
    expect(roleControl).toContain("SwitchThumb");
    expect(effectiveView).not.toMatch(/users\.|planning\.|communication\./);
  });
});
