import { describe, expect, it } from "vitest";
import {
  deriveSpieleManagementPresentation,
  filterSpielplanungRowsBySearch,
  collectMatchDayKeys,
  formatSpieleDayGroupHeadingLong,
  formatSpieleDayGroupLabel,
  groupSpielplanungRowsByDay,
  matchMatchesSpieleSearch,
  parseSpieleManagementSort,
  resolveSpieleStatusPresentation,
} from "../management-view";
import { assessMatchOperationalState } from "../operational-state";
import type { MatchcenterMatchSummary } from "../types";

function createMatch(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  return {
    id: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    seasonId: "season-2026-2027",
    type: "MATCH",
    title: "FC Allschwil – Gegner",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-09-19T16:00:00.000Z"),
    endAt: new Date("2026-09-19T18:00:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: 100,
      providerTeamName: "FC Allschwil E1",
      canonicalTeamId: "team-home",
      canonicalTeamName: "FC Allschwil E1",
      displayName: "FC Allschwil E1",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 200,
      providerTeamName: "FC Basel E1",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC Basel E1",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
    },
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "10001",
      provider: "SFV",
      externalMatchId: 10001,
      externalSeasonId: 2027,
      matchNumber: 12,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: "KR2",
      homeDressingRoomCode: "G1",
      awayDressingRoomCode: "G2",
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: false,
      wochenplanVisible: true,
      trainingsplanVisible: false,
      teamPageVisible: true,
    },
    reviewStage: "APPROVED",
    publishedAt: null,
    ...overrides,
  };
}

describe("management-view search", () => {
  it("matches opponent and competition text", () => {
    const match = createMatch();
    expect(matchMatchesSpieleSearch(match, "basel")).toBe(true);
    expect(matchMatchesSpieleSearch(match, "meisterschaft")).toBe(true);
    expect(matchMatchesSpieleSearch(match, "unrelated")).toBe(false);
  });

  it("filters spielplanung rows", () => {
    const rows = [
      { match: createMatch({ id: "a" }), assessment: assessMatchOperationalState(createMatch({ id: "a" })) },
      {
        match: createMatch({
          id: "b",
          away: {
            providerTeamId: 300,
            providerTeamName: "FC Liestal",
            canonicalTeamId: null,
            canonicalTeamName: null,
            displayName: "FC Liestal",
            resolution: "UNRESOLVED",
            isOwnTeam: false,
          },
        }),
        assessment: assessMatchOperationalState(createMatch({ id: "b" })),
      },
    ];

    const filtered = filterSpielplanungRowsBySearch(rows, "liestal");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.match.id).toBe("b");
  });
});

describe("management-view grouping", () => {
  it("labels today as HEUTE", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const label = formatSpieleDayGroupLabel(
      new Date("2026-09-19T16:00:00.000Z"),
      "de-CH",
      "Europe/Zurich",
      now,
    );
    expect(label).toBe("HEUTE");
  });

  it("collectMatchDayKeys deduplicates kickoff dates for calendar dots", () => {
    const keys = collectMatchDayKeys(
      [
        new Date("2026-09-18T14:00:00.000Z"),
        new Date("2026-09-18T20:00:00.000Z"),
        new Date("2026-09-19T14:00:00.000Z"),
      ],
      "Europe/Zurich",
    );
    expect(keys.sort()).toEqual(["2026-09-18", "2026-09-19"]);
  });

  it("formats long day group headings for premium date surfaces", () => {
    const label = formatSpieleDayGroupHeadingLong(
      new Date("2026-09-18T16:00:00.000Z"),
      "de-CH",
      "Europe/Zurich",
      new Date("2026-08-01T12:00:00.000Z"),
    );
    expect(label).toMatch(/SEPTEMBER 2026/i);
    expect(label).toMatch(/18/);
  });

  it("groups spielplanung rows chronologically by day key", () => {
    const rowA = {
      match: createMatch({ id: "a", startAt: new Date("2026-09-18T16:00:00.000Z") }),
      assessment: assessMatchOperationalState(createMatch()),
    };
    const rowB = {
      match: createMatch({ id: "b", startAt: new Date("2026-09-19T16:00:00.000Z") }),
      assessment: assessMatchOperationalState(createMatch()),
    };
    const groups = groupSpielplanungRowsByDay([rowB, rowA], "de-CH", "Europe/Zurich");
    expect(groups).toHaveLength(2);
    expect(groups[0]?.rows[0]?.match.id).toBe("a");
  });
});

