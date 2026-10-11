import { describe, expect, it } from "vitest";
import { resolveTournamentCategoryAgeLine } from "../management-view";
import {
  resolveTurniereRecordHauptteamMetaLine,
  resolveTurniereRecordIdentity,
} from "../turniere-record-presentation";
import type { TournamentDto, TournamentTeamReference } from "../types";

function teamRef(id: string, name: string): TournamentTeamReference {
  return {
    id,
    name,
    slug: id,
    category: "JUNIOREN",
    genderGroup: null,
    ageGroup: "F",
  };
}

function createTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "PlayMore Turnier",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    startAt: "2026-10-17T08:15:00.000Z",
    endAt: "2026-10-17T10:00:00.000Z",
    meetingTime: null,
    location: "Im Brüel",
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    organizerExternalClubId: null,
    competitionLabel: null,
    resultLabel: null,
    remarks: null,
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
    team: teamRef("team-f3", "FC Allschwil Junioren F3"),
    teamLogoUrl: null,
    homeAway: "HOME",
    participants: [
      {
        id: "p-f3",
        tournamentId: "tournament-1",
        kind: "TEAM",
        displayName: null,
        logoUrl: null,
        team: teamRef("team-f3", "FC Allschwil Junioren F3"),
        externalTeam: null,
        externalClub: null,
        manualLabel: null,
        displayOrder: 0,
        dressingRoomAllocations: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "p-f2",
        tournamentId: "tournament-1",
        kind: "TEAM",
        displayName: null,
        logoUrl: null,
        team: teamRef("team-f2", "FC Allschwil Junioren F2"),
        externalTeam: null,
        externalClub: null,
        manualLabel: null,
        displayOrder: 3,
        dressingRoomAllocations: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    resourceAllocations: [],
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: true,
      teamPageVisible: false,
    },
    reviewStage: "APPROVED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Tournament Hauptteam context (NAV-01 R2.1)", () => {
  it("uses Event.team for record header meta, not alphabetically first Teilnahme team", () => {
    const tournament = createTournament();
    expect(resolveTurniereRecordHauptteamMetaLine(tournament)).toBe("FC Allschwil Junioren F3");
    const identity = resolveTurniereRecordIdentity(tournament, null);
    expect(identity.categoryLine).toBe("FC Allschwil Junioren F3");
  });

  it("keeps Aufgebot presentation line aligned when F2 is listed after F3 in Teilnahme", () => {
    const tournament = createTournament({
      team: teamRef("team-f2", "FC Allschwil Junioren F2"),
    });
    expect(resolveTournamentCategoryAgeLine(tournament)).toBe("Junioren F");
  });
});
