import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import {
  isMatchParticipatingTeam,
  isMatchRelevantToTeamProgrammeScope,
  matchParticipatingCanonicalTeamIds,
  resolveProgrammeMatchTeamSeasonIdForTeam,
} from "../match-team-relevance";
import { teamSeasonLookupKey } from "@/lib/weekplanner/match-team-season-resolution";
import { buildProgrammeResourceKey } from "../programme-item-id";

const mocks = vi.hoisted(() => ({
  listTrainingSessions: vi.fn(),
  listMatchcenterMatches: vi.fn(),
  listTournaments: vi.fn(),
  eventFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/training/session-generation-service", () => ({
  listTrainingSessions: mocks.listTrainingSessions,
}));

vi.mock("@/lib/matchcenter/query-service", () => ({
  listMatchcenterMatches: mocks.listMatchcenterMatches,
}));

vi.mock("@/lib/tournaments/tournament-service", () => ({
  listTournaments: mocks.listTournaments,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: mocks.eventFindMany },
    teamSeason: { findMany: mocks.teamSeasonFindMany },
    team: { findMany: mocks.teamFindMany },
  },
}));

vi.mock("@/lib/sporting-activity-presentation/training-facility-batch", () => ({
  loadTrainingSessionFacilityHints: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/facilities/display-helpers", () => ({
  batchGetEventAllocationDisplayForTenant: vi.fn(async () => []),
}));

import { queryProgramme } from "../query-programme";
import { loadProgrammeSourceItems } from "../load-programme-sources";

/** FC Allschwil Junioren B1 — SFV/provider shape (null Event.teamSeasonId). */
const FCA_B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const FCA_B1_TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const FCA_SEASON_ID = "season-fca-active";

function baseMatch(overrides: Partial<MatchcenterMatchSummary> = {}): MatchcenterMatchSummary {
  return {
    id: "match-1",
    tenantId: "tenant-fca",
    teamId: FCA_B1_TEAM_ID,
    teamSeasonId: null,
    seasonId: FCA_SEASON_ID,
    type: "MATCH",
    title: "FC Allschwil Junioren B1 vs Opponent",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-11-01T14:00:00.000Z"),
    kickoffKnown: true,
    endAt: null,
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-11-01T16:00:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "Junioren",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: 31924,
      providerTeamName: "FC Allschwil Junioren B1",
      canonicalTeamId: FCA_B1_TEAM_ID,
      canonicalTeamName: "FC Allschwil Junioren B1",
      displayName: "Junioren B1",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 44002,
      providerTeamName: "FC Opponent",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC Opponent",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
    },
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "9001",
      provider: "SFV",
      externalMatchId: 9001,
      externalSeasonId: 2027,
      matchNumber: 1,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: { pitchCode: null, homeDressingRoomCode: null, awayDressingRoomCode: null, meetingTime: null, remarks: null },
    visibility: {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: false,
      wochenplanVisible: true,
      trainingsplanVisible: false,
      teamPageVisible: true,
    },
    reviewStage: "PUBLISHED",
    publishedAt: new Date(),
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
    ...overrides,
  };
}

const lookup = new Map([
  [teamSeasonLookupKey(FCA_B1_TEAM_ID, FCA_SEASON_ID), FCA_B1_TEAM_SEASON_ID],
]);

