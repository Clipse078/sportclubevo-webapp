/**
 * SCE-NAVBAR-UPGRADE-01-R10 — tenant-first brand hierarchy + season row + L1 state
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-NAVBAR-UPGRADE-01-R10 tenant-first navigation shell", () => {
  it("places tenant identity on Row 1 and SportClubEvo on Row 2 (desktop)", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    const primaryBlock = shell.match(/variant="primary"[\s\S]*?utilities=\{/)?.[0];
    expect(primaryBlock).toBeTruthy();
    expect(primaryBlock).toContain("tenantContextRail");
    expect(primaryBlock).not.toContain("ScePlatformBrandRail");
    expect(shell).toMatch(
      /SceTenantContextRow[\s\S]*ScePlatformBrandRail[\s\S]*sce-global-platform-brand-rail--row2/,
    );
  });

  it("moves season from Row 1 utilities to Row 2 right context", () => {
    const utilities = readRelative("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).not.toContain("SceGlobalSeasonSwitcher");

    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceRow2SeasonContext");
    expect(shell).toMatch(/SceTenantContextRow[\s\S]*utilities=\{/);

    const row2Season = readRelative("components/sce/navigation/SceRow2SeasonContext.tsx");
    expect(row2Season).toContain('data-testid="sce-row2-season-context"');
    expect(row2Season).toContain('displayMode="wide"');
  });

  it("anchors domain panel below the complete two-row shell", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain('data-sce-nav-spine-row="module"');
    expect(panel).toMatch(/moduleRow[\s\S]*shellBottom/);
  });

  it("maps Vereinsprogramm to a canonical planning icon", () => {
    expect(getNavDestinationSceIconName("vereinsprogramm")).toBe("calendar");
    expect(getNavDestinationSceIconName("wochenplanner")).toBe("week-planner");
  });

  it("documents tenant-first hierarchy and single strong L1 selection in design system", () => {
    const design = readRelative("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(design).toContain("One strong L1 selection maximum");
    expect(design).toContain("Route-active and panel-open are separate states");
    expect(design).toContain("Row 2 — Platform + season");
    expect(design).toContain("Navigation identity rails **never** determine page content alignment");
  });

  it("uses localized season label prefix via AppShell.seasonLabel", () => {
    const de = JSON.parse(readRelative("messages/de.json")) as {
      AppShell: { seasonLabel: string };
    };
    expect(de.AppShell.seasonLabel).toBe("Saison");
  });
});
