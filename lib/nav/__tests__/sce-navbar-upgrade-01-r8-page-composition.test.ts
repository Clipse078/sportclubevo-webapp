/**
 * SCE-NAVBAR-UPGRADE-01-R8 — page grid decoupling, stable two-row shell, season labels
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatCompactSeasonLabel,
  formatSeasonLabelForDisplay,
  formatWideSeasonLabel,
} from "@/components/sce/navigation/SceGlobalSeasonSwitcher";
import {
  SCE_NAV_IDENTITY_WIDTH_VAR,
  SCE_SHELL_WORKSPACE_START_VAR,
} from "@/lib/shell/sce-application-grid";
import {
  SCE_PAGE_GUTTER_VAR,
  SCE_PAGE_LAYOUT_RULE,
  SCE_PAGE_GRID_RULE,
} from "@/lib/shell/sce-page-layout";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-NAVBAR-UPGRADE-01-R8 page composition and shell polish", () => {
  it("decouples page grid from navigation identity rail", () => {
    const grid = readRelative("components/sce/shell/SceApplicationPageGrid.tsx");
    expect(grid).not.toContain("SCE_APP_SHELL_RAIL_SPACER_CLASS");
    expect(grid).not.toContain("data-sce-app-shell-rail-spacer");

    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain(SCE_PAGE_GUTTER_VAR);
    expect(css).toMatch(
      /\.sce-app-shell-page-grid[\s\S]*padding-inline:\s*var\(--sce-page-gutter\)/,
    );
    expect(css).not.toMatch(
      /\.sce-app-shell-page-grid[\s\S]*grid-template-columns:\s*var\(--sce-shell-rail-width\)/,
    );
  });

  it("documents canonical page vs navigation alignment rules", () => {
    const layout = readRelative("lib/shell/sce-page-layout.ts");
    expect(layout).toContain(SCE_PAGE_LAYOUT_RULE);
    expect(layout).toContain(SCE_PAGE_GRID_RULE);

    const design = readRelative("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(design).toContain("Page shell vs navigation grid");
    expect(design).toContain("never dictate the left edge");
  });

  it("keeps navigation workspace start separate from page gutters", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain(SCE_SHELL_WORKSPACE_START_VAR);
    expect(css).toContain(SCE_NAV_IDENTITY_WIDTH_VAR);
    expect(css).not.toMatch(
      /\[data-sce-page-shell\][\s\S]*var\(--sce-shell-workspace-start\)/,
    );
  });

  it("always renders desktop Row 2 including dashboard with empty contextual workspace", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceTenantContextRow");
    expect(shell).not.toContain("SceModuleNavigation");
    expect(shell).toMatch(/SceTenantContextRow[\s\S]*ScePlatformBrandRail/);

    const row = readRelative("components/sce/navigation/SceTenantContextRow.tsx");
    expect(row).toContain("sce-row2-context-workspace-empty");
  });

  it("uses deterministic season label variants without truncate ellipsis", () => {
    expect(formatWideSeasonLabel("2026/2027")).toBe("Season 2026/2027");
    expect(formatCompactSeasonLabel("Season 2026/2027")).toBe("2026/27");
    expect(formatSeasonLabelForDisplay("Season 2026/2027", "wide")).toBe("Season 2026/2027");
    expect(formatSeasonLabelForDisplay("Season 2026/2027", "medium")).toBe("2026/27");

    const switcher = readRelative("components/sce/navigation/SceGlobalSeasonSwitcher.tsx");
    expect(switcher).not.toContain("truncate");
    expect(switcher).toContain("displayMode");
    expect(switcher).toContain("sce-global-season-switcher--icon-only");

    const row2Season = readRelative("components/sce/navigation/SceRow2SeasonContext.tsx");
    expect(row2Season).toContain('displayMode="wide"');
    expect(row2Season).toContain('displayMode="medium"');
    expect(row2Season).toContain('displayMode="icon"');
  });

  it("structures Wochenplaner chrome with hierarchical toolbars on page grid", () => {
    const chrome = readRelative("components/admin/planner/WeekPlannerChrome.tsx");
    expect(chrome).toContain("weekplanner-primary-planning-bar");
    expect(chrome).toContain("weekplanner-conflict-context");
    expect(chrome).toContain("planning-hub-toolbar");

    const bridge = readRelative("components/admin/planner/PlannerWeekChromeBridge.tsx");
    expect(bridge).toContain('data-sce-page-width="operational"');
  });

  it("preserves dashboard readable width mode on page grid not nav rail", () => {
    const dashboard = readRelative("components/admin/dashboard/ClubDashboardView.tsx");
    expect(dashboard).toContain('data-sce-page-width="dashboard"');
    expect(dashboard).not.toContain("max-w-[1400px]");
  });
});
