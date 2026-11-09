/**
 * SCE-DS2-05B-R9 — desktop shell no longer reserves persistent L2/L3 navigation rows.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R9 redundant horizontal navigation removal", () => {
  it("removes the persistent row components from the desktop shell", () => {
    const shell = readRepo("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SCE-DS2-05B-R9");
    expect(shell).toContain("ScePrimaryNavigation");
    expect(shell).toContain("SceDomainNavigationPanel");
    expect(shell).toContain("GlobalNavDrawer");
    expect(shell).toContain("SCE_MOBILE_BOTTOM_NAV_CLASS");
    expect(shell).not.toContain("SceHierarchicalDesktopNavigation");
    expect(shell).not.toContain("SceTenantContextRow");
    expect(shell).not.toContain("domain-secondary-nav");
    expect(shell).not.toContain("domain-contextual-nav");
    expect(existsSync(join(ROOT, "components/sce/navigation/SceHierarchicalDesktopNavigation.tsx"))).toBe(
      false,
    );
    expect(existsSync(join(ROOT, "components/sce/navigation/SceTenantContextRow.tsx"))).toBe(false);
  });

  it("keeps the canonical navigation model and portalled mega menu", () => {
    const model = readRepo("lib/nav/app-navigation-model.ts");
    expect(model).toContain("export function resolveDomainSecondaryNavItems");
    expect(model).toContain("export function resolveActiveAppNavigation");
    expect(model).toContain("export function buildAppNavigationModelForUser");

    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain("createPortal");
    expect(panel).toContain("sce-domain-nav-panel-l2");
    expect(panel).toContain("sce-domain-nav-panel-l3");
    expect(panel).toContain("sce-domain-nav-panel-l2-link--active");
    expect(panel).toContain("sce-domain-nav-panel-l3-link--active");
  });

  it("does not reserve empty header bands or context-row offsets", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toContain("SCE-DS2-05B-R9");
    expect(css).toMatch(/\.sce-domain-nav-overlay-anchor[\s\S]*height:\s*0/);
    expect(css).toMatch(/\.sce-domain-nav-overlay-anchor[\s\S]*min-height:\s*0/);
    expect(css).toMatch(/\.sce-domain-nav-panel[\s\S]*position:\s*fixed/);
    expect(css).not.toContain(".sce-global-module-nav");
    expect(css).not.toContain(".sce-global-context-nav");
    expect(css).not.toContain("--sce-nav-context-row-height");
    expect(css).not.toContain("sce-tenant-context-workspace-empty");
    expect(readRepo("components/admin/layout/AppShellNavigation.tsx")).toContain(
      "sce-domain-nav-overlay-anchor",
    );
  });
});
