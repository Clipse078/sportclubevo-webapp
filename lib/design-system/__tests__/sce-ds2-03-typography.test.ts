/**
 * SCE-DS2-03 — Typography roles + team name contract
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_03_DOC_MARKERS,
  SCE_DS2_03_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-03-meta";
import {
  SCE_DS2_TYPOGRAPHY_ROLES,
  SCE_DS2_TYPOGRAPHY_ROLE_CLASSES,
} from "@/lib/design-system/sce-typography-roles-contract";
import { SCE_DS2_TYPOGRAPHY_FOUNDATION } from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_TEAM_NAME_ROOT_CLASS,
  sceTeamNameClassName,
} from "@/lib/design-system/sce-team-name-typography";

function readRepo(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-DS2-03 typography contract", () => {
  it("documents package markers", () => {
    expect(SCE_DS2_03_PACKAGE_KEY).toBe("SCE-DS2-03");
    for (const marker of SCE_DS2_03_DOC_MARKERS) {
      expect(marker.length).toBeGreaterThan(2);
    }
  });

  it("binds team names to DS2-03 in foundation contract", () => {
    expect(SCE_DS2_TYPOGRAPHY_FOUNDATION.teamNameContract).toContain("SCE-DS2-03");
  });

  it("defines sporting display roles", () => {
    expect(SCE_DS2_TYPOGRAPHY_ROLES.pageTitle.style).toBe("italic");
    expect(SCE_DS2_TYPOGRAPHY_ROLES.teamName.style).toBe("italic");
    expect(SCE_DS2_TYPOGRAPHY_ROLES.primaryHeaderNav.ownerPackage).toBe("SCE-DS2-02");
  });

  it("styles page titles with display uppercase italic", () => {
    const css = readRepo("app/globals.css");
    expect(css).toMatch(
      new RegExp(
        `\\.${SCE_DS2_TYPOGRAPHY_ROLE_CLASSES.pageTitle.replace(/\./g, "\\.")}[\\s\\S]*text-transform:\\s*uppercase`,
      ),
    );
    expect(css).toMatch(/\.sce-team-name[\s\S]*font-style:\s*italic/);
    expect(css).toMatch(/\.sce-ds2-secondary-nav-label[\s\S]*text-transform:\s*uppercase/);
  });

  it("loads Barlow Condensed italic weights", () => {
    const layout = readRepo("app/layout.tsx");
    expect(layout).toMatch(/style:\s*\[[^\]]*"italic"/);
    expect(layout).toMatch(/"800"/);
  });

  it("composes team name classes without mutating data", () => {
    const classes = sceTeamNameClassName({ density: "STANDARD" });
    expect(classes).toContain(SCE_TEAM_NAME_ROOT_CLASS);
    expect(classes).toContain("sce-team-name--standard");
  });

  it("applies secondary nav label to context tabs foundation", () => {
    const tabs = readRepo("lib/design-system/sce-context-tabs-foundation.ts");
    expect(tabs).toContain("sce-ds2-secondary-nav-label");
  });

  it("ships SceTeamName primitive", () => {
    const source = readRepo("components/design-system/typography/SceTeamName.tsx");
    expect(source).toContain("data-sce-team-name");
    expect(source).not.toMatch(/toUpperCase\(\)/);
  });
});