describe("deriveSpieleManagementPresentation", () => {
  it("derives calendar keys, groups, and filtered rows in one pass", () => {
    const matchA = createMatch({
      id: "a",
      startAt: new Date("2026-09-18T16:00:00.000Z"),
    });
    const matchB = createMatch({
      id: "b",
      startAt: new Date("2026-09-19T16:00:00.000Z"),
      homeAway: "AWAY",
      away: {
        ...createMatch().away,
        isOwnTeam: true,
      },
      home: {
        ...createMatch().home,
        isOwnTeam: false,
      },
    });

    const derived = deriveSpieleManagementPresentation([matchA, matchB], {
      tab: "SPIELPLANUNG",
      searchQuery: "",
      sort: "KICKOFF_ASC",
      statusMask: ["anstehend", "offen", "bereit"],
      homeAwayFilter: "HOME",
      competitionFilter: null,
      venueFilter: null,
      locale: "de-CH",
      timezone: "Europe/Zurich",
      wochenplanFilter: "ALLE",
      teamFilter: null,
    });

    expect(derived.spielplanungRows).toHaveLength(1);
    expect(derived.spielplanungRows[0]?.match.id).toBe("a");
    expect(derived.spielplanungDayGroups).toHaveLength(1);
    expect(derived.matchDayKeys.sort()).toEqual(["2026-09-18", "2026-09-19"]);
    expect(derived.statusCounts.offen).toBeGreaterThanOrEqual(0);
  });

  it("filters resultate by search via shared search index", () => {
    const match = createMatch({
      status: "COMPLETED",
      resultLabel: "2:1",
      scoreHome: 2,
      scoreAway: 1,
    });
    const derived = deriveSpieleManagementPresentation([match], {
      tab: "RESULTATE",
      searchQuery: "basel",
      sort: "KICKOFF_DESC",
      statusMask: ["anstehend", "offen", "bereit"],
      homeAwayFilter: "ALLE",
      competitionFilter: null,
      venueFilter: null,
      locale: "de-CH",
      timezone: "Europe/Zurich",
      wochenplanFilter: "ALLE",
      teamFilter: null,
    });
    expect(derived.resultateMatches).toHaveLength(1);
    expect(deriveSpieleManagementPresentation([match], {
      tab: "RESULTATE",
      searchQuery: "xyz-not-found",
      sort: "KICKOFF_DESC",
      statusMask: ["anstehend", "offen", "bereit"],
      homeAwayFilter: "ALLE",
      competitionFilter: null,
      venueFilter: null,
      locale: "de-CH",
      timezone: "Europe/Zurich",
      wochenplanFilter: "ALLE",
      teamFilter: null,
    }).resultateMatches).toHaveLength(0);
  });
});

describe("management-view status presentation", () => {
  it("parses sort param", () => {
    expect(parseSpieleManagementSort("kickoff_desc")).toBe("KICKOFF_DESC");
    expect(parseSpieleManagementSort(undefined)).toBe("KICKOFF_ASC");
  });

  it("maps open readiness to punkte offen", () => {
    const match = createMatch({
      operational: {
        pitchCode: null,
        homeDressingRoomCode: null,
        awayDressingRoomCode: "G2",
        meetingTime: null,
        remarks: null,
      },
    });
    const assessment = assessMatchOperationalState(match);
    const status = resolveSpieleStatusPresentation(match, assessment);
    expect(status.label).toBe("2 Punkte offen");
  });
});
