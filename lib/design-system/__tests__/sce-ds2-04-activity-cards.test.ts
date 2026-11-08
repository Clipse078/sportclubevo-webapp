/**
 * SCE-DS2-04 — Premium activity card contract
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_04_CARD_FAMILIES,
  SCE_DS2_04_DOC_MARKERS,
  SCE_DS2_04_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-04-meta";
import { SCE_DS2_TYPOGRAPHY_FOUNDATION } from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_ACTIVITY_CARD_SHELL_CLASS,
  SCE_ACTIVITY_CARD_SHELL_ROOT_CLASS,
  SCE_ACTIVITY_CARD_CATEGORIES,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-shell-contract";
import { SCE_MATCH_CARD_SHELL_CLASS } from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import {
  SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";

function readRepo(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-DS2-04 activity card contract", () => {
  it("documents package markers", () => {
    expect(SCE_DS2_04_PACKAGE_KEY).toBe("SCE-DS2-04");
    for (const marker of SCE_DS2_04_DOC_MARKERS) {
      if (marker.startsWith("docs/")) {
        expect(readRepo(marker)).toContain(SCE_DS2_04_PACKAGE_KEY);
      } else {
        expect(marker.length).toBeGreaterThan(2);
      }
    }
  });

  it("binds activity card shell to foundation contract", () => {
    expect(SCE_DS2_TYPOGRAPHY_FOUNDATION.activityCardShell).toContain("SCE-DS2-04");
  });

  it("unifies match shell with shared activity card surface", () => {
    expect(SCE_MATCH_CARD_SHELL_CLASS).toBe(SCE_ACTIVITY_CARD_SHELL_CLASS);
    expect(SCE_ACTIVITY_CARD_SHELL_CLASS).toContain(SCE_ACTIVITY_CARD_SHELL_ROOT_CLASS);
    expect(SCE_ACTIVITY_CARD_SHELL_CLASS).toContain("--sce-color-border-standard");
    expect(SCE_ACTIVITY_CARD_SHELL_CLASS).toContain("--sce-match-card-surface");
    expect(SCE_ACTIVITY_CARD_SHELL_CLASS).not.toContain("backdrop-blur");
  });

  it("defines semantic foreground tokens for theme-aware contrast", () => {
    expect(SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS).toContain("--sce-color-text-primary");
    expect(SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS).toContain("--sce-color-text-secondary");
    const css = readRepo("app/globals.css");
    expect(css).toContain("--sce-activity-card-team-context-foreground");
    expect(css).toContain("--sce-activity-card-location-foreground");
    expect(css).toContain(`.${SCE_ACTIVITY_CARD_SHELL_ROOT_CLASS}`);
  });

  it("maps white and dark activity card shadows", () => {
    const css = readRepo("app/globals.css");
    expect(css).toMatch(/:root[\s\S]*--sce-activity-card-shadow:/);
    expect(css).toMatch(/\[data-sce-theme="white"\][\s\S]*--sce-activity-card-shadow:/);
  });

  it.each(SCE_DS2_04_CARD_FAMILIES)("canonical card %s exposes DS2-04 markers", (component) => {
    const source = readRepo(`components/sporting-activity/${component}.tsx`);
    expect(source).toContain("data-sce-activity-card");
    expect(source).toContain("data-sce-activity-category");
    expect(source).toContain("sceActivityCardRegionClass");
  });

  it("covers all activity categories", () => {
    expect(SCE_ACTIVITY_CARD_CATEGORIES).toEqual([
      "MATCH",
      "TRAINING",
      "TOURNAMENT",
      "CLUB_EVENT",
    ]);
    const css = readRepo("app/globals.css");
    for (const category of SCE_ACTIVITY_CARD_CATEGORIES) {
      expect(css).toContain(`data-sce-activity-category="${category}"`);
    }
  });

  it("ships region primitives", () => {
    const source = readRepo("components/design-system/activity-card/SceActivityCardRegions.tsx");
    expect(source).toContain("SceActivityCardShell");
    expect(source).toContain("data-sce-activity-card-region");
  });

  it("documents FC Allschwil reference layout contract (DS2-04R1)", () => {
    const layout = readRepo(
      "lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts",
    );
    expect(layout).toContain("sce-match-score-box");
    expect(layout).toContain("sce-match-kickoff-box");
    const fixtureLayout = readRepo("components/sporting-activity/SceMatchFixtureReferenceLayout.tsx");
    expect(fixtureLayout).toContain("data-sce-match-reference-layout");
    expect(fixtureLayout).toContain("reference-split");
  });
});
