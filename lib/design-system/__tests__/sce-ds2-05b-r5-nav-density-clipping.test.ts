/**
 * SCE-DS2-05B-R5 — compact domain panel, viewport-clamped scroll, column balance.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_05B_R5_DOC_MARKERS,
  SCE_DS2_05B_R5_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-05b-r5-meta";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R5 delivery", () => {
  it("documents package markers across navigation surfaces", () => {
    const sources = [
      readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx"),
      readRepo("app/(admin)/global-app-navigation.css"),
    ].join("\n");
    for (const marker of SCE_DS2_05B_R5_DOC_MARKERS) {
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05B_R5_PACKAGE_KEY).toBe("SCE-DS2-05B-R5");
  });

  it("uses viewport-aware max height and a single scrollport for L2/L3 lists", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toContain("--sce-domain-nav-overlay-max-height");
    expect(css).toMatch(
      /\.sce-domain-nav-panel-cham-body[\s\S]*max-height:\s*var\(--sce-domain-nav-overlay-max-height\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-cham-body[\s\S]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.sce-domain-nav-panel-cham-body[\s\S]*min-height:\s*0/);
    expect(css).toMatch(
      /\.sce-domain-nav-panel-section-title[\s\S]*position:\s*sticky/,
    );
  });

  it("tightens L2/L3 row density while preserving Barlow Condensed uppercase labels", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/--sce-domain-nav-row-min-height:\s*2\.75rem/);
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link[\s\S]*min-height:\s*var\(--sce-domain-nav-row-min-height\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link[\s\S]*font-size:\s*1rem/,
    );
    expect(css).toMatch(/font-weight:\s*700/);
  });

  it("balances three-column proportions on the centered Cham frame", () => {
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\.sce-domain-nav-panel--three-column \.sce-domain-nav-panel-cham-frame[\s\S]*grid-template-columns:\s*minmax\(0,\s*32fr\)\s*minmax\(0,\s*33fr\)\s*minmax\(0,\s*35fr\)/,
    );
  });

  it("keeps compact Cham accessibility hooks after the overlay repair", () => {
    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toMatch(/headerRef\.current/);
    expect(panel).toContain('role="navigation"');
    expect(panel).toContain("aria-expanded={selected}");
  });
});
