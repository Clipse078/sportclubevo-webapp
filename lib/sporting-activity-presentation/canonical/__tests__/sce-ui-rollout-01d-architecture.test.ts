import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_MATCH_MICRO_DENSITY_SCALE,
  SCE_MATCH_RICH_DENSITY_SCALE,
} from "../match-card-rich-density";

const repoRoot = process.cwd();

describe("SCE-UI-ROLLOUT-01D — architecture guardrails", () => {
  it("documents canonical Match card in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(repoRoot, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("SceMatchCard");
    expect(doc).toContain("Canonical Match card family");
  });

  it("uses a single canonical SceMatchCard module (no parallel MatchCardModel)", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceMatchCard.tsx"),
      "utf8",
    );
    expect(source).toContain("SceMatchPresentationModel");
    expect(source).not.toContain("MatchPresentationModelV2");
    expect(source).not.toContain("MatchCardModel");
    expect(source).toContain("data-sce-match-side=");
    expect(source).toContain('data-sce-match-region="fixture"');
    expect(source).toContain("data-sce-match-density");
    expect(source).toContain("data-sce-match-header");
    expect(source).toContain("sceMatchRichDensityScale");
    expect(source).not.toMatch(/function\s+SceMatchHero/);
    expect(source).not.toMatch(/function\s+SceMatchStandard/);
    expect(source).not.toMatch(/function\s+SceMatchCompactRich/);
  });

  it("rich densities share one scale module (no separate structural renderers)", () => {
    const scale = readFileSync(
      join(repoRoot, "lib/sporting-activity-presentation/canonical/match-card-rich-density.ts"),
      "utf8",
    );
    expect(scale).toContain("SCE_MATCH_RICH_DENSITY_SCALE");
    expect(scale).toContain("maxWidthClass");
    expect(scale).toContain("SCE_MATCH_CARD_SHELL_CLASS");
    expect(scale).toContain("--sce-match-card-surface");
    expect(scale).not.toContain("backdrop-blur");
  });

  it("migrated consumers do not override SceMatchCard with transparent backgrounds", () => {
    const consumerPaths = [
      "components/admin/teams/upcoming-matches/TeamUpcomingMatchRow.tsx",
      "components/admin/teams/results/TeamResultRow.tsx",
      "components/admin/teams/overview/TeamNextMatchSummary.tsx",
      "components/admin/teams/overview/TeamLatestResultSummary.tsx",
      "components/admin/matchcenter/SpieleManagementMatchRow.tsx",
      "components/admin/matchcenter/SpieleManagementResultRow.tsx",
      "components/admin/planner/WeekplannerMatchIdentityCard.tsx",
    ];
    for (const relativePath of consumerPaths) {
      const src = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(src, relativePath).toContain("SceMatchCard");
      expect(src, relativePath).not.toMatch(/SceMatchCard[\s\S]*className=.*bg-transparent/);
      expect(src, relativePath).not.toMatch(/SceMatchCard[\s\S]*className=.*--surface-1/);
    }
  });

  it("defines pitch-opaque match card surface token in globals.css", () => {
    const css = readFileSync(join(repoRoot, "app/globals.css"), "utf8");
    expect(css).toContain("--sce-match-card-surface:");
  });

  it("does not resolve logo URLs inside the visual card (uses ClubIdentity / ClubCrest)", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceMatchCard.tsx"),
      "utf8",
    );
    expect(source).not.toContain("resolveClubIdentityEffectiveLogoUrl");
    expect(source).not.toContain("buildMatchClubIdentityPair");
  });

  it("representative integration uses SceMatchCard on Activity Detail", () => {
    const detail = readFileSync(
      join(repoRoot, "components/sporting-activity/detail/SportingActivityDetailContent.tsx"),
      "utf8",
    );
    expect(detail).toContain("SceMatchCard");
    expect(detail).toContain("scePresentation");
  });

  it("Team Resultate and Übersicht consume SceMatchCard via scePresentation", () => {
    const resultRow = readFileSync(
      join(repoRoot, "components/admin/teams/results/TeamResultRow.tsx"),
      "utf8",
    );
    expect(resultRow).toContain("SceMatchCard");
    expect(resultRow).toContain("scePresentation");
    expect(resultRow).not.toContain("SportingTeamLogo");

    const nextSummary = readFileSync(
      join(repoRoot, "components/admin/teams/overview/TeamNextMatchSummary.tsx"),
      "utf8",
    );
    expect(nextSummary).toContain("SceMatchCard");

    const latestSummary = readFileSync(
      join(repoRoot, "components/admin/teams/overview/TeamLatestResultSummary.tsx"),
      "utf8",
    );
    expect(latestSummary).toContain("SceMatchCard");
  });

  it("Matchcenter Spiele row consumes SceMatchCard instead of local fixture markup", () => {
    const row = readFileSync(
      join(repoRoot, "components/admin/matchcenter/SpieleManagementMatchRow.tsx"),
      "utf8",
    );
    expect(row).toContain("SceMatchCard");
    expect(row).toContain("resolveSceMatchPresentation");
    expect(row).not.toContain("SpieleManagementMatchIdentity");
    expect(row).not.toContain("ClubLogo");
    expect(row).not.toMatch(/grid-cols-\[minmax\(0,1\.85fr\)/);
    expect(row).not.toMatch(/md:grid-cols-\[minmax\(0,auto\)_minmax\(0,1fr\)\]/);
    expect(row).toContain("stacked-card-operations-below");
    expect(row).toContain("matchcenter-open-points-panel");
  });

  it("logo resolution uses tenant club crest for internal Team participants", () => {
    const resolver = readFileSync(
      join(repoRoot, "lib/sporting-activity-design/logo-resolution.ts"),
      "utf8",
    );
    expect(resolver).toContain("canonicalTeamId");
    expect(resolver).not.toMatch(/lifecycle|COMPLETED|UPCOMING/i);
  });

  it("defines canonical match result foreground token", () => {
    const css = readFileSync(join(repoRoot, "app/globals.css"), "utf8");
    expect(css).toContain("--sce-match-result-foreground:");
    const scale = readFileSync(
      join(repoRoot, "lib/sporting-activity-presentation/canonical/match-card-rich-density.ts"),
      "utf8",
    );
    expect(scale).toContain("--sce-match-result-foreground");
    expect(scale).toMatch(/HERO:[\s\S]*text-5xl/);
    expect(scale).toMatch(/STANDARD:[\s\S]*text-3xl/);
    expect(scale).toMatch(/COMPACT:[\s\S]*text-2xl/);
  });

  it("Matchcenter Resultate row consumes SceMatchCard (no legacy table fixture)", () => {
    const row = readFileSync(
      join(repoRoot, "components/admin/matchcenter/SpieleManagementResultRow.tsx"),
      "utf8",
    );
    expect(row).toContain("SceMatchCard");
    expect(row).not.toContain("ClubLogo");
    expect(row).not.toContain("getMatchcenterResultLabel");
  });

  it("Planner edit drawer match summary uses SceMatchCard", () => {
    const card = readFileSync(
      join(repoRoot, "components/admin/planner/WeekplannerMatchIdentityCard.tsx"),
      "utf8",
    );
    expect(card).toContain("SceMatchCard");
    expect(card).not.toContain("ClubLogo");
  });

  it("Team Nächste Spiele consumes SceMatchCard via canonical scePresentation", () => {
    const row = readFileSync(
      join(repoRoot, "components/admin/teams/upcoming-matches/TeamUpcomingMatchRow.tsx"),
      "utf8",
    );
    expect(row).toContain("SceMatchCard");
    expect(row).toContain("scePresentation");
    expect(row).not.toContain("SportingTeamLogo");
    expect(row).not.toContain("TeamMatchCard");

    const sportingData = readFileSync(
      join(repoRoot, "lib/teams/team-cockpit-sporting-data.ts"),
      "utf8",
    );
    expect(sportingData).toContain("resolveTeamCockpitMatchPresentation");
  });

  it("load-event-detail attaches resolveSceMatchPresentation for MATCH", () => {
    const loader = readFileSync(
      join(repoRoot, "lib/sporting-activity-detail/load-event-detail.ts"),
      "utf8",
    );
    expect(loader).toContain("resolveSceMatchPresentation");
    expect(loader).toContain("scePresentation");
  });

  it("ClubCrest renders real logos with object-contain (no circular pill)", () => {
    const crest = readFileSync(
      join(repoRoot, "components/sporting-activity/ClubCrest.tsx"),
      "utf8",
    );
    expect(crest).toContain("object-contain");
    expect(crest).toMatch(/data-testid="club-crest-image"/);
    expect(crest).not.toMatch(/data-testid="club-crest-image"[\s\S]*rounded-full/);
    expect(crest).toMatch(/rounded-full[\s\S]*club-crest-fallback-initials/);
  });

  it("match density scale defines result typography for all densities including MICRO", () => {
    const scale = readFileSync(
      join(repoRoot, "lib/sporting-activity-presentation/canonical/match-card-rich-density.ts"),
      "utf8",
    );
    expect(scale).toContain("SCE_MATCH_MICRO_DENSITY_SCALE");
    expect(scale).toContain("sceMatchCenterTypographyScale");
    for (const density of ["HERO", "STANDARD", "COMPACT"] as const) {
      expect(scale).toMatch(new RegExp(`${density}:[\\s\\S]*resultTextClass:`));
    }
    expect(scale).toMatch(/SCE_MATCH_MICRO_DENSITY_SCALE[\s\S]*resultTextClass:/);

    const card = readFileSync(
      join(repoRoot, "components/sporting-activity/SceMatchCard.tsx"),
      "utf8",
    );
    expect(card).toContain("sceMatchCenterTypographyScale");
    expect(card).not.toMatch(/SceMatchCardResult[\s\S]*text-(lg|xl|2xl|3xl|4xl)/);
  });

  it("result score typography is stronger than VS at each density", () => {
    const weight = (cls: string) => {
      const result = cls.match(/text-\[(.+?)rem\]|text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/);
      if (!result) return 0;
      if (result[1]) return parseFloat(result[1]);
      const map: Record<string, number> = {
        xs: 0.75,
        sm: 0.875,
        base: 1,
        lg: 1.125,
        xl: 1.25,
        "2xl": 1.5,
        "3xl": 1.875,
        "4xl": 2.25,
        "5xl": 3,
      };
      return map[result[2]] ?? 0;
    };

    for (const density of ["HERO", "STANDARD", "COMPACT"] as const) {
      const { resultTextClass, vsTextClass } = SCE_MATCH_RICH_DENSITY_SCALE[density];
      expect(weight(resultTextClass)).toBeGreaterThan(weight(vsTextClass));
    }
    expect(
      weight(SCE_MATCH_MICRO_DENSITY_SCALE.resultTextClass),
    ).toBeGreaterThan(weight(SCE_MATCH_MICRO_DENSITY_SCALE.vsTextClass));
  });
});
