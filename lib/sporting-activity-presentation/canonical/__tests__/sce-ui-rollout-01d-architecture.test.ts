import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
    expect(source).toContain('data-sce-match-side="home"');
    expect(source).toContain('data-sce-match-side="away"');
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
});
