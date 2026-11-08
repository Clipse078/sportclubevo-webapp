/**
 * SCE-DS2-02 — Premium header navigation (uppercase, icon-free L1)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_HEADER_NAV_SURFACE_SELECTORS,
  SCE_DS2_HEADER_NAV_TYPOGRAPHY,
} from "@/lib/design-system/sce-navigation-typography-contract";

function readRepo(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-DS2-02 header navigation contract", () => {
  it("documents uppercase icon-free premium labels", () => {
    expect(SCE_DS2_HEADER_NAV_TYPOGRAPHY.decorativeNavIcons).toBe(false);
    expect(SCE_DS2_HEADER_NAV_TYPOGRAPHY.labelTransform).toBe("uppercase");
    expect(SCE_DS2_HEADER_NAV_TYPOGRAPHY.minTapHeightPx).toBeGreaterThanOrEqual(44);
    expect(SCE_DS2_HEADER_NAV_SURFACE_SELECTORS.length).toBeGreaterThan(3);
  });

  it("styles primary header labels with display uppercase typography", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/\.sce-header-nav-label[\s\S]*text-transform:\s*uppercase/);
    expect(css).toMatch(/\.sce-global-primary-nav-item[\s\S]*text-transform:\s*uppercase/);
    expect(css).toMatch(/var\(--font-display\)/);
  });

  it("does not ship decorative L1 domain icons in primary navigation", () => {
    const primaryNav = readRepo("components/sce/navigation/ScePrimaryNavigation.tsx");
    expect(primaryNav).not.toContain("SceIcon");
    expect(primaryNav).not.toContain("sce-global-primary-nav-domain-icon");
  });

  it("omits decorative destination icons in domain navigation panel", () => {
    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).not.toContain("NavDestinationSceIcon");
  });

  it("keeps white-edition panel surfaces on semantic chrome tokens", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-domain-nav-panel[\s\S]*var\(--sce-app-chrome\)/,
    );
  });
});
