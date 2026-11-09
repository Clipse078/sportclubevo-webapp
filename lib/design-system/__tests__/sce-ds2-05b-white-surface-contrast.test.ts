/**
 * SCE-DS2-05B — white functional surfaces + contrast hardening
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_05B_COVERAGE_ROUTES,
  SCE_DS2_05B_DOC_MARKERS,
  SCE_DS2_05B_FUNCTIONAL_SURFACE_SELECTORS,
  SCE_DS2_05B_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-05b-meta";
import {
  SCE_FUNCTIONAL_INNER_ROW_CLASS,
  SCE_FUNCTIONAL_MUTED_BADGE_CLASS,
  SCE_FUNCTIONAL_PANEL_CLASS,
  SCE_FUNCTIONAL_SECONDARY_CHIP_CLASS,
} from "@/lib/design-system/sce-functional-surface-styles";
import {
  SCE_WHITE_EDITION_CONTRAST_PAIRS,
  sceWhiteEditionContrastMatrixPass,
} from "@/lib/design-system/sce-white-edition-contrast";
import {
  isSceWhiteEditionEnabled,
  sceWhiteEditionThemeDataAttributes,
} from "@/lib/design-system/sce-white-edition-flag";
import { dashboardCockpitSurfaceClassName } from "@/lib/dashboard/dashboard-cockpit-surface";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B white surface & contrast hardening", () => {
  it("documents the package and delivery note", () => {
    expect(readRepo("docs/design-system-v2/17-ds2-05b-white-surface-contrast-delivery.md")).toContain(
      SCE_DS2_05B_PACKAGE_KEY,
    );
    const sources = [
      readRepo("app/globals.css"),
      readRepo("app/(admin)/global-app-navigation.css"),
      readRepo("lib/design-system/sce-functional-surface-styles.ts"),
      readRepo("lib/dashboard/dashboard-cockpit-surface.ts"),
    ].join("\n");
    for (const marker of SCE_DS2_05B_DOC_MARKERS) {
      if (marker.startsWith("docs/")) continue;
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05B_FUNCTIONAL_SURFACE_SELECTORS.length).toBeGreaterThanOrEqual(5);
    expect(SCE_DS2_05B_COVERAGE_ROUTES).toEqual(
      expect.arrayContaining(["dashboard", "Wochenplaner", "Matchcenter"]),
    );
  });

  it("replaces dark dashboard glass with theme-scoped cockpit card surfaces", () => {
    expect(dashboardCockpitSurfaceClassName).toContain("sce-dashboard-cockpit-card");
    const globals = readRepo("app/globals.css");
    expect(globals).toMatch(/\.sce-dashboard-cockpit-card[\s\S]*backdrop-filter:\s*blur/);
    expect(globals).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-dashboard-cockpit-card[\s\S]*backdrop-filter:\s*none/,
    );
    expect(globals).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-dashboard-cockpit-card[\s\S]*var\(--sce-color-surface-standard\)/,
    );
    const surfaceTs = readRepo("lib/dashboard/dashboard-cockpit-surface.ts");
    expect(surfaceTs).not.toContain("rgba(15,23,42");
    expect(surfaceTs).toContain("backdrop-blur");
  });

  it("white-first functional inner rows and chips use semantic surface tokens", () => {
    expect(SCE_FUNCTIONAL_PANEL_CLASS).toContain("var(--sce-color-surface-standard)");
    expect(SCE_FUNCTIONAL_INNER_ROW_CLASS).toContain("sce-functional-inner-row");
    expect(SCE_FUNCTIONAL_INNER_ROW_CLASS).toContain("bg-[var(--surface)]");
    expect(SCE_FUNCTIONAL_SECONDARY_CHIP_CLASS).toContain("text-[var(--text-2)]");
    expect(SCE_FUNCTIONAL_MUTED_BADGE_CLASS).toContain("text-[var(--text-2)]");
  });

  it("hardens form, table, and dialog surfaces under the white theme hook", () => {
    const globals = readRepo("app/globals.css");
    expect(globals).toMatch(
      /\[data-sce-theme="white"\]\s*\.fca-input[\s\S]*var\(--sce-color-surface-standard\)/,
    );
    expect(globals).toMatch(
      /\[data-sce-theme="white"\]\s*\.fca-input::placeholder[\s\S]*var\(--sce-color-text-muted\)/,
    );
    expect(globals).toMatch(
      /\[data-sce-theme="white"\]\s*\[data-sce-data-table-shell="true"\]/,
    );
    expect(globals).toMatch(/\[data-sce-theme="white"\]\s*\.sce-integrated-list/);
    expect(globals).toMatch(/\[data-sce-theme="white"\]\s*\.fca-card::before[\s\S]*opacity:\s*0/);
  });

  it("extends documented contrast pairs and keeps the matrix passing", () => {
    const ids = SCE_WHITE_EDITION_CONTRAST_PAIRS.map((p) => p.id);
    expect(ids).toContain("placeholder-on-input");
    expect(ids).toContain("violet-accent-on-canvas");
    const result = sceWhiteEditionContrastMatrixPass();
    expect(result.pass, JSON.stringify(result.failures)).toBe(true);
  });

  it("exposes theme-aware SportClubEvo platform wordmarks in global navigation CSS", () => {
    const navCss = readRepo("app/(admin)/global-app-navigation.css");
    expect(navCss).toContain("sce-platform-wordmark--on-light-surface");
    expect(navCss).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-platform-wordmark--on-dark-surface[\s\S]*display:\s*none/,
    );
  });

  it("preserves white edition flag off by default and theme attribute gating", () => {
    expect(
      isSceWhiteEditionEnabled({ SCE_WHITE_EDITION: undefined } as NodeJS.ProcessEnv),
    ).toBe(false);
    const prev = process.env.SCE_WHITE_EDITION;
    delete process.env.SCE_WHITE_EDITION;
    expect(sceWhiteEditionThemeDataAttributes()).toBeUndefined();
    if (prev === undefined) {
      delete process.env.SCE_WHITE_EDITION;
    } else {
      process.env.SCE_WHITE_EDITION = prev;
    }
  });

  it("covers representative route modules with automated source guards", () => {
    const matchcenter = readRepo("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    expect(matchcenter).toContain("SpieleManagement");
    const planning = readRepo("components/admin/planning-hub/PlanningHubCalendarView.tsx");
    expect(planning).toContain("text-[var(--muted)]");
    const dashboardCard = readRepo("components/ui/dashboard/DashboardCockpitCard.tsx");
    expect(dashboardCard).toContain("#4f46e5");
    const clubEvent = readRepo("components/sporting-activity/SceClubEventCard.tsx");
    expect(clubEvent).toContain("sce-activity-card");
  });
});
