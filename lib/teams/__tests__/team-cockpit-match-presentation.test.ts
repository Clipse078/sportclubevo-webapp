import { describe, expect, it } from "vitest";
import {
  resolveTeamCockpitMatchPresentation,
  teamSeasonMatchItemToMatchcenterSummary,
} from "@/lib/teams/team-cockpit-match-presentation";
import type { TeamSeasonMatchItem } from "@/lib/teams/team-match-query-service";

const TEAM_ID = "team-allschwil-b1";

function baseItem(overrides: Partial<TeamSeasonMatchItem> = {}): TeamSeasonMatchItem {
  return {
    eventId: "evt-1",
    tenantId: "tenant-1",
    teamSeasonId: "ts-1",
    seasonId: "season-1",
    side: "HOME",
    startAt: new Date("2026-09-14T14:00:00.000Z"),
    endAt: null,
    status: "SCHEDULED",
    lifecycle: "UPCOMING",
    lifecycleStage: "UPCOMING",
    home: {
      canonicalTeamId: TEAM_ID,
      canonicalExternalTeamId: null,
      displayName: "FC Allschwil Junioren B1",
      clubName: "FC Allschwil",
      externalLogoUrl: null,
      providerTeamId: 10,
      providerTeamName: "FC Allschwil Junioren B1",
    },
    away: {
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-binningen",
      displayName: "SC Binningen a",
      clubName: "SC Binningen",
      externalLogoUrl: "/binningen.svg",
      providerTeamId: 20,
      providerTeamName: "SC Binningen a",
    },
    opponent: {
      displayName: "SC Binningen a",
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-binningen",
      providerTeamId: 20,
      providerTeamName: "SC Binningen a",
    },
    competition: {
      eventCompetitionLabel: "Junioren B",
      providerLeagueId: null,
      providerLeagueName: null,
      providerDivisionId: null,
      providerDivisionName: null,
      providerRoundNumber: null,
      canonicalCompetitionId: null,
      canonicalCompetitionName: null,
      canonicalCompetitionShortName: null,
    },
    location: "Im Brüel",
    venueName: "Im Brüel",
    resultLabel: null,
    scoreHome: null,
    scoreAway: null,
    intermediateResultLabel: null,
    provider: {
      provider: "SFV",
      externalMatchId: 99,
      externalSeasonId: 2027,
      matchNumber: 5,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    ...overrides,
  };
}

describe("SCE-UI-ROLLOUT-01D — Team Cockpit match presentation bridge", () => {
  it("delegates to resolveSceMatchPresentation without a Team-specific card model", () => {
    const model = resolveTeamCockpitMatchPresentation({
      item: baseItem(),
      teamId: TEAM_ID,
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: "/tenant.svg",
    });
    expect(model.kind).toBe("MATCH");
    expect(model.fixture.homeLeftAwayRightInvariant).toBe(true);
    expect(model.route.consumeHref).toBe("/dashboard/activity/event/evt-1");
    expect(model.result).toBeNull();
  });

  it("keeps tenant home fixture home-left / away-right", () => {
    const model = resolveTeamCockpitMatchPresentation({
      item: baseItem(),
      teamId: TEAM_ID,
      tenantLogoUrl: "/tenant.svg",
    });
    expect(model.fixture.home.displayName).toContain("FC Allschwil");
    expect(model.fixture.away.displayName).toContain("Binningen");
  });

  it("does not force tenant left on away fixtures", () => {
    const awayItem = baseItem({
      side: "AWAY",
      home: {
        canonicalTeamId: null,
        canonicalExternalTeamId: "ext-concordia",
        displayName: "FC Concordia Basel b",
        clubName: "FC Concordia Basel",
        externalLogoUrl: "/concordia.svg",
        providerTeamId: 30,
        providerTeamName: "FC Concordia Basel b",
      },
      away: {
        canonicalTeamId: TEAM_ID,
        canonicalExternalTeamId: null,
        displayName: "FC Allschwil Junioren B1",
        clubName: "FC Allschwil",
        externalLogoUrl: null,
        providerTeamId: 10,
        providerTeamName: "FC Allschwil Junioren B1",
      },
    });
    const model = resolveTeamCockpitMatchPresentation({
      item: awayItem,
      teamId: TEAM_ID,
      tenantLogoUrl: "/tenant.svg",
    });
    expect(model.fixture.home.displayName).toContain("Concordia");
    expect(model.fixture.away.displayName).toContain("FC Allschwil");
  });

  it("maps TeamSeasonMatchItem to Matchcenter summary for canonical adapter input", () => {
    const summary = teamSeasonMatchItemToMatchcenterSummary(baseItem(), { teamId: TEAM_ID });
    expect(summary.home.isOwnTeam).toBe(true);
    expect(summary.away.isOwnTeam).toBe(false);
    expect(summary.homeAway).toBe("HOME");
    expect(summary.competitionLabel).toBe("Junioren B");
  });
});
