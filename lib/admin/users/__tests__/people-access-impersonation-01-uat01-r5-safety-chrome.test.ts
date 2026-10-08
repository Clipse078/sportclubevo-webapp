import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("PEOPLE-ACCESS-IMPERSONATION-01 UAT-PERM-01R5 — persistent safety chrome", () => {
  it("renders impersonation chrome in the sticky authenticated shell block outside scrolling main", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    const globalNavCss = readRelative("app/(admin)/global-app-navigation.css");

    expect(layout).toContain("sce-authenticated-sticky-shell-chrome");
    expect(layout.indexOf("sce-authenticated-sticky-shell-chrome")).toBeLessThan(
      layout.indexOf("sce-app-main-with-mobile-nav"),
    );
    expect(layout.indexOf("ImpersonationSafetyChrome")).toBeGreaterThan(
      layout.indexOf("AppShellNavigation"),
    );
    expect(layout.indexOf("ImpersonationSafetyChrome")).toBeLessThan(
      layout.indexOf("<main"),
    );

    expect(shellCss).toContain(".sce-authenticated-sticky-shell-chrome");
    expect(shellCss).toContain("position: sticky");
    expect(shellCss).toContain("--sce-shell-sticky-chrome-z-index");
    expect(shellCss).not.toMatch(
      /\.sce-authenticated-safety-chrome-stack[\s\S]*top:\s*var\(--topnav-height\)/,
    );

    expect(globalNavCss).not.toMatch(
      /\.sce-global-app-header[\s\S]*position:\s*sticky/,
    );
  });

  it("keeps exit action in ImpersonationBanner and does not gate stop by target permissions", () => {
    const banner = readRelative("components/admin/layout/ImpersonationBanner.tsx");
    const stop = readRelative("components/admin/layout/StopImpersonationButton.tsx");
    const stopRoute = readRelative("app/api/auth/stop-impersonation/route.ts");

    expect(banner).toContain("StopImpersonationButton");
    expect(banner).toContain("Benutzeransicht aktiv");
    expect(stop).toContain("Ansicht beenden");
    expect(stop).toContain("/api/auth/stop-impersonation");
    expect(stopRoute).toContain("stopImpersonationSession");
    expect(stopRoute).not.toContain("requirePermission");
  });

  it("preserves R4 Match canonical editor access split (view + allocation manage)", () => {
    const access = readRelative("lib/planning-hub/planner-canonical-edit-access.ts");
    const workspace = readRelative("components/admin/planner/WeekPlannerWorkspace.tsx");

    expect(access).toContain("canOpenPlannerCanonicalEditor");
    expect(access).toContain("canManageAllocations");
    expect(workspace).toContain("canOpenPlannerCanonicalEditor");
    expect(workspace).not.toMatch(/canManageEvents\s*&&\s*item\.type === "MATCH"/);
  });
});
