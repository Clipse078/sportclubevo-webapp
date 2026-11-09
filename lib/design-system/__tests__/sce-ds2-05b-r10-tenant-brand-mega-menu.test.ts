/**
 * SCE-DS2-05B-R10 — tenant crest slot and Cham mega-menu frame geometry.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  headerCrestBox,
  resolveBrandRailItemWidths,
} from "@/lib/branding/sce-header-crest-layout";
import {
  SCE_DOMAIN_NAV_CHECK_VIEWPORTS,
  computeDomainNavMenuLayout,
  parseDomainNavMenuTokens,
} from "@/lib/nav/sce-domain-nav-menu-layout";

const ROOT = process.cwd();
const NAV_CSS = "app/(admin)/global-app-navigation.css";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R10 tenant crest and mega-menu frame", () => {
  it("reserves a non-shrinking crest box and lets the club name truncate", () => {
    const crest = headerCrestBox(38);
    expect(crest).toEqual({
      flex: "0 0 auto",
      width: 38,
      height: 38,
      minWidth: 38,
      minHeight: 38,
      maxWidth: 38,
    });

    const railContentWidth = 15.5 * 16 - 0.75 * 16;
    const collapsed = resolveBrandRailItemWidths({
      railContentWidth,
      gap: 8,
      crest: { flexShrink: 1, flexBasis: 38, minWidth: 0 },
      nameMaxContent: 420,
      nameFlexShrink: 0,
      nameMinWidth: 420,
    });
    expect(collapsed.crestWidth).toBe(0);

    const restored = resolveBrandRailItemWidths({
      railContentWidth,
      gap: 8,
      crest: {
        flexShrink: 0,
        flexBasis: crest.width,
        minWidth: crest.minWidth,
      },
      nameMaxContent: 420,
      nameFlexShrink: 1,
      nameMinWidth: 0,
    });
    expect(restored.crestWidth).toBe(38);
    expect(restored.nameWidth).toBeGreaterThan(0);
    expect(restored.crestWidth + restored.nameWidth).toBeLessThanOrEqual(
      railContentWidth,
    );

    const logo = readRepo("components/admin/branding/TenantLogo.tsx");
    expect(logo).toContain("headerCrestBox");
    expect(logo).toContain("header-crest");
    expect(logo).toContain("sce-tenant-header-crest");
    expect(logo).not.toContain("fc-allschwil");
    expect(logo).not.toContain('style.display = "none"');
    expect(logo).toContain("tenant-logo-header-initials");
  });

  it("keeps crest and uppercase italic name in the desktop header rail", () => {
    const identity = readRepo(
      "components/admin/layout/HeaderTenantIdentity.tsx",
    );
    expect(identity).toContain('variant="header-crest"');
    expect(identity).toContain("sce-tenant-header-identity-name");
    expect(identity).toContain("logoUrl");
    const markup = identity.slice(identity.indexOf("const identity"));
    expect(markup.indexOf("<TenantLogo")).toBeGreaterThan(-1);
    expect(markup.indexOf("<TenantLogo")).toBeLessThan(
      markup.indexOf("{displayName}"),
    );

    const rail = readRepo("components/sce/navigation/SceTenantIdentityBar.tsx");
    expect(rail).toContain(
      'layout={compact ? "under-product-compact" : "tenant-header-primary"}',
    );

    const shell = readRepo("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("logoUrl={logoUrl}");
    expect(shell).toContain('className="hidden md:flex"');

    const css = readRepo(NAV_CSS);
    expect(css).toMatch(/\.sce-tenant-header-crest[\s\S]*flex:\s*0 0 auto/);
    expect(css).toMatch(
      /\.sce-tenant-header-crest img[\s\S]*object-fit:\s*contain/,
    );
    expect(css).toMatch(
      /\.sce-tenant-header-identity-name[\s\S]*font-style:\s*italic/,
    );
    expect(css).toMatch(
      /\.sce-tenant-header-identity-name[\s\S]*text-transform:\s*uppercase/,
    );
    expect(css).toMatch(
      /\.sce-tenant-header-identity-name[\s\S]*min-width:\s*0/,
    );
    expect(css).toContain("--topnav-height: 3.375rem");
  });

  it("lays the mega menu out in one centered frame at desktop widths", () => {
    const css = readRepo(NAV_CSS);
    const tokens = parseDomainNavMenuTokens(css);
    expect(css).toContain("minmax(0, 32fr) minmax(0, 33fr) minmax(0, 35fr)");
    expect(css).toContain(
      "width: min(100%, var(--sce-domain-nav-content-max))",
    );
    expect(css).toContain("margin-inline: auto");
    expect(css).toMatch(
      /\.sce-domain-nav-panel-cham-body[\s\S]*overflow-y:\s*auto/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-cham-frame[\s\S]*overflow:\s*visible/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2,\s*\.sce-domain-nav-panel-l3[\s\S]*overflow:\s*visible/,
    );
    expect(css).not.toContain(".sce-global-module-nav");
    expect(css).not.toContain(".sce-global-context-nav");

    const layouts = SCE_DOMAIN_NAV_CHECK_VIEWPORTS.map((viewport) =>
      computeDomainNavMenuLayout(tokens, viewport.width, viewport.height, 54),
    );

    for (const layout of layouts) {
      expect(layout.horizontalOverflow, `${layout.viewportWidth}`).toBe(false);
      expect(layout.outerInset).toBeGreaterThanOrEqual(72);
      expect(layout.containerWidth).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.contentWidth + layout.padInline * 2).toBeCloseTo(
        layout.containerWidth,
        4,
      );
      expect(layout.freeShares.title).toBeGreaterThanOrEqual(0.3);
      expect(layout.freeShares.title).toBeLessThanOrEqual(0.35);
      expect(layout.freeShares.categories).toBeGreaterThanOrEqual(0.3);
      expect(layout.freeShares.categories).toBeLessThanOrEqual(0.35);
      expect(layout.freeShares.destinations).toBeGreaterThan(0.25);
      expect(
        layout.columns.title +
          layout.columns.categories +
          layout.columns.destinations +
          layout.columnGap * 2,
      ).toBeCloseTo(layout.contentWidth, 4);
      expect(layout.columnGap).toBeGreaterThanOrEqual(32);
      expect(layout.paddingBlockStart).toBeGreaterThanOrEqual(24);
      expect(layout.paddingBlockEnd).toBeGreaterThanOrEqual(24);
      expect(
        layout.paddingBlockStart + layout.paddingBlockEnd,
      ).toBeLessThanOrEqual(64);
      expect(layout.overlayTop).toBe(54);
      expect(layout.scrollportMaxHeight).toBeGreaterThan(tokens.rowMinHeightPx);
      expect(layout.bottomGap).toBeGreaterThanOrEqual(12);
      expect(
        layout.overlayTop + layout.scrollportMaxHeight,
      ).toBeLessThanOrEqual(layout.viewportHeight);

      const longMenuHeight =
        layout.paddingBlockStart +
        layout.paddingBlockEnd +
        tokens.rowMinHeightPx * 14;
      expect(longMenuHeight).toBeGreaterThan(layout.scrollportMaxHeight);
      expect(layout.scrollportMaxHeight).toBeGreaterThan(
        tokens.rowMinHeightPx * 2,
      );
    }

    expect(layouts[2]!.outerInset).toBeGreaterThan(layouts[1]!.outerInset);
    expect(layouts[1]!.outerInset).toBeGreaterThan(layouts[0]!.outerInset);

    const again = computeDomainNavMenuLayout(tokens, 1440, 900, 54);
    expect(again.overlayTop).toBe(layouts[1]!.overlayTop);
    expect(again.scrollportMaxHeight).toBe(layouts[1]!.scrollportMaxHeight);
  });
});
