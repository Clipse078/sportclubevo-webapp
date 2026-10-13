import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS,
  SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
  SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
} from "../activity-card-semantic-tokens";
import { SCE_MATCH_RICH_DENSITY_SCALE } from "../match-card-rich-density";
import { SCE_TOURNAMENT_RICH_DENSITY_SCALE } from "../tournament-card-rich-density";
import { SCE_TRAINING_RICH_DENSITY_SCALE } from "../training-card-rich-density";
import { SCE_CLUB_EVENT_RICH_DENSITY_SCALE } from "../club-event-card-rich-density";

const repoRoot = process.cwd();

describe("SCE-UI-ROLLOUT-01D-R10 — shared activity semantic colors", () => {
  it("documents shared semantic language in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(repoRoot, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("Activity card semantic color language");
    expect(doc).toContain("SCE_ACTIVITY_SECONDARY_IDENTITY");
    expect(doc).toContain("activity-card-semantic-tokens");
  });

  it("Match rich densities use canonical secondary, schedule, and location tokens", () => {
    for (const density of ["HERO", "STANDARD", "COMPACT"] as const) {
      const scale = SCE_MATCH_RICH_DENSITY_SCALE[density];
      expect(scale.competitionTextClass).toContain(SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS);
      expect(scale.scheduleTextClass).toContain(SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS);
      expect(scale.scheduleTextClass).toContain("font-medium");
      expect(scale.locationTextClass).toContain(SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS);
      expect(scale.locationIconClass).toContain(SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS);
      expect(scale.locationTextClass).not.toEqual(scale.scheduleTextClass);
    }
  });

  it("Tournament, Training, and Club Event location scales consume the same location helper output as Match", () => {
    for (const density of ["HERO", "STANDARD", "COMPACT"] as const) {
      const match = SCE_MATCH_RICH_DENSITY_SCALE[density];
      const tournament = SCE_TOURNAMENT_RICH_DENSITY_SCALE[density];
      const training = SCE_TRAINING_RICH_DENSITY_SCALE[density];
      const clubEvent = SCE_CLUB_EVENT_RICH_DENSITY_SCALE[density];
      expect(tournament.locationTextClass).toBe(match.locationTextClass);
      expect(training.locationTextClass).toBe(match.locationTextClass);
      expect(clubEvent.locationTextClass).toBe(match.locationTextClass);
      expect(tournament.locationIconClass).toBe(match.locationIconClass);
    }
  });

  it("SceMatchCard location row uses density location tokens (not schedule-only)", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceMatchCard.tsx"),
      "utf8",
    );
    expect(source).toContain("locationTextClass");
    expect(source).toContain("locationIconClass");
    expect(source).not.toMatch(/SceMatchLocationRow[\s\S]*scheduleTextClass/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).toContain("data-sce-match-side=");
    expect(source).toContain("ActivityTypePill");
    expect(source).toContain('activityKind="MATCH"');
    expect(source).not.toContain('activityKind="TOURNAMENT"');
  });

  it("documents canonical activity-type label contract in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(repoRoot, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("Activity-type marker contract");
    expect(doc).toMatch(/MATCH.*SPIEL/s);
    expect(doc).toMatch(/TOURNAMENT.*TURNIER/s);
    expect(doc).toMatch(/TRAINING.*TRAINING/s);
    expect(doc).toMatch(/CLUB_EVENT.*VERANSTALTUNG/s);
  });

  it("Tournament card does not duplicate local location color-mix literals", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceTournamentCard.tsx"),
      "utf8",
    );
    expect(source).toContain("activity-card-semantic-tokens");
    expect(source).not.toMatch(/color-mix\(in_srgb,var\(--sce-info\)_55%/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
