/**
 * SCE-DS2-05B-R8 — L1, L2, and L3 share one text-only active-state contract.
 * Active = semantic orange label. No underline, side bar, or selection fill.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const NAV_CSS = "app/(admin)/global-app-navigation.css";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function declarationBlocks(css: string, selector: string): string[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: string[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((part) => part.trim().replace(/\s+/g, " "));
    if (selectors.includes(selector)) blocks.push(match[2]);
  }
  return blocks;
}

function expectTextOnlyActive(css: string, selector: string) {
  const blocks = declarationBlocks(css, selector);
  expect(blocks.length, selector).toBeGreaterThan(0);
  for (const block of blocks) {
    expect(block, selector).toMatch(/color:\s*var\(--sce-primary\)/);
    expect(block, selector).toMatch(/background:\s*transparent/);
    expect(block, selector).toMatch(/box-shadow:\s*none/);
    expect(block, selector).not.toMatch(/inset/);
    expect(block, selector).not.toMatch(/padding-left/);
    expect(block, selector).not.toMatch(/border(?:-left|-bottom|-inline-start)?\s*:/);
    expect(block, selector).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(block, selector).not.toMatch(/allschwil|verein/i);
  }
}

const L1_ACTIVE = ".sce-global-primary-nav-item--active";
const L2_ACTIVE = [
  ".sce-domain-nav-panel-l2-link--active",
  ".sce-domain-nav-panel-l2-control--active",
  ".sce-domain-nav-panel-l2-control--selected:not(.sce-domain-nav-panel-l2-control--active)",
  ".sce-domain-nav-panel[data-sce-theme=\"white\"] .sce-domain-nav-panel-l2-link--active",
  ".sce-domain-nav-panel[data-sce-theme=\"white\"] .sce-domain-nav-panel-l2-control--active",
  ".sce-domain-nav-panel[data-sce-theme=\"white\"] .sce-domain-nav-panel-l2-control--selected:not(.sce-domain-nav-panel-l2-control--active)",
];
const L3_ACTIVE = [
  ".sce-context-nav-panel-link--active",
  ".sce-domain-nav-panel-l3-link--active",
  ".sce-domain-nav-panel[data-sce-theme=\"white\"] .sce-domain-nav-panel-l3-link--active",
];

describe("SCE-DS2-05B-R8 unified navigation active states", () => {
  it("uses the same orange-text-only contract for L1, L2, and L3", () => {
    const css = readRepo(NAV_CSS);
    for (const selector of [L1_ACTIVE, ...L2_ACTIVE, ...L3_ACTIVE]) {
      expectTextOnlyActive(css, selector);
    }
    expect(css).not.toContain("box-shadow: inset 0 -2px 0 var(--sce-primary)");
    expect(css).not.toContain("inset 3px 0 0");
    expect(css).not.toContain("inset 2px 0 0 var(--sce-primary)");
    expect(css).not.toMatch(/background:[^;]*var\(--sce-primary\)/);
  });

  it("keeps L1 Barlow Condensed uppercase typography and active weight", () => {
    const css = readRepo(NAV_CSS);
    const base = declarationBlocks(css, ".sce-global-primary-nav-item").join("\n");
    expect(base).toMatch(/font-family:\s*var\(--font-display\),\s*"Barlow Condensed"/);
    expect(base).toMatch(/text-transform:\s*uppercase/);
    expect(base).toMatch(/font-weight:\s*700/);
    const active = declarationBlocks(css, L1_ACTIVE).join("\n");
    expect(active).toMatch(/font-weight:\s*800/);
    expect(active).not.toMatch(/text-transform:\s*none/);
  });

  it("keeps L2 row separators and alignment after removing selection bars", () => {
    const css = readRepo(NAV_CSS);
    const rows = declarationBlocks(css, ".sce-domain-nav-panel-l2-link").join("\n");
    expect(rows).toMatch(/border-bottom:\s*1px solid/);
    expect(rows).toMatch(/padding:\s*0\.3125rem 0/);
    expect(rows).toMatch(/text-transform:\s*uppercase/);
    expect(css).not.toContain(".sce-global-nav-level-separator");
    expect(css).not.toContain(".sce-global-module-nav");
    expect(css).not.toContain(".sce-global-context-nav");
    for (const selector of L2_ACTIVE) {
      expect(declarationBlocks(css, selector).join("\n")).not.toMatch(/padding-left/);
    }
  });

  it("keeps hover and keyboard focus without orange selection borders", () => {
    const css = readRepo(NAV_CSS);
    const focusSelectors = [
      ".sce-global-primary-nav-item:focus-visible",
      ".sce-domain-nav-panel-l2-link:focus-visible",
      ".sce-domain-nav-panel-l3-link:focus-visible",
      ".sce-context-nav-panel-link:focus-visible",
    ];
    for (const selector of focusSelectors) {
      const block = declarationBlocks(css, selector).join("\n");
      expect(block, selector).toMatch(/outline:\s*2px solid/);
      expect(block, selector).not.toMatch(/inset/);
    }

    const hoverSelectors = [
      ".sce-global-primary-nav-item:hover",
      ".sce-global-primary-nav-item--active:hover",
      ".sce-domain-nav-panel-l2-link:hover",
      ".sce-domain-nav-panel-l3-link--active:hover",
      ".sce-domain-nav-panel[data-sce-theme=\"white\"] .sce-domain-nav-panel-l2-link:hover",
      ".sce-domain-nav-panel[data-sce-theme=\"white\"] .sce-domain-nav-panel-l3-link--active:hover",
    ];
    for (const selector of hoverSelectors) {
      const block = declarationBlocks(css, selector).join("\n");
      expect(block.length, selector).toBeGreaterThan(0);
      expect(block, selector).not.toMatch(/inset/);
      expect(block, selector).not.toMatch(/border/);
    }
  });

  it("applies the contract through shared navigation primitives, not a single domain", () => {
    const item = readRepo("components/sce/navigation/SceNavigationItem.tsx");
    expect(item).toContain("sce-global-primary-nav-item--active");
    expect(item).not.toContain("sce-global-module-nav");
    expect(item).not.toContain("sce-global-context-nav");

    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain("sce-domain-nav-panel-l2-control--active");
    expect(panel).toContain("sce-domain-nav-panel-l2-link--active");
    expect(panel).toContain("sce-domain-nav-panel-l3-link--active");
    expect(panel).not.toMatch(/domain\.id\s*===?\s*["']club["']/);
    expect(panel).toContain("createPortal");
  });

  it("leaves the R7 portalled overlay geometry untouched", () => {
    const css = readRepo(NAV_CSS);
    expect(css).toMatch(/\.sce-domain-nav-panel[\s\S]*position:\s*fixed/);
    expect(css).toContain("--sce-domain-nav-overlay-max-height");
    expect(css).toContain("sce-domain-nav-overlay-anchor");
    expect(readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx")).toContain(
      "SCE-DS2-05B-R7",
    );
    expect(readRepo("lib/nav/sce-domain-nav-overlay-geometry.ts")).toContain(
      "resolveDomainNavOverlayAnchorBottom",
    );
  });
});
