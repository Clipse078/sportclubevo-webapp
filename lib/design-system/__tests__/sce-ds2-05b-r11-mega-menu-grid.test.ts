/**
 * SCE-DS2-05B-R11 — one desktop mega-menu grid for every navigation domain.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveDomainNavigationPanelUsesHierarchy,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import {
  SCE_DOMAIN_NAV_CHECK_VIEWPORTS,
  computeDomainNavMenuLayout,
  domainNavMenuContentHeight,
  domainNavStretchedL2Width,
  measureDomainNavMenuColumns,
  parseDomainNavMenuTokens,
} from "@/lib/nav/sce-domain-nav-menu-layout";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const NAV_CSS = "app/(admin)/global-app-navigation.css";
const PANEL = "components/sce/navigation/SceDomainNavigationPanel.tsx";
const GRID = "minmax(0, 32fr) minmax(0, 33fr) minmax(0, 35fr)";

const DIRECT_L2_DOMAINS = ["planning", "admin"] as const;
const HIERARCHICAL_DOMAINS = ["club", "publishing", "communication"] as const;

function readRepo(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-DS2-05B-R11 mega-menu grid contract", () => {
  it("uses one three-column frame and keeps L2 inside column 2", () => {
    const css = readRepo(NAV_CSS);
    const panel = readRepo(PANEL);

    expect(css).toContain(GRID);
    expect(css).not.toContain("68fr");
    expect(css).not.toContain("sce-domain-nav-panel-cham-frame--two-column");
    expect(css).toMatch(
      /\.sce-domain-nav-panel-cham-frame\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*32fr\)\s*minmax\(0,\s*33fr\)\s*minmax\(0,\s*35fr\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel--three-column \.sce-domain-nav-panel-cham-frame\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*32fr\)\s*minmax\(0,\s*33fr\)\s*minmax\(0,\s*35fr\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-section-title\s*\{[^}]*grid-column:\s*1;/);
    expect(css).toMatch(/\.sce-domain-nav-panel-l2\s*\{[^}]*grid-column:\s*2;/);
    expect(css).toMatch(/\.sce-domain-nav-panel-l3\s*\{[^}]*grid-column:\s*3;/);
    expect(css).not.toMatch(/sce-domain-nav-panel-l2[\s\S]{0,180}grid-column:\s*2\s*\//);
    expect(css).not.toMatch(/sce-domain-nav-panel-l2[\s\S]{0,180}span\s+2/);
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link,\s*\.sce-domain-nav-panel-l2-control,\s*\.sce-domain-nav-panel-l3-link\s*\{[^}]*min-height:\s*var\(--sce-domain-nav-row-min-height\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-cham-body[\s\S]*max-height:\s*var\(--sce-domain-nav-overlay-max-height\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-cham-body[\s\S]*overflow-x:\s*hidden/);
    expect(css).not.toMatch(
      /\.sce-domain-nav-panel-cham-frame\s*\{[^}]*\bheight:\s*(?!auto)/,
    );

    expect(panel).toContain('data-sce-domain-nav-grid="title-l2-l3"');
    expect(panel).toContain('"sce-domain-nav-panel--three-column"');
    expect(panel).not.toContain("sce-domain-nav-panel-cham-frame--two-column");
    expect(panel).not.toContain("ResizeObserver");
    expect(panel).not.toContain("offsetHeight");
    expect(panel).toContain('data-sce-domain-nav-l3={showRightColumn ? "populated" : "empty"}');
    expect(panel).not.toContain("sce-domain-nav-panel-l3-empty");
  });

  it("classifies Planung and Admin as direct L2 and keeps L3 on the hierarchical domains", () => {
    const model = buildAppNavigationModelForUser(Object.values(PERMISSIONS), "club");

    for (const id of DIRECT_L2_DOMAINS) {
      const domain = model.domains.find((entry) => entry.id === id)!;
      const items = resolveDomainSecondaryNavItems(domain);
      expect(items.length).toBeGreaterThan(0);
      expect(resolveDomainNavigationPanelUsesHierarchy(domain, items)).toBe(false);
    }

    for (const id of HIERARCHICAL_DOMAINS) {
      const domain = model.domains.find((entry) => entry.id === id)!;
      const items = resolveDomainSecondaryNavItems(domain);
      expect(resolveDomainNavigationPanelUsesHierarchy(domain, items)).toBe(true);
    }
  });

  it("keeps L2 inside column 2 at 1366, 1440 and 1920 without clipping or domain shift", () => {
    const css = readRepo(NAV_CSS);
    const tokens = parseDomainNavMenuTokens(css);
    const model = buildAppNavigationModelForUser(Object.values(PERMISSIONS), "club");
    const rowCounts = [...DIRECT_L2_DOMAINS, ...HIERARCHICAL_DOMAINS].map((id) => {
      const domain = model.domains.find((entry) => entry.id === id)!;
      return resolveDomainSecondaryNavItems(domain).length;
    });

    for (const viewport of SCE_DOMAIN_NAV_CHECK_VIEWPORTS) {
      const layouts = rowCounts.map(() =>
        computeDomainNavMenuLayout(tokens, viewport.width, viewport.height, 54),
      );
      const reference = layouts[0]!;
      const columns = measureDomainNavMenuColumns(reference);
      const stretched = domainNavStretchedL2Width(reference);

      expect(columns.clipsHorizontally, `${viewport.width}`).toBe(false);
      expect(columns.l2ConfinedToCategories).toBe(true);
      expect(columns.l2.width).toBeCloseTo(columns.categories.width, 4);
      expect(columns.l2.left).toBeCloseTo(
        columns.title.right + reference.columnGap,
        4,
      );
      expect(columns.l3Reserved.left).toBeCloseTo(
        columns.l2.right + reference.columnGap,
        4,
      );
      expect(columns.l2.width).toBeLessThan(stretched - 32);
      expect(columns.l2.width).toBeGreaterThan(160);
      expect(columns.destinations.right).toBeLessThanOrEqual(viewport.width);
      expect(reference.horizontalOverflow).toBe(false);
      expect(reference.overlayTop).toBe(54);
      expect(reference.bottomGap).toBeGreaterThanOrEqual(12);

      for (const layout of layouts.slice(1)) {
        expect(layout).toEqual(reference);
        expect(measureDomainNavMenuColumns(layout)).toEqual(columns);
      }

      const shortest = Math.min(...rowCounts);
      const tallest = Math.max(...rowCounts);
      const shortHeight = domainNavMenuContentHeight(
        reference,
        shortest,
        tokens.rowMinHeightPx,
      );
      const tallHeight = domainNavMenuContentHeight(
        reference,
        tallest,
        tokens.rowMinHeightPx,
      );
      expect(tallHeight).toBeGreaterThan(shortHeight);
      expect(reference.scrollportMaxHeight).toBeGreaterThan(tokens.rowMinHeightPx * 2);
      expect(
        reference.overlayTop + reference.scrollportMaxHeight,
      ).toBeLessThanOrEqual(viewport.height);
    }
  });

  it("preserves orange text-only active states and keyboard focus chrome", () => {
    const css = readRepo(NAV_CSS);
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link--active,\s*\.sce-domain-nav-panel-l2-control--active,\s*\.sce-domain-nav-panel-l3-link--active\s*\{[^}]*color:\s*var\(--sce-primary\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link--active[\s\S]*background:\s*transparent/,
    );
    expect(css).not.toMatch(
      /\.sce-domain-nav-panel-l2-link--active[\s\S]{0,240}text-decoration:\s*underline/,
    );
    expect(css).not.toMatch(
      /\.sce-domain-nav-panel-l2-link--active[\s\S]{0,240}border-left/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link:focus-visible[\s\S]*outline:\s*2px solid/,
    );
    expect(css).toMatch(/@media \(max-width:\s*767px\)\s*\{[^}]*\.sce-domain-nav-panel--overlay\s*\{[^}]*display:\s*none/);
  });
});
