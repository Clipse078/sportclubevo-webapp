import { describe, expect, it } from "vitest";
import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { resolveMatchSideClubLogoUrl } from "@/lib/sporting-activity-design/logo-resolution";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import { resolveTeamCockpitMatchPresentation } from "@/lib/teams/team-cockpit-match-presentation";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import type { TeamSeasonMatchItem } from "@/lib/teams/team-match-query-service";

const TENANT_LOGO = "https://cdn.example/fca-club.png";
const EXTERNAL_LOGO = "https://cdn.example/concordia.png";
const TEAM_ID = "team-junioren-b1";

function side(partial: Partial<MatchcenterSide> & Pick<MatchcenterSide, "displayName">): MatchcenterSide {
  return {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    resolution: "RESOLVED",
    isOwnTeam: false,
    externalLogoUrl: null,
    ...partial,
  };
}

function createMatch(overrides: Partial<MatchcenterMatchSummary> = {}): MatchcenterMatchSummary {
  return {
    id: "match-1",
    tenantId: "tenant-1",
    teamId: TEAM_ID,
    seasonId: "season-1",
    type: "MATCH",
    title: "Fixture",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-11-01T14:00:00.000Z"),
    endAt: new Date("2026-11-01T16:00:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-11-01T16:00:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "Junioren B",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side({
      displayName: "Junioren B1",
      canonicalTeamId: TEAM_ID,
      canonicalTeamShortName: "JB1",
      isOwnTeam: true,
    }),
    away: side({
      displayName: "FC Concordia Basel",
      externalLogoUrl: EXTERNAL_LOGO,
      canonicalExternalTeamId: "ext-concordia",
    }),
    source: {} as MatchcenterMatchSummary["source"],
    synchronization: {} as MatchcenterMatchSummary["synchronization"],
    operational: {} as MatchcenterMatchSummary["operational"],
    visibility: {} as MatchcenterMatchSummary["visibility"],
    ...overrides,
  };
}

function teamSeasonItem(
  lifecycle: "UPCOMING" | "COMPLETED",
  status: string,
): TeamSeasonMatchItem {
  const completed = lifecycle === "COMPLETED";
  return {
    eventId: "evt-parity",
    tenantId: "tenant-1",
    teamSeasonId: "ts-1",
    seasonId: "season-1",
    side: "HOME",
    startAt: new Date("2026-11-01T14:00:00.000Z"),
    endAt: null,
    status,
    lifecycle,
    lifecycleStage: lifecycle,
    home: {
      canonicalTeamId: TEAM_ID,
      canonicalExternalTeamId: null,
      displayName: "Junioren B1",
      clubName: "FC Allschwil",
      externalLogoUrl: null,
      providerTeamId: 10,
      providerTeamName: "Junioren B1",
    },
    away: {
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-concordia",
      displayName: "FC Concordia Basel",
      clubName: "FC Concordia Basel",
      externalLogoUrl: EXTERNAL_LOGO,
      providerTeamId: 20,
      providerTeamName: "FC Concordia Basel",
    },
    opponent: {
      displayName: "FC Concordia Basel",
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-concordia",
      providerTeamId: 20,
      providerTeamName: "FC Concordia Basel",
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
    resultLabel: completed ? "2:1" : null,
    scoreHome: completed ? 2 : null,
    scoreAway: completed ? 1 : null,
    intermediateResultLabel: null,
    provider: {
      provider: "SFV",
      externalMatchId: 1,
      externalSeasonId: 2027,
      matchNumber: 1,
      providerMatchState: null,
      providerMatchStateName: null,
    },
  };
}

describe("SCE-UI-ROLLOUT-01D R9 — crest resolution parity", () => {
  it("tenant team uses club crest when canonicalTeamId is set even if isOwnTeam is false", () => {
    const url = resolveMatchSideClubLogoUrl(
      {
        isOwnTeam: false,
        canonicalTeamId: TEAM_ID,
        externalLogoUrl: null,
      },
      TENANT_LOGO,
    );
    expect(url).toBe(TENANT_LOGO);
  });

  it("external club crest is independent of match lifecycle (upcoming vs completed)", () => {
    const upcoming = resolveSceMatchPresentation({
      match: createMatch({ status: "SCHEDULED" }),
      tenantLogoUrl: TENANT_LOGO,
    });
    const completed = resolveSceMatchPresentation({
      match: createMatch({
        status: "COMPLETED",
        resultLabel: "2:1",
        scoreHome: 2,
        scoreAway: 1,
      }),
      tenantLogoUrl: TENANT_LOGO,
    });

    expect(upcoming.fixture.home.logoUrl).toBe(TENANT_LOGO);
    expect(completed.fixture.home.logoUrl).toBe(TENANT_LOGO);
    expect(upcoming.fixture.away.logoUrl).toBe(EXTERNAL_LOGO);
    expect(completed.fixture.away.logoUrl).toBe(EXTERNAL_LOGO);
  });

  it("Team Cockpit bridge matches Matchcenter adapter crest identities", () => {
    const upcomingModel = resolveTeamCockpitMatchPresentation({
      item: teamSeasonItem("UPCOMING", "SCHEDULED"),
      teamId: TEAM_ID,
      tenantLogoUrl: TENANT_LOGO,
    });
    const completedModel = resolveTeamCockpitMatchPresentation({
      item: teamSeasonItem("COMPLETED", "COMPLETED"),
      teamId: TEAM_ID,
      tenantLogoUrl: TENANT_LOGO,
    });

    const pair = buildMatchClubIdentityPair(
      createMatch({
        home: side({
          displayName: "Junioren B1",
          canonicalTeamId: TEAM_ID,
          isOwnTeam: true,
        }),
        away: side({
          displayName: "FC Concordia Basel",
          externalLogoUrl: EXTERNAL_LOGO,
        }),
      }),
      TENANT_LOGO,
    );

    expect(upcomingModel.fixture.home.logoUrl).toBe(pair.homeClubIdentity.logoUrl);
    expect(upcomingModel.fixture.away.logoUrl).toBe(pair.awayClubIdentity.logoUrl);
    expect(completedModel.fixture.home.logoUrl).toBe(pair.homeClubIdentity.logoUrl);
    expect(completedModel.fixture.away.logoUrl).toBe(pair.awayClubIdentity.logoUrl);
  });

  it("away tenant home external preserves crests for both sides", () => {
    const awayMatch = createMatch({
      homeAway: "AWAY",
      home: side({
        displayName: "FC Concordia Basel",
        externalLogoUrl: EXTERNAL_LOGO,
        isOwnTeam: false,
      }),
      away: side({
        displayName: "Junioren B1",
        canonicalTeamId: TEAM_ID,
        isOwnTeam: true,
      }),
    });
    const model = resolveSceMatchPresentation({
      match: awayMatch,
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(model.fixture.home.logoUrl).toBe(EXTERNAL_LOGO);
    expect(model.fixture.away.logoUrl).toBe(TENANT_LOGO);
  });
});
