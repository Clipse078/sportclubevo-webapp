/**
 * SCE-NAVBAR-UPGRADE-01-R11 — icon consistency, desktop hamburger removal, full season
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_DESTINATION_SCE_ICON_BY_KEY } from "@/lib/nav/nav-destination-sce-icons";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const PLANNING_L2_KEYS = [
  "wochenplanner",
  "vereinsprogramm",
  "trainingcenter",
  "matchcenter",
  "tournamentcenter",
  "veranstaltungen",
] as const;

describe("SCE-NAVBAR-UPGRADE-01-R11 navbar polish", () => {
  it("uses monochrome calendar artwork for Vereinsprogramm navigation icon", () => {
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY.vereinsprogramm).toBe("calendar");
    const planningGlyphs = readRelative(
      "components/design-system/icons/glyphs/planning/index.tsx",
    );
    const calendarBlock =
      planningGlyphs.match(/export function CalendarGlyph[\s\S]*?^}/m)?.[0] ?? "";
    expect(calendarBlock).toContain("monochrome");
    expect(calendarBlock).toContain("currentColor");
    expect(calendarBlock).not.toContain("--sce-icon-accent");
    expect(calendarBlock).not.toContain('role="accent"');
  });

  it("maps all Planning L2 destinations to approved SCE registry icons", () => {
    for (const key of PLANNING_L2_KEYS) {
      expect(NAV_DESTINATION_SCE_ICON_BY_KEY[key]).toBeTruthy();
    }
  });

  it("removes desktop global explorer hamburger from Row 1 utilities", () => {
    const utilities = readRelative("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).not.toContain("global-nav-hamburger");
    expect(utilities).not.toContain("showGlobalNavExplorer");
    expect(utilities).not.toContain("GlobalNavDrawer");
    expect(utilities).toContain("NotificationBell");
    expect(utilities).toContain("AccountMenu");

    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).not.toContain("showGlobalNavExplorer");
  });

  it("preserves mobile global navigation drawer entry via bottom nav menu", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("GlobalNavDrawer");
    expect(shell).toContain('data-testid="global-nav-mobile-menu"');
    expect(shell).toContain("SCE_MOBILE_BOTTOM_NAV_CLASS");
  });

  it("defaults Row 2 season to full label on desktop breakpoints", () => {
    const row2Season = readRelative("components/sce/navigation/SceRow2SeasonContext.tsx");
    expect(row2Season).toContain('displayMode="wide"');
    expect(row2Season).toMatch(/hidden lg:flex[\s\S]*displayMode="wide"/);
    expect(row2Season).not.toContain('displayMode="icon"');
    expect(row2Season).not.toMatch(/min-\[1280px\]/);
    expect(row2Season).not.toMatch(/min-\[1536px\]/);

    const switcher = readRelative("components/sce/navigation/SceGlobalSeasonSwitcher.tsx");
    expect(switcher).toContain('useTranslations("AppShell")');
    expect(switcher).toContain("seasonWord");
  });

  it("documents R11 navigation polish rules in the design system", () => {
    const design = readRelative("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(design).toContain("Primary navigation icons");
    expect(design).toContain("state-driven monochrome foreground");
    expect(design).toContain("not a global hamburger/overflow trigger in Row 1");
    expect(design).toContain("full localized season label");
  });

  it("does not introduce binary checkbox controls", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).not.toContain('type="checkbox"');
  });
});
