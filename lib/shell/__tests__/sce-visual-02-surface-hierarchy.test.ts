import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_PLANNER_DENSE_SURFACE_SOURCES,
  SCE_SURFACE_TOKEN_DENSE,
  SCE_SURFACE_TOKEN_ELEVATED,
  SCE_SURFACE_TOKEN_STANDARD,
  SCE_SURFACE_TOKEN_SUBTLE,
} from "@/lib/shell/sce-surface-system";
import { SCE_AUTHENTICATED_APP_BACKGROUND_PATH } from "@/lib/shell/sce-app-background";
import { SCE_AUTHENTICATED_APP_SHELL_CLASS } from "@/lib/shell/sce-app-background";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-VISUAL-02 authenticated surface hierarchy", () => {
  it("defines canonical semantic surface tokens in globals.css", () => {
    const css = readRelative("app/globals.css");
    for (const token of [
      SCE_SURFACE_TOKEN_SUBTLE,
      SCE_SURFACE_TOKEN_STANDARD,
      SCE_SURFACE_TOKEN_DENSE,
      SCE_SURFACE_TOKEN_ELEVATED,
      "--sce-surface-border-subtle",
      "--sce-surface-border",
      "--sce-surface-border-elevated",
      "--sce-surface-shadow",
      "--sce-surface-shadow-elevated",
      "--sce-surface-blur-subtle",
      "--sce-surface-blur",
    ]) {
      expect(css, token).toContain(`${token}:`);
    }
    expect(css).toContain(".sce-surface-dense");
    expect(css).toContain(".sce-surface-elevated");
  });

  it("keeps SCE background owned by authenticated shell only", () => {
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    expect(shellCss).toContain(`background-image: var(--sce-app-background-image)`);
    expect(shellCss).not.toMatch(/SCE_background\.png/);

    const adminLayout = readRelative("app/(admin)/layout.tsx");
    expect(adminLayout).toContain("SCE_AUTHENTICATED_APP_SHELL_CLASS");
    expect(adminLayout).toContain("${SCE_AUTHENTICATED_APP_SHELL_CLASS}");
    expect(adminLayout).not.toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);
  });

  it("planner calendar and resource matrices consume dense operational surface", () => {
    for (const file of SCE_PLANNER_DENSE_SURFACE_SOURCES) {
      const src = readRelative(file);
      expect(src, file).toContain("var(--sce-surface-dense)");
    }
  });

  it("modal/dialog system uses elevated surface and preserves canonical blur overlay", () => {
    const responsive = readRelative("lib/shell/responsive-layout.ts");
    expect(responsive).toContain("var(--sce-surface-elevated)");

    const overlay = readRelative("components/ui/SceModalOverlay.tsx");
    expect(overlay).toContain("sce-modal-overlay-backdrop");

    const css = readRelative("app/globals.css");
    expect(css).toContain("backdrop-filter: blur(10px)");
    expect(css).toContain("--sce-modal-backdrop");
  });

  it("preserves SCE orange primary action token", () => {
    const css = readRelative("app/globals.css");
    expect(css).toContain("--sce-primary:");
    expect(css).toMatch(/--sce-primary:\s*var\(--orange\)/);
    expect(css).toContain("--orange:");
    expect(css).toContain("#d4843a");
  });

  it("does not assign full-screen background images on authenticated route pages", () => {
    const routes = [
      "app/(admin)/dashboard/planner/week/page.tsx",
      "app/(admin)/dashboard/training/page.tsx",
      "app/(admin)/dashboard/matchcenter/page.tsx",
    ];
    for (const route of routes) {
      const src = readRelative(route);
      expect(src).not.toContain("background-image:");
      expect(src).not.toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);
    }
  });

  it("excludes public website, infoboard, and auth from authenticated shell class", () => {
    const rootLayout = readRelative("app/layout.tsx");
    expect(rootLayout).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);

    const infoboardLayout = readRelative("app/infoboard/layout.tsx");
    expect(infoboardLayout).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);

    const loginPage = readRelative("app/(auth)/login/page.tsx");
    expect(loginPage).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);
  });

  it("management KPI strips avoid decorative per-card gradient surface fills", () => {
    const kpiSources = [
      "components/admin/planning/PlanningManagementKpiCards.tsx",
      "components/admin/matchcenter/SpieleManagementKpiCards.tsx",
      "components/admin/tournamentcenter/TurniereManagementKpiCards.tsx",
    ];
    for (const file of kpiSources) {
      const src = readRelative(file);
      expect(src, file).toContain("SCE_KPI_CARD_SURFACE");
      expect(src, file).not.toMatch(/bg-sky-950/);
      expect(src, file).not.toMatch(/linear-gradient\(/);
    }
  });
});
