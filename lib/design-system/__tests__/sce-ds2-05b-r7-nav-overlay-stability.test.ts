/**
 * SCE-DS2-05B-R7 — portalled overlay, one scrollport, no measurement loop.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_05B_R7_DOC_MARKERS,
  SCE_DS2_05B_R7_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-05b-r7-meta";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R7 navigation overlay stability", () => {
  it("documents package markers across overlay surfaces", () => {
    const sources = [
      readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx"),
      readRepo("components/admin/layout/AppShellNavigation.tsx"),
      readRepo("app/(admin)/global-app-navigation.css"),
      readRepo("lib/nav/sce-domain-nav-overlay-geometry.ts"),
    ].join("\n");
    for (const marker of SCE_DS2_05B_R7_DOC_MARKERS) {
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05B_R7_PACKAGE_KEY).toBe("SCE-DS2-05B-R7");
  });

  it("removes the R5/R6 header ResizeObserver measurement loop", () => {
    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    const geometry = readRepo("lib/nav/sce-domain-nav-overlay-geometry.ts");
    expect(panel).not.toContain("ResizeObserver");
    expect(panel).not.toContain("--sce-domain-nav-panel-top");
    expect(panel).toContain("createPortal");
    expect(geometry).not.toContain("ResizeObserver");
    expect(geometry).toContain("resolveDomainNavOverlayAnchorBottom");
  });

  it("positions the overlay independently of dashboard flow with one scrollport", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/\.sce-domain-nav-panel[\s\S]*position:\s*fixed/);
    expect(css).toMatch(
      /\.sce-domain-nav-panel-cham-body[\s\S]*max-height:\s*var\(--sce-domain-nav-overlay-max-height\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-cham-body[\s\S]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.sce-domain-nav-panel-cham-body[\s\S]*scrollbar-gutter:\s*stable/);
    expect(css).toMatch(/\.sce-domain-nav-panel-l2[\s\S]*overflow:\s*visible/);
    expect(css).not.toContain("--sce-domain-nav-panel-top:");
  });

  it("keeps the overlay portalled without a persistent L2/L3 row in the header", () => {
    const shell = readRepo("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).not.toContain("SceHierarchicalDesktopNavigation");
    expect(shell).not.toContain("SceTenantContextRow");
    expect(shell).toContain("SceDomainNavigationPanel");
    expect(readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx")).toContain(
      "createPortal",
    );
    expect(shell).toContain("sce-domain-nav-overlay-anchor");
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).not.toContain(".sce-global-module-nav {");
    expect(css).not.toContain(".sce-global-context-nav {");
    expect(css).not.toContain("--sce-nav-context-row-height");
  });

  it("preserves Cham typography, columns, and white-first surfaces", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/\.sce-domain-nav-panel-section-title[\s\S]*font-style:\s*italic/);
    expect(css).toMatch(
      /\.sce-domain-nav-panel--three-column \.sce-domain-nav-panel-cham-frame[\s\S]*grid-template-columns:\s*minmax\(0,\s*32fr\)\s*minmax\(0,\s*33fr\)\s*minmax\(0,\s*35fr\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-l2-link[\s\S]*text-transform:\s*uppercase/);
    expect(css).toContain('.sce-domain-nav-panel[data-sce-theme="white"]');
  });
});
