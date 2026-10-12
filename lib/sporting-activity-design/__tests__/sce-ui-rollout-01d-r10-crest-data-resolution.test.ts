import { describe, expect, it } from "vitest";
import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { resolveMatchSideClubLogoUrl } from "@/lib/sporting-activity-design/logo-resolution";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import { resolveTeamCockpitMatchPresentation } from "@/lib/teams/team-cockpit-match-presentation";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import type { TeamSeasonMatchItem } from "@/lib/teams/team-match-query-service";

const TENANT_LOGO = "https://cdn.example/fca-club.png";
const CANONICAL_OPPONENT_LOGO = "https://cdn.example/fc-concordia-verein.png";
const DIRECT_OPPONENT_LOGO = "https://cdn.example/fc-liestal.png";
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
    id: "match-r10",
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
      isOwnTeam: true,
    }),
    away: side({
      displayName: "FC Concordia Basel",
      externalLogoUrl: CANONICAL_OPPONENT_LOGO,
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
  awayLogo: string | null,
): TeamSeasonMatchItem {
  const completed = lifecycle === "COMPLETED";
  return {
    eventId: "evt-r10",
    tenantId: "tenant-1",
    teamSeasonId: "ts-1",
    seasonId: "season-1",
    side: "HOME",
    startAt: new Date("2026-11-01T14:00:00.000Z"),
    endAt: null,
    status: completed ? "COMPLETED" : "SCHEDULED",
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
      externalLogoUrl: awayLogo,
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

describe("SCE-UI-ROLLOUT-01D R10 — crest data resolution", () => {
  it("A — tenant team display uses owning club crest via canonicalTeamId", () => {
    expect(
      resolveMatchSideClubLogoUrl(
        { isOwnTeam: false, canonicalTeamId: TEAM_ID, externalLogoUrl: null },
        TENANT_LOGO,
      ),
    ).toBe(TENANT_LOGO);
  });

  it("B — tenant crest when isOwnTeam is false but canonicalTeamId proves ownership", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        home: side({
          displayName: "Junioren B1",
          canonicalTeamId: TEAM_ID,
          isOwnTeam: false,
        }),
      }),
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(model.fixture.home.logoUrl).toBe(TENANT_LOGO);
  });

  it("C — external opponent uses upstream externalLogoUrl unchanged", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        away: side({
          displayName: "FC Liestal",
          externalLogoUrl: DIRECT_OPPONENT_LOGO,
        }),
      }),
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(model.fixture.away.logoUrl).toBe(DIRECT_OPPONENT_LOGO);
  });

  it("D/E — missing crest yields null for initials fallback", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        away: side({ displayName: "Unknown FC", externalLogoUrl: null }),
      }),
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(model.fixture.away.logoUrl).toBeNull();
  });

  it("F/G — upcoming and completed share the same crest identities", () => {
    const upcoming = resolveTeamCockpitMatchPresentation({
      item: teamSeasonItem("UPCOMING", CANONICAL_OPPONENT_LOGO),
      teamId: TEAM_ID,
      tenantLogoUrl: TENANT_LOGO,
    });
    const completed = resolveTeamCockpitMatchPresentation({
      item: teamSeasonItem("COMPLETED", CANONICAL_OPPONENT_LOGO),
      teamId: TEAM_ID,
      tenantLogoUrl: TENANT_LOGO,
    });

    expect(upcoming.fixture.home.logoUrl).toBe(TENANT_LOGO);
    expect(completed.fixture.home.logoUrl).toBe(TENANT_LOGO);
    expect(upcoming.fixture.away.logoUrl).toBe(CANONICAL_OPPONENT_LOGO);
    expect(completed.fixture.away.logoUrl).toBe(CANONICAL_OPPONENT_LOGO);
  });

  it("H — home/away inversion keeps crests on fixture sides", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        homeAway: "AWAY",
        home: side({
          displayName: "FC Therwil",
          externalLogoUrl: CANONICAL_OPPONENT_LOGO,
        }),
        away: side({
          displayName: "Junioren B1",
          canonicalTeamId: TEAM_ID,
          isOwnTeam: true,
        }),
      }),
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(model.fixture.home.logoUrl).toBe(CANONICAL_OPPONENT_LOGO);
    expect(model.fixture.away.logoUrl).toBe(TENANT_LOGO);
  });

  it("I — Team Cockpit bridge matches Matchcenter adapter for the same crest URLs", () => {
    const cockpit = resolveTeamCockpitMatchPresentation({
      item: teamSeasonItem("UPCOMING", DIRECT_OPPONENT_LOGO),
      teamId: TEAM_ID,
      tenantLogoUrl: TENANT_LOGO,
    });
    const matchcenter = buildMatchClubIdentityPair(
      createMatch({
        away: side({
          displayName: "FC Concordia Basel",
          externalLogoUrl: DIRECT_OPPONENT_LOGO,
        }),
      }),
      TENANT_LOGO,
    );

    expect(cockpit.fixture.home.logoUrl).toBe(matchcenter.homeClubIdentity.logoUrl);
    expect(cockpit.fixture.away.logoUrl).toBe(matchcenter.awayClubIdentity.logoUrl);
  });
});
