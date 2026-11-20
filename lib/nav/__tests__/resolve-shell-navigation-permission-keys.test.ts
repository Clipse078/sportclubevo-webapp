import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildAppNavigationModelForUser,
  resolveDomainPanelRightColumnEntries,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";

const mocks = vi.hoisted(() => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));

import { resolveShellNavigationPermissionKeys } from "@/lib/nav/resolve-shell-navigation-permission-keys";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveShellNavigationPermissionKeys", () => {
  it("merges platform and tenant live permissions for the effective actor", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [PERMISSIONS.USERS_VIEW],
      tenant: [PERMISSIONS.MELDUNGEN_HANDLE],
    });

    const keys = await resolveShellNavigationPermissionKeys({
      effectiveUserId: "user-1",
      activeTenantId: "tenant-1",
    });

    expect(mocks.getRequestEffectivePermissions).toHaveBeenCalledWith("user-1", "tenant-1");
    expect(keys).toContain(PERMISSIONS.MELDUNGEN_HANDLE);
    expect(keys).toContain(PERMISSIONS.USERS_VIEW);
    expect(keys).toEqual([...keys].sort());
  });

  it("exposes Anliegen & Meldungen in Vereinsbetrieb when live tenant grants exist but JWT would omit them", async () => {
    const clubAdminBaseline = [
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
      PERMISSIONS.EVENTS_VIEW,
    ];
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [...clubAdminBaseline, PERMISSIONS.MELDUNGEN_VIEW_ALL],
    });
    const liveKeys = await resolveShellNavigationPermissionKeys({
      effectiveUserId: "club-admin",
      activeTenantId: "tenant-fca",
    });
    const staleJwtKeys = clubAdminBaseline;

    const liveModel = buildAppNavigationModelForUser(liveKeys, "club");
    const staleModel = buildAppNavigationModelForUser(staleJwtKeys, "club");
    const clubLive = liveModel.domains.find((d) => d.id === "club")!;
    const clubStale = staleModel.domains.find((d) => d.id === "club")!;

    const betriebLive = resolveDomainSecondaryNavItems(clubLive).find(
      (i) => i.headerGroupId === "club-betrieb",
    );
    const betriebStale = resolveDomainSecondaryNavItems(clubStale).find(
      (i) => i.headerGroupId === "club-betrieb",
    );

    expect(
      resolveDomainPanelRightColumnEntries(clubLive, betriebLive!).some(
        (e) => e.key === "anliegen-meldungen",
      ),
    ).toBe(true);
    expect(
      resolveDomainPanelRightColumnEntries(clubStale, betriebStale!).some(
        (e) => e.key === "anliegen-meldungen",
      ),
    ).toBe(false);
  });

  it("admin layout feeds live resolver output into AppShellNavigation (not JWT snapshot alone)", () => {
    const layout = readFileSync(resolve(process.cwd(), "app/(admin)/layout.tsx"), "utf8");
    expect(layout).toContain("resolveShellNavigationPermissionKeys");
    expect(layout).toContain("shellNavigationPermissionKeys");
    expect(layout).not.toMatch(/permissionKeys=\{session\.user\.permissionKeys\}/);
  });
});