import type { TeamCockpitMatch } from "@/lib/teams/team-cockpit-sporting-data";
import { resolveTeamCockpitMatchPresentation } from "@/lib/teams/team-cockpit-match-presentation";
import type { TeamSeasonMatchItem } from "@/lib/teams/team-match-query-service";

const DEFAULT_TEAM_ID = "team-1";
const DEFAULT_TENANT_ID = "tenant-1";

function defaultSeasonItem(
  overrides: Partial<TeamSeasonMatchItem> = {},
): TeamSeasonMatchItem {
  return {
    eventId: "event-1",
    tenantId: DEFAULT_TENANT_ID,
    teamSeasonId: "ts-1",
    seasonId: "season-1",
    side: "HOME",
    startAt: new Date("2026-09-01T16:00:00.000Z"),
    endAt: null,
    status: "SCHEDULED",
    lifecycle: "UPCOMING",
    lifecycleStage: "UPCOMING",
    home: {
      canonicalTeamId: DEFAULT_TEAM_ID,
      canonicalExternalTeamId: null,
      displayName: "1. Mannschaft",
      clubName: "FC Allschwil",
      externalLogoUrl: null,
      providerTeamId: 100,
      providerTeamName: "FC Allschwil",
    },
    away: {
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-away",
      displayName: "FC Example",
      clubName: "FC Example",
      externalLogoUrl: "/example-crest.svg",
      providerTeamId: 200,
      providerTeamName: "FC Example",
    },
    opponent: {
      displayName: "FC Example",
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-away",
      providerTeamId: 200,
      providerTeamName: "FC Example",
    },
    competition: {
      eventCompetitionLabel: "Junioren A Promotion",
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
      externalMatchId: 1,
      externalSeasonId: 2027,
      matchNumber: 1,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    ...overrides,
  };
}

export function createTeamCockpitMatchFixture(
  overrides: Partial<TeamCockpitMatch> = {},
  itemOverrides: Partial<TeamSeasonMatchItem> = {},
): TeamCockpitMatch {
  const item = defaultSeasonItem({
    eventId: overrides.eventId ?? "event-1",
    side: overrides.side ?? "HOME",
    startAt: overrides.startAt ?? new Date("2026-09-01T16:00:00.000Z"),
    status: overrides.status ?? "SCHEDULED",
    lifecycle: overrides.lifecycle ?? "UPCOMING",
    location: overrides.location ?? "Im Brüel",
    venueName: overrides.venueName ?? "Im Brüel",
    ...itemOverrides,
  });

  if (overrides.home) {
    item.home = {
      ...item.home,
      displayName: overrides.home.displayName,
      canonicalTeamId: overrides.home.isOwnTeam ? DEFAULT_TEAM_ID : null,
      externalLogoUrl: overrides.home.isOwnTeam ? null : overrides.home.logoUrl,
    };
  }
  if (overrides.away) {
    item.away = {
      ...item.away,
      displayName: overrides.away.displayName,
      canonicalTeamId: overrides.away.isOwnTeam ? DEFAULT_TEAM_ID : null,
      externalLogoUrl: overrides.away.isOwnTeam ? null : overrides.away.logoUrl,
    };
  }
  const competitionLabel = overrides.competitionName?.trim();
  if (competitionLabel) {
    item.competition = {
      ...item.competition,
      eventCompetitionLabel: competitionLabel,
    };
  }

  if (overrides.side === "AWAY") {
    item.side = "AWAY";
    item.home = {
      canonicalTeamId: null,
      canonicalExternalTeamId: "ext-home",
      displayName: overrides.home?.displayName ?? "FC Example",
      clubName: overrides.home?.clubName ?? "FC Example",
      externalLogoUrl: overrides.home?.logoUrl ?? "/example-crest.svg",
      providerTeamId: 200,
      providerTeamName: "FC Example",
    };
    item.away = {
      canonicalTeamId: DEFAULT_TEAM_ID,
      canonicalExternalTeamId: null,
      displayName: overrides.away?.displayName ?? "1. Mannschaft",
      clubName: overrides.away?.clubName ?? "FC Allschwil",
      externalLogoUrl: null,
      providerTeamId: 100,
      providerTeamName: "FC Allschwil",
    };
  }

  const tenantLogoUrl =
    overrides.home?.logoUrl && overrides.home.isOwnTeam
      ? overrides.home.logoUrl
      : overrides.away?.logoUrl && overrides.away.isOwnTeam
        ? overrides.away.logoUrl
        : "/tenant-crest.svg";

  const base: TeamCockpitMatch = {
    eventId: item.eventId,
    startAt: item.startAt,
    side: item.side,
    status: item.status,
    lifecycle: item.lifecycle,
    opponentName: item.opponent.displayName,
    home: {
      displayName: item.home.displayName,
      isOwnTeam: item.home.canonicalTeamId === DEFAULT_TEAM_ID,
      clubName: item.home.clubName,
      logoUrl: item.home.canonicalTeamId === DEFAULT_TEAM_ID ? tenantLogoUrl : item.home.externalLogoUrl,
    },
    away: {
      displayName: item.away.displayName,
      isOwnTeam: item.away.canonicalTeamId === DEFAULT_TEAM_ID,
      clubName: item.away.clubName,
      logoUrl: item.away.canonicalTeamId === DEFAULT_TEAM_ID ? tenantLogoUrl : item.away.externalLogoUrl,
    },
    venueName: item.venueName,
    location: item.location,
    competitionName: overrides.competitionName ?? "Junioren A Promotion",
    scePresentation: resolveTeamCockpitMatchPresentation({
      item,
      teamId: DEFAULT_TEAM_ID,
      tenantClubName: "FC Allschwil",
      tenantLogoUrl,
    }),
  };

  return { ...base, ...overrides, scePresentation: base.scePresentation };
}
