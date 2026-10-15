/**
 * SCE-NAVBAR-UPGRADE-01-R4 — shared desktop navigation spine geometry contract
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-NAVBAR-UPGRADE-01-R4 shared navigation spine", () => {
  it("defines canonical spine tokens and left-aligned workspace cells", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("--sce-nav-brand-rail-width");
    expect(css).toContain("--sce-nav-workspace-gutter");
    expect(css).toContain("--sce-nav-start-x");
    expect(css).toContain(".sce-nav-spine-row--primary");
    expect(css).toContain(".sce-nav-spine-workspace-cell");
    expect(css).toMatch(/\.sce-nav-spine-workspace-cell[\s\S]*justify-content: flex-start/);
    expect(css).toMatch(/\.sce-global-primary-nav-track[\s\S]*justify-content: flex-start/);
    expect(css).toMatch(/\.sce-global-primary-nav \{\s*\n\s*justify-content: flex-start;/);
  });

  it("composes one spine primitive across L1 and L2 (L3 is on-demand overlay)", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    const tenantRow = readRelative("components/sce/navigation/SceTenantContextRow.tsx");
    const spine = readRelative("components/sce/navigation/SceNavigationSpineRow.tsx");

    expect(shell).toContain("SceNavigationSpineRow");
    expect(tenantRow).toContain("SceNavigationSpineRow");
    expect(shell).toContain("SceDomainNavigationPanel");
    expect(spine).toContain('data-sce-nav-brand-rail={brand ? "occupied" : "spacer"}');
    expect(spine).toContain("data-sce-nav-workspace");
    expect(spine).toContain("data-sce-nav-utilities");
  });

  it("keeps L1 left-aligned and removes disconnected module workspace eyebrow", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).not.toContain("justify-center");
    expect(shell).not.toContain("workspaceEyebrow");
    expect(shell).not.toContain("moduleWorkspaceEyebrow");

    const tenantRow = readRelative("components/sce/navigation/SceTenantContextRow.tsx");
    expect(tenantRow).not.toContain("workspaceEyebrow");
    expect(tenantRow).not.toContain("sce-global-module-nav-workspace-eyebrow");
  });

  it("preserves brand rail occupancy on L1/L2 without a permanent L3 row", () => {
    const spine = readRelative("components/sce/navigation/SceNavigationSpineRow.tsx");
    expect(spine).toContain('variant: SceNavigationSpineRowVariant');
    expect(spine).toContain("sce-nav-spine-row--sub");
    expect(spine).toMatch(/data-sce-nav-spine-row=\{variant\}/);

    const tenantRow = readRelative("components/sce/navigation/SceTenantContextRow.tsx");
    expect(tenantRow).toContain("brand={brand}");
  });

  it("bounds brand rail width for wide desktop without centering primary nav", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("max-width: var(--sce-nav-brand-rail-width)");
    expect(css).toMatch(/@media \(min-width: 1024px\)[\s\S]*--sce-nav-brand-rail-width/);

    const primary = readRelative("components/sce/navigation/ScePrimaryNavigation.tsx");
    expect(primary).not.toContain("justify-center");
  });

  it("does not introduce a parallel navbar shell", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain('data-testid="sce-global-navigation"');
    expect(shell.match(/<header/g)?.length ?? 0).toBe(1);
  });
});