describe("SCE-ACTIVITY-CREATE-01I R1 — match team relevance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listTrainingSessions.mockResolvedValue([]);
    mocks.listTournaments.mockResolvedValue([]);
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.teamSeasonFindMany.mockImplementation(async ({ where }: { where: { teamId?: { in: string[] } } }) => {
      const teamIds = where.teamId?.in ?? [];
      if (teamIds.includes(FCA_B1_TEAM_ID)) {
        return [{ id: FCA_B1_TEAM_SEASON_ID, teamId: FCA_B1_TEAM_ID, seasonId: FCA_SEASON_ID }];
      }
      return [];
    });
    mocks.teamFindMany.mockResolvedValue([]);
  });

  it("A — includes SFV match when selected team is HOME (null Event.teamSeasonId)", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([baseMatch()]);

    const items = await loadProgrammeSourceItems(
      { kind: "TEAM", teamId: FCA_B1_TEAM_ID, teamSeasonId: FCA_B1_TEAM_SEASON_ID, orgUnitId: "ou-1" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    const matchItems = items.filter((i) => i.kind === "MATCH");
    expect(matchItems).toHaveLength(1);
    expect(matchItems[0]?.teamSeasonId).toBe(FCA_B1_TEAM_SEASON_ID);
  });

  it("B — includes SFV match when selected team is AWAY", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([
      baseMatch({
        homeAway: "AWAY",
        teamId: FCA_B1_TEAM_ID,
        home: {
          providerTeamId: 1,
          providerTeamName: "Opponent",
          canonicalTeamId: "team-opponent",
          canonicalTeamName: "Opponent",
          displayName: "Opponent",
          resolution: "RESOLVED",
          isOwnTeam: false,
        },
        away: {
          providerTeamId: 31924,
          providerTeamName: "FC Allschwil Junioren B1",
          canonicalTeamId: FCA_B1_TEAM_ID,
          canonicalTeamName: "FC Allschwil Junioren B1",
          displayName: "Junioren B1",
          resolution: "RESOLVED",
          isOwnTeam: true,
        },
      }),
    ]);

    const items = await loadProgrammeSourceItems(
      { kind: "TEAM", teamId: FCA_B1_TEAM_ID, teamSeasonId: FCA_B1_TEAM_SEASON_ID, orgUnitId: "ou-1" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    expect(items.filter((i) => i.kind === "MATCH")).toHaveLength(1);
  });

  it("C — excludes match when selected team is neither side", () => {
    const match = baseMatch();
    expect(
      isMatchRelevantToTeamProgrammeScope(
        match,
        { teamId: "other-team", teamSeasonId: "other-ts" },
        lookup,
      ),
    ).toBe(false);
  });

  it("D — includes manual SCE match via Event.teamId when sides lack mapping", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([
      baseMatch({
        source: { ...baseMatch().source, eventSource: "MANUAL", provider: null },
        home: {
          providerTeamId: null,
          providerTeamName: null,
          canonicalTeamId: FCA_B1_TEAM_ID,
          canonicalTeamName: "FC Allschwil Junioren B1",
          displayName: "Junioren B1",
          resolution: "RESOLVED",
          isOwnTeam: true,
        },
        away: {
          providerTeamId: null,
          providerTeamName: null,
          canonicalTeamId: null,
          canonicalTeamName: null,
          displayName: "Guest",
          resolution: "UNRESOLVED",
          isOwnTeam: false,
        },
      }),
    ]);

    const items = await loadProgrammeSourceItems(
      { kind: "TEAM", teamId: FCA_B1_TEAM_ID, teamSeasonId: FCA_B1_TEAM_SEASON_ID, orgUnitId: "ou-1" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    expect(items.filter((i) => i.kind === "MATCH")).toHaveLength(1);
  });

  it("E — date-range exclusion still applies via matchcenter window query", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([]);

    await loadProgrammeSourceItems(
      { kind: "TEAM", teamId: FCA_B1_TEAM_ID, teamSeasonId: FCA_B1_TEAM_SEASON_ID, orgUnitId: "ou-1" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    expect(mocks.listMatchcenterMatches).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        from: new Date("2026-10-01T00:00:00.000Z"),
        to: new Date("2026-12-31T23:59:59.999Z"),
      }),
    );
  });

  it("F — match permissions remain enforced (DRAFT hidden without manage)", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([
      baseMatch({ reviewStage: "DRAFT" }),
    ]);

    const items = await loadProgrammeSourceItems(
      { kind: "TEAM", teamId: FCA_B1_TEAM_ID, teamSeasonId: FCA_B1_TEAM_SEASON_ID, orgUnitId: "ou-1" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    expect(items.filter((i) => i.kind === "MATCH")).toHaveLength(0);
  });

  it("G — MATCH ProgrammeItem keeps canonical presentation kind", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([baseMatch()]);

    const result = await queryProgramme({
      tenantId: "tenant-fca",
      timeZone: "Europe/Zurich",
      userId: "u1",
      permissionKeys: ["events.view"],
      scope: {
        kind: "TEAM",
        teamId: FCA_B1_TEAM_ID,
        teamSeasonId: FCA_B1_TEAM_SEASON_ID,
        orgUnitId: "ou-1",
      },
    });

    const match = result.items.find((i) => i.kind === "MATCH");
    expect(match?.presentation.kind).toBe("MATCH");
    expect(match?.resourceKey).toBe(buildProgrammeResourceKey("MATCH", "match-1"));
  });

  it("H — liste and kalender share the same queryProgramme items", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([baseMatch()]);

    const result = await queryProgramme({
      tenantId: "tenant-fca",
      timeZone: "Europe/Zurich",
      userId: "u1",
      permissionKeys: ["events.view"],
      scope: {
        kind: "TEAM",
        teamId: FCA_B1_TEAM_ID,
        teamSeasonId: FCA_B1_TEAM_SEASON_ID,
        orgUnitId: "ou-1",
      },
    });

    const ids = result.items.map((i) => i.id);
    expect(ids).toContain("MATCH:match-1");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("I — CLUB scope still aggregates tenant matches", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([
      baseMatch(),
      baseMatch({ id: "match-2", teamId: "team-other", home: { ...baseMatch().home, canonicalTeamId: "team-other" } }),
    ]);

    const items = await loadProgrammeSourceItems(
      { kind: "CLUB" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    expect(items.filter((i) => i.kind === "MATCH")).toHaveLength(2);
  });

  it("J — training/tournament loaders unchanged when match relevance fixed", async () => {
    mocks.listTrainingSessions.mockResolvedValue([
      {
        id: "tr-1",
        tenantId: "tenant-fca",
        teamSeasonId: FCA_B1_TEAM_SEASON_ID,
        startAt: new Date("2026-11-02T18:00:00.000Z"),
        endAt: null,
        status: "SCHEDULED",
        trainingSeriesTitle: "Training",
        teamName: "Junioren B1",
        trainingSeriesId: "series-1",
      },
    ]);
    mocks.listTournaments.mockResolvedValue([]);
    mocks.listMatchcenterMatches.mockResolvedValue([baseMatch()]);
    mocks.teamSeasonFindMany.mockImplementation(async (args: { select?: { team?: unknown; seasonId?: boolean } }) => {
      if (args.select?.team) {
        return [
          {
            id: FCA_B1_TEAM_SEASON_ID,
            teamId: FCA_B1_TEAM_ID,
            team: { orgUnitId: "ou-1" },
          },
        ];
      }
      return [{ id: FCA_B1_TEAM_SEASON_ID, teamId: FCA_B1_TEAM_ID, seasonId: FCA_SEASON_ID }];
    });

    const items = await loadProgrammeSourceItems(
      { kind: "TEAM", teamId: FCA_B1_TEAM_ID, teamSeasonId: FCA_B1_TEAM_SEASON_ID, orgUnitId: "ou-1" },
      {
        tenantId: "tenant-fca",
        timeZone: "Europe/Zurich",
        rangeStart: new Date("2026-10-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-12-31T23:59:59.999Z"),
        actor: { userId: "u1", tenantId: "tenant-fca", permissionKeys: ["events.view", "trainings.view"] },
        tenantClubName: "FC Allschwil",
      },
    );

    expect(items.some((i) => i.kind === "TRAINING")).toBe(true);
    expect(items.some((i) => i.kind === "MATCH")).toBe(true);
  });
});

describe("match-team-relevance — unit helpers", () => {
  it("participating ids use home/away canonicalTeamId", () => {
    expect(matchParticipatingCanonicalTeamIds(baseMatch())).toEqual([FCA_B1_TEAM_ID]);
    expect(isMatchParticipatingTeam(baseMatch(), FCA_B1_TEAM_ID)).toBe(true);
  });

  it("resolveProgrammeMatchTeamSeasonIdForTeam uses lookup when Event.teamSeasonId is null", () => {
    expect(
      resolveProgrammeMatchTeamSeasonIdForTeam(baseMatch(), FCA_B1_TEAM_ID, lookup),
    ).toBe(FCA_B1_TEAM_SEASON_ID);
  });
});
