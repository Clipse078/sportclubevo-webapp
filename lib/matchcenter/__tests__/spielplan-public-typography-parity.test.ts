import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE } from "../spielplan-public-typography-parity";
import { sceTeamNameClassName } from "@/lib/design-system/sce-team-name-typography";

describe("Spielplan public typography parity", () => {
  it("documents the canonical public team-name reference", () => {
    expect(PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE.family).toContain("Barlow Condensed");
    expect(PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE.weight).toBe(700);
    expect(PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE.style).toBe("italic");
    expect(PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE.sizeRem).toBe(0.875);
    expect(PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE.letterSpacingEm).toBe(0.02);
    expect(PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE.lineHeight).toBe(1.25);
  });

  it("Matchcenter programme-fixture uses the same token as globals.css", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.sce-team-name--standard[\s\S]*font-size:\s*0\.875rem/);
    const classes = sceTeamNameClassName({ density: "STANDARD" });
    expect(classes).toContain("sce-team-name--standard");
  });

  it("SceMatchFixtureReferenceLayout wires STANDARD team name density", () => {
    const source = readFileSync(
      join(process.cwd(), "components/sporting-activity/SceMatchFixtureReferenceLayout.tsx"),
      "utf8",
    );
    expect(source).toContain('density: "STANDARD"');
    expect(source).toContain("sceTeamNameClassName");
    expect(source).toContain("SceTeamName");
  });
});
