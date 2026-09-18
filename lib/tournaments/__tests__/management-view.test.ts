import { describe, expect, it } from "vitest";
import {
  deriveTournamentCalendarDayKeys,
  deriveTurniereManagementPresentation,
  isTenantHostedTournament,
  resolveTournamentPublicationPresentation,
  resolveTournamentRowCrest,
  resolveTournamentStatusPresentation,
} from "../management-view";
import type { TournamentDto } from "../types";
import { assessTournamentOperationalState } from "../operational-state";

function createTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "Herbst Cup",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    startAt: "2026-09-19T08:00:00.000Z",
    endAt: null,
    meetingTime: null,
    location: "Im Brüel, Allschwil",
    organizerName: "FC Allschwil",
    organizerLogoUrl: "https://cdn.example/organizer.png",
    organizerExternalClubId: null,
    competitionLabel: "Turniermodus",
    resultLabel: null,
    remarks: null,
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
    team: {
      id: "team-e",
      name: "Junioren E",
      slug: "e",
      category: "JUNIOREN",
      genderGroup: null,
      ageGroup: "E",
    },
    teamLogoUrl: "https://cdn.example/tenant.png",
    homeAway: "HOME",
    participants: [
      {
        id: "p1",
        tournamentId: "tournament-1",
        kind: "TEAM",
        displayName: "Junioren E",
        logoUrl: null,
        team: {
          id: "team-e",
          name: "Junioren E",
          slug: "e",
          category: "JUNIOREN",
          genderGroup: null,
          ageGroup: "E",
        },
        externalTeam: null,
        externalClub: null,
        manualLabel: null,
        displayOrder: 0,
        dressingRoomAllocations: [],
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "p2",
        tournamentId: "tournament-1",
        kind: "TEAM",
        displayName: "Junioren F",
        logoUrl: null,
        team: {
          id: "team-f",
          name: "Junioren F",
          slug: "f",
          category: "JUNIOREN",
          genderGroup: null,
          ageGroup: "F",
        },
        externalTeam: null,
        externalClub: null,
        manualLabel: null,
        displayOrder: 1,
        dressingRoomAllocations: [],
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    resourceAllocations: [],
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      teamPageVisible: false,
    },
    reviewStage: "APPROVED",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const NOW = new Date("2026-09-03T12:00:00.000Z");
const TZ = "Europe/Zurich";

const BASE_QUERY = {
  scope: "UPCOMING" as const,
  search: "",
  teamFilter: null,
  monthParam: null,
  statusFilter: null,
  actionFilter: "ALLE" as const,
  group: "MONTH" as const,
  sort: "DATE_ASC" as const,
  categoryFilter: null,
  ageFilter: null,
  locationFilter: null,
  ownOnly: false,
  publicOnly: false,
  listView: "LISTE" as const,
};

describe("TURNIERE-UX-01 management-view", () => {
  it("classifies upcoming vs past and derives KPI counts", () => {
    const tournaments = [
      createTournament({ id: "future", startAt: "2026-10-01T10:00:00.000Z" }),
      createTournament({
        id: "past",
        startAt: "2026-08-01T10:00:00.000Z",
        location: "Aesch",
      }),
    ];

    const { kpis } = deriveTurniereManagementPresentation(tournaments, BASE_QUERY, {
      now: NOW,
      timeZone: TZ,
    });

    expect(kpis.upcoming).toBe(1);
    expect(kpis.past).toBe(1);
    expect(kpis.total).toBe(2);
    expect(kpis.uniqueVenues).toBe(2);
  });

  it("composes search and ownership filters", () => {
    const tournaments = [
      createTournament({ id: "home", homeAway: "HOME", title: "Home Cup" }),
      createTournament({
        id: "away",
        homeAway: "AWAY",
        title: "Away Cup",
        organizerName: "External Club",
      }),
    ];

    const filtered = deriveTurniereManagementPresentation(
      tournaments,
      { ...BASE_QUERY, ownOnly: true },
      { now: NOW, timeZone: TZ },
    );
    expect(filtered.viewModel.totalMatching).toBe(1);
    expect(filtered.viewModel.groups[0]?.rows[0]?.tournament.id).toBe("home");

    const bySearch = deriveTurniereManagementPresentation(
      tournaments,
      { ...BASE_QUERY, search: "away" },
      { now: NOW, timeZone: TZ },
    );
    expect(bySearch.viewModel.totalMatching).toBe(1);
  });

  it("groups rows by month", () => {
    const tournaments = [
      createTournament({ id: "sep", startAt: "2026-09-19T10:00:00.000Z" }),
      createTournament({ id: "oct", startAt: "2026-10-05T10:00:00.000Z" }),
    ];

    const { viewModel } = deriveTurniereManagementPresentation(tournaments, BASE_QUERY, {
      now: NOW,
      timeZone: TZ,
      locale: "de-CH",
    });

    expect(viewModel.groups).toHaveLength(2);
    expect(viewModel.groups[0]?.rows[0]?.tournament.id).toBe("sep");
  });

  it("resolves crest, own badge semantics, status and publication", () => {
    const tournament = createTournament();
    const crest = resolveTournamentRowCrest(tournament, "https://cdn.example/tenant.png");
    expect(crest.logoUrl).toBe("https://cdn.example/organizer.png");
    expect(isTenantHostedTournament(tournament)).toBe(true);

    const assessment = assessTournamentOperationalState({
      ...tournament,
      resourceAllocations: [],
      participants: tournament.participants.map((p) => ({
        ...p,
        dressingRoomAllocations: [],
      })),
    });

    const openAssessment = { ...assessment, status: "OPEN" as const, actionCount: 2, actions: [] };
    expect(resolveTournamentStatusPresentation(tournament, openAssessment).label).toBe(
      "In Vorbereitung",
    );
    expect(resolveTournamentPublicationPresentation(tournament).label).toBe("Öffentlich");
  });

  it("derives calendar dots from tournament dates without extra keys", () => {
    const keys = deriveTournamentCalendarDayKeys(
      [
        createTournament({ startAt: "2026-09-19T10:00:00.000Z" }),
        createTournament({ id: "t2", startAt: "2026-09-19T14:00:00.000Z" }),
      ],
      TZ,
    );
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe("2026-09-19");
  });
});
