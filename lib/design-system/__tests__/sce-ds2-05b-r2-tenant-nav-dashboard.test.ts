/**
 * SCE-DS2-05B-R2 — tenant-first branding, premium L1 nav, dashboard programme, activity pills.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_05B_R2_DOC_MARKERS,
  SCE_DS2_05B_R2_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-05b-r2-meta";
import { SCE_DS2_HEADER_NAV_TYPOGRAPHY } from "@/lib/design-system/sce-navigation-typography-contract";
import { sportingActivityTypePillClassName } from "@/lib/sporting-activity-presentation/activity-type-pill";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R2 delivery", () => {
  it("documents the package markers in navigation, dashboard, and token sources", () => {
    const sources = [
      readRepo("components/admin/layout/AppShellNavigation.tsx"),
      readRepo("components/admin/layout/GlobalNavDrawer.tsx"),
      readRepo("components/ui/dashboard/PersonalDashboardWorkspace.tsx"),
      readRepo("app/globals.css"),
      readRepo("app/(admin)/global-app-navigation.css"),
    ].join("\n");
    for (const marker of SCE_DS2_05B_R2_DOC_MARKERS) {
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05B_R2_PACKAGE_KEY).toBe("SCE-DS2-05B-R2");
  });

  it("keeps tenant crest on Row 1 and does not mount a persistent Row 2 rail", () => {
    const shell = readRepo("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceTenantContextRail");
    expect(shell).not.toContain("SceTenantContextRow");
    expect(shell).not.toContain("SceHierarchicalDesktopNavigation");
    expect(shell).not.toContain("sce-global-platform-brand-rail--row2");
  });

  it("relocates platform attribution to the global navigation drawer footer", () => {
    const drawer = readRepo("components/admin/layout/GlobalNavDrawer.tsx");
    expect(drawer).toContain("global-nav-drawer-platform-footer");
    expect(drawer).toContain("PoweredByBadge");
    const poweredBy = readRepo("components/admin/branding/PoweredByBadge.tsx");
    expect(poweredBy).toContain("sce-platform-wordmark--on-light-surface");
    expect(poweredBy).toContain("sce-platform-wordmark--on-dark-surface");
  });

  it("removes mobile secondary platform wordmark under tenant-first club stack", () => {
    const bar = readRepo("components/sce/navigation/SceTenantIdentityBar.tsx");
    expect(bar).not.toContain("sce-global-platform-brand-rail--mobile-secondary");
  });

  it("uses premium L1 navigation typography without decorative icons", () => {
    const navCss = readRepo("app/(admin)/global-app-navigation.css");
    expect(navCss).toMatch(/\.sce-global-primary-nav-item[\s\S]*font-size:\s*1\.0625rem/);
    expect(SCE_DS2_HEADER_NAV_TYPOGRAPHY.decorativeNavIcons).toBe(false);
    expect(SCE_DS2_HEADER_NAV_TYPOGRAPHY.labelTransform).toBe("uppercase");
  });

  it("removes dashboard Mein Kalender widget and spans Mein Programm full width", () => {
    const workspace = readRepo("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).not.toContain("PersonalProgrammeMonthCalendar");
    expect(workspace).toContain("md:col-span-2");
    expect(workspace).toContain('data-testid="personal-programme-open-calendar"');
    expect(workspace).toContain("buildMeinProgrammKalenderOpenHref");
    expect(workspace).not.toContain("personal-programme-view-all");
    expect(workspace).not.toContain("personal-calendar-open");
  });

  it("uses spacious horizontal canonical programme rows on the dashboard preview", () => {
    const previewRow = readRepo("components/ui/dashboard/PersonalProgrammePreviewRow.tsx");
    expect(previewRow).toContain('density="STANDARD"');
  });

  it("maps activity-type pills to semantic pastel tokens with bordered pills", () => {
    const globals = readRepo("app/globals.css");
    expect(globals).toContain("--sce-activity-pill-training-bg: #e8f2ff");
    expect(globals).toContain("--sce-activity-pill-match-text: #a72d27");
    const training = sportingActivityTypePillClassName("training-blue");
    expect(training).toContain("rounded-full");
    expect(training).toContain("--sce-activity-pill-training-border");
    expect(training).toContain("--sce-activity-pill-training-text");
  });
});
