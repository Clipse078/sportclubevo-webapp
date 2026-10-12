import { createTeamCockpitMatchFixture } from "@/lib/teams/team-cockpit-match-fixtures";
import type { TeamCockpitMatch } from "@/lib/teams/team-cockpit-sporting-data";

/** PO UAT fixtures — same canonical row component as `/dashboard/teams/[teamId]/spiele`. */
export function buildTeamUpcomingMatchesPreviewFixtures(): TeamCockpitMatch[] {
  const homeFixture = createTeamCockpitMatchFixture(
    {
      eventId: "preview-home-binningen",
      opponentName: "SC Binningen a",
      home: {
        displayName: "FC Allschwil Junioren B1",
        isOwnTeam: true,
        clubName: "FC Allschwil",
        logoUrl: "/tenant-crest.svg",
      },
      away: {
        displayName: "SC Binningen a",
        isOwnTeam: false,
        clubName: "SC Binningen",
        logoUrl: "/binningen-crest.svg",
      },
      competitionName: "Junioren B",
    },
    {
      eventId: "preview-home-binningen",
      home: {
        canonicalTeamId: "team-1",
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
        externalLogoUrl: "/binningen-crest.svg",
        providerTeamId: 20,
        providerTeamName: "SC Binningen a",
      },
    },
  );

  const awayFixture = createTeamCockpitMatchFixture(
    {
      eventId: "preview-away-concordia",
      side: "AWAY",
      opponentName: "FC Concordia Basel b",
      home: {
        displayName: "FC Concordia Basel b",
        isOwnTeam: false,
        clubName: "FC Concordia Basel",
        logoUrl: "/concordia-crest.svg",
      },
      away: {
        displayName: "FC Allschwil Junioren B1",
        isOwnTeam: true,
        clubName: "FC Allschwil",
        logoUrl: "/tenant-crest.svg",
      },
      startAt: new Date("2026-09-21T14:00:00.000Z"),
      competitionName: "Junioren B",
    },
    {
      eventId: "preview-away-concordia",
      side: "AWAY",
      startAt: new Date("2026-09-21T14:00:00.000Z"),
      home: {
        canonicalTeamId: null,
        canonicalExternalTeamId: "ext-concordia",
        displayName: "FC Concordia Basel b",
        clubName: "FC Concordia Basel",
        externalLogoUrl: "/concordia-crest.svg",
        providerTeamId: 30,
        providerTeamName: "FC Concordia Basel b",
      },
      away: {
        canonicalTeamId: "team-1",
        canonicalExternalTeamId: null,
        displayName: "FC Allschwil Junioren B1",
        clubName: "FC Allschwil",
        externalLogoUrl: null,
        providerTeamId: 10,
        providerTeamName: "FC Allschwil Junioren B1",
      },
    },
  );

  return [homeFixture, awayFixture];
}
