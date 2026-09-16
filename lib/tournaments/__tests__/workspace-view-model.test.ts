import { describe, expect, it } from "vitest";
import {
  buildTournamentWorkspaceViewModel,
  normalizeTournamentGroupMode,
  normalizeTournamentSortMode,
  normalizeTournamentTimeScope,
  toCalendarDateKey,
} from "../workspace-view-model";
import type { TournamentDto } from "../types";

function createTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "E1 Hallenturnier",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    startAt: "2026-09-05T16:00:00.000Z",
    endAt: null,
    meetingTime: null,
    location: "Turnhalle Binningen",
    organizerName: "FC Aesch",
    organizerLogoUrl: null,
    organizerExternalClubId: null,
    competitionLabel: null,
    resultLabel: null,
    remarks: null,
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
    team: {
      id: "team-f1",
      name: "Junioren F1",
      slug: "f1",
      category: "JUNIOR",
      genderGroup: null,
      ageGroup: "F",
    },
    teamLogoUrl: null,
    homeAway: "HOME",
    participants: [
      {
        id: "participant-1",
        tournamentId: "tournament-1",
        kind: "TEAM",
        displayName: "Junioren F1",
        logoUrl: null,
        team: {
          id: "team-f1",
          name: "Junioren F1",
          slug: "f1",
          category: "JUNIOR",
          genderGroup: null,
          ageGroup: "F",
        },
        externalTeam: null,
        externalClub: null,
        manualLabel: null,
        displayOrder: 0,
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

describe("normalizeTournamentTimeScope", () => {
  it("defaults to UPCOMING", () => {
    expect(normalizeTournamentTimeScope(undefined)).toBe("UPCOMING");
  });

  it("accepts past/all aliases", () => {
    expect(normalizeTournamentTimeScope("past")).toBe("PAST");
    expect(normalizeTournamentTimeScope("alle")).toBe("ALL");
  });
});

describe("normalizeTournamentGroupMode", () => {
  it("defaults to DATE", () => {
    expect(normalizeTournamentGroupMode(undefined)).toBe("DATE");
  });

  it("accepts keine/month/team", () => {
    expect(normalizeTournamentGroupMode("keine")).toBe("NONE");
    expect(normalizeTournamentGroupMode("monat")).toBe("MONTH");
    expect(normalizeTournamentGroupMode("team")).toBe("TEAM");
  });
});

describe("normalizeTournamentSortMode", () => {
  it("defaults by scope", () => {
    expect(normalizeTournamentSortMode(undefined, "UPCOMING")).toBe("DATE_ASC");
    expect(normalizeTournamentSortMode(undefined, "PAST")).toBe("DATE_DESC");
  });
});

describe("buildTournamentWorkspaceViewModel", () => {
  it("scopes upcoming vs past", () => {
    const tournaments = [
      createTournament({ id: "future", startAt: "2026-09-10T10:00:00.000Z" }),
      createTournament({ id: "past", startAt: "2026-08-23T10:00:00.000Z" }),
    ];

    const upcoming = buildTournamentWorkspaceViewModel(
      tournaments,
      {
        scope: "UPCOMING",
        search: "",
        teamFilter: null,
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "NONE",
        sort: "DATE_ASC",
      },
      { now: NOW, timeZone: TZ },
    );

    expect(upcoming.totalMatching).toBe(1);
    expect(upcoming.groups[0]?.rows[0]?.tournament.id).toBe("future");

    const past = buildTournamentWorkspaceViewModel(
      tournaments,
      {
        scope: "PAST",
        search: "",
        teamFilter: null,
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "NONE",
        sort: "DATE_DESC",
      },
      { now: NOW, timeZone: TZ },
    );

    expect(past.totalMatching).toBe(1);
    expect(past.groups[0]?.rows[0]?.tournament.id).toBe("past");
  });

  it("filters by search and team", () => {
    const tournaments = [
      createTournament({ id: "f1", title: "F1 Cup" }),
      createTournament({
        id: "f2",
        title: "F2 Cup",
        team: {
          id: "team-f2",
          name: "Junioren F2",
          slug: "f2",
          category: "JUNIOR",
          genderGroup: null,
          ageGroup: "F",
        },
        participants: [],
      }),
    ];

    const bySearch = buildTournamentWorkspaceViewModel(
      tournaments,
      {
        scope: "UPCOMING",
        search: "f2 cup",
        teamFilter: null,
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "NONE",
        sort: "DATE_ASC",
      },
      { now: NOW, timeZone: TZ },
    );
    expect(bySearch.totalMatching).toBe(1);
    expect(bySearch.groups[0]?.rows[0]?.tournament.id).toBe("f2");

    const byTeam = buildTournamentWorkspaceViewModel(
      tournaments,
      {
        scope: "UPCOMING",
        search: "",
        teamFilter: "team-f1",
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "NONE",
        sort: "DATE_ASC",
      },
      { now: NOW, timeZone: TZ },
    );
    expect(byTeam.totalMatching).toBe(1);
    expect(byTeam.groups[0]?.rows[0]?.tournament.id).toBe("f1");
  });

  it("groups by date with shared calendar keys", () => {
    const tournaments = [
      createTournament({ id: "a", startAt: "2026-09-10T10:00:00.000Z" }),
      createTournament({ id: "b", startAt: "2026-09-10T14:00:00.000Z" }),
      createTournament({ id: "c", startAt: "2026-09-12T10:00:00.000Z" }),
    ];

    const vm = buildTournamentWorkspaceViewModel(
      tournaments,
      {
        scope: "UPCOMING",
        search: "",
        teamFilter: null,
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "DATE",
        sort: "DATE_ASC",
      },
      { now: NOW, timeZone: TZ },
    );

    expect(vm.groups).toHaveLength(2);
    expect(vm.groups[0]?.count).toBe(2);
    expect(toCalendarDateKey(tournaments[0]!.startAt, TZ)).toBe(vm.groups[0]?.key);
  });

  it("returns filtered empty kind when filters exclude all rows", () => {
    const vm = buildTournamentWorkspaceViewModel(
      [createTournament()],
      {
        scope: "UPCOMING",
        search: "does-not-exist",
        teamFilter: null,
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "DATE",
        sort: "DATE_ASC",
      },
      { now: NOW, timeZone: TZ },
    );

    expect(vm.emptyKind).toBe("filtered");
    expect(vm.totalMatching).toBe(0);
  });

  it("groups by team without duplicating team ids in keys", () => {
    const vm = buildTournamentWorkspaceViewModel(
      [createTournament()],
      {
        scope: "UPCOMING",
        search: "",
        teamFilter: null,
        monthParam: null,
        statusFilter: null,
        actionFilter: "ALLE",
        group: "TEAM",
        sort: "DATE_ASC",
      },
      { now: NOW, timeZone: TZ },
    );

    expect(vm.groups).toHaveLength(1);
    expect(vm.groups[0]?.key).toBe("team-f1");
  });
});
