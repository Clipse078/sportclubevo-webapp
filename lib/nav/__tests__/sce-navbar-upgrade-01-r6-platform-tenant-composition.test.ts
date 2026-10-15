/**
 * SCE-NAVBAR-UPGRADE-01-R6 — two-row platform / tenant navigation composition
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_SHELL_RAIL_WIDTH_VAR,
  SCE_SHELL_WORKSPACE_START_VAR,
} from "@/lib/shell/sce-application-grid";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-NAVBAR-UPGRADE-01-R6 platform / tenant rows", () => {
  it("places SportClubEvo on row 1 and tenant context on row 2 (desktop)", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("ScePlatformBrandRail");
    expect(shell).toContain('className="hidden md:flex"');
    expect(shell).toContain("SceTenantContextRail");
    expect(shell).toContain('className="hidden md:flex"');
    expect(shell).toMatch(/SceModuleNavigation[\s\S]*brand=\{/);

    const tenantBar = readRelative("components/sce/navigation/SceTenantIdentityBar.tsx");
    expect(tenantBar).toContain("ScePlatformBrandRail");
    expect(tenantBar).toContain('data-testid="sce-platform-brand-rail"');
    expect(tenantBar).toContain('layout={compact ? "under-product-compact" : "tenant-row-rail"}');
  });

  it("does not duplicate tenant identity in row 1 brand rail on desktop", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    const primaryBrandBlock = shell.match(
      /variant="primary"[\s\S]*?utilities=\{/,
    )?.[0];
    expect(primaryBrandBlock).toBeTruthy();
    expect(primaryBrandBlock).toContain("ScePlatformBrandRail");
    expect(primaryBrandBlock).not.toContain("SceTenantContextRail");
    expect(primaryBrandBlock).toContain("md:hidden");

    const moduleNav = readRelative("components/sce/navigation/SceModuleNavigation.tsx");
    expect(moduleNav).toContain("brand?: ReactNode");
    expect(moduleNav).toContain("brand={brand}");
  });

  it("removed permanent desktop Row 3 in favor of on-demand L3 panel from Row 2", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).not.toContain("<SceContextNavigation");

    const moduleNav = readRelative("components/sce/navigation/SceModuleNavigation.tsx");
    expect(moduleNav).toContain("SceContextNavigationPanel");

    const spine = readRelative("components/sce/navigation/SceNavigationSpineRow.tsx");
    expect(spine).toContain('data-sce-nav-brand-rail={brand ? "occupied" : "spacer"}');
  });

  it("preserves R5 canonical application grid and shared workspace start", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain(SCE_SHELL_RAIL_WIDTH_VAR);
    expect(css).toContain(SCE_SHELL_WORKSPACE_START_VAR);
    expect(css).toContain("sce-app-shell-page-grid");
    expect(css).not.toContain("max-w-screen-xl");

    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout).toContain("SceApplicationPageGrid");
  });

  it("keeps global utilities on row 1 and permission-aware shell wiring", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceGlobalUtilities");
    expect(shell).toContain("buildAppNavigationModelForUser");
    expect(shell).toContain("GlobalNavDrawer");
    expect(shell).toContain("SCE_MOBILE_BOTTOM_NAV_CLASS");
  });

  it("uses tenant-row-rail crest sizing without legacy navbar hacks", () => {
    const tenant = readRelative("components/admin/layout/HeaderTenantIdentity.tsx");
    expect(tenant).toContain('"tenant-row-rail"');
    expect(tenant).toContain('"header-crest"');
  });
});
