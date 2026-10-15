/**
 * SCE-NAVBAR-UPGRADE-01-R5 — canonical application grid (one workspace left edge)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_APP_SHELL_PAGE_GRID_CLASS,
  SCE_APP_SHELL_RAIL_SPACER_CLASS,
  SCE_APP_SHELL_WORKSPACE_CLASS,
  SCE_SHELL_RAIL_WIDTH_VAR,
  SCE_SHELL_WORKSPACE_GUTTER_VAR,
  SCE_SHELL_WORKSPACE_START_VAR,
} from "@/lib/shell/sce-application-grid";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-NAVBAR-UPGRADE-01-R5 application grid", () => {
  it("defines one canonical desktop rail + workspace token contract", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain(SCE_SHELL_RAIL_WIDTH_VAR);
    expect(css).toContain(SCE_SHELL_WORKSPACE_GUTTER_VAR);
    expect(css).toContain(SCE_SHELL_WORKSPACE_START_VAR);
    expect(css).toContain("--sce-shell-outer-inline-padding");
    expect(css).toMatch(
      new RegExp(`${SCE_SHELL_RAIL_WIDTH_VAR}:\\s*var\\(--sce-nav-brand-rail-width\\)`),
    );
    expect(css).toMatch(
      new RegExp(`${SCE_SHELL_WORKSPACE_START_VAR}:[\\s\\S]*var\\(--sce-shell-rail-width\\)`),
    );
  });

  it("wires authenticated layout through the shared page grid primitive", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout).toContain("SceApplicationPageGrid");
    expect(readRelative("components/sce/shell/SceApplicationPageGrid.tsx")).toContain(
      "data-sce-app-shell-workspace",
    );
    expect(layout).not.toMatch(/main className="[^"]*px-/);
  });

  it("aligns L1, L2, and L3 spine rows to the same outer workspace padding", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\.sce-nav-spine-row--primary[\s\S]*padding:\s*0 var\(--sce-shell-outer-inline-padding\)/,
    );
    expect(css).toMatch(
      /\.sce-nav-spine-row--sub[\s\S]*padding:\s*0 var\(--sce-shell-outer-inline-padding\)/,
    );
  });

  it("consumes workspace grid for page shell and planner reference surface", () => {
    const pageShell = readRelative("components/ui/page/PageShell.tsx");
    expect(pageShell).toContain("data-sce-page-shell");
    expect(pageShell).not.toContain("max-w-screen-xl");
    expect(pageShell).not.toContain("mx-auto");

    const planner = readRelative("app/(admin)/dashboard/planner/week/page.tsx");
    expect(planner).toContain("PlannerWeekStreamingRoot");
    expect(planner).not.toMatch(/margin-left:\s*240px/);
  });

  it("supports full-bleed backgrounds with workspace-aligned inner content", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain(".sce-app-shell-full-bleed-surface");
    expect(css).toContain(".sce-app-shell-full-bleed-inner");
  });

  it("does not preserve desktop empty rail on mobile", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.sce-app-shell-rail-spacer[\s\S]*display:\s*none/,
    );
  });

  it("does not introduce a parallel layout framework", () => {
    const grid = readRelative("components/sce/shell/SceApplicationPageGrid.tsx");
    expect(grid).toContain(SCE_APP_SHELL_PAGE_GRID_CLASS);
    expect(grid).toContain(SCE_APP_SHELL_RAIL_SPACER_CLASS);
    expect(grid).toContain(SCE_APP_SHELL_WORKSPACE_CLASS);
    expect(grid).not.toContain("Sidebar");
  });
});
