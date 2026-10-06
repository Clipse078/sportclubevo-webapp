/**
 * lib/weekplanner/__tests__/queries.test.ts
 *
 * WEEKPLANNER-01A — focused tests for the canonical Weekplanner data
 * aggregator. Covers:
 *   - TrainingSession appears on its correct (effective) day, with its
 *     effective (session override > series default) resource allocations.
 *   - HOME Match appears with its legacy pitchCode/dressingRoomCode
 *     allocations resolved to the canonical FacilityResource.
 *   - HOME Tournament appears with its canonical resource + per-participant
 *     dressing-room allocations.
 *   - an AWAY Match is excluded entirely — never local facility occupancy.
 *   - tenant isolation — every underlying query is scoped by tenantId.
 *   - two canonical items sharing a FacilityResource for overlapping time
 *     produce a conflict ("⚠ Doppelbelegung") end-to-end.
 *
 * All external dependencies (Prisma) are mocked. No DB access.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  getFacilitiesForTenantCached: vi.fn(),
  getTenantDressingRoomOccupancyPresetsCached: vi.fn(),
  getTenantMatchOperationalPolicyCached: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  facilityResourceFindMany: vi.fn(),
  trainingAllocationFindMany: vi.fn(),
  trainingSessionAllocationFindMany: vi.fn(),
  trainingSessionFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  weekplannerPlanFindFirst: vi.fn(),
  wochenplanPlanFindFirst: vi.fn(),
  tenantDressingRoomOccupancyPresetFindUnique: vi.fn(),
  tenantFindFirst: vi.fn(),
  tenantFindUnique: vi.fn(),
  externalClubFindMany: vi.fn(),
  listTournaments: vi.fn(),
  teamSeasonFindMany: vi.fn(),
}));

vi.mock("@/lib/tournaments/tournament-service", () => ({
  listTournaments: mocks.listTournaments,
}));

vi.mock("@/lib/server/request-cache", () => ({
  getFacilitiesForTenantCached: cacheMocks.getFacilitiesForTenantCached,
  getTenantDressingRoomOccupancyPresetsCached: cacheMocks.getTenantDressingRoomOccupancyPresetsCached,
  getTenantMatchOperationalPolicyCached: cacheMocks.getTenantMatchOperationalPolicyCached,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facilityResource: { findMany: mocks.facilityResourceFindMany },
    trainingAllocation: { findMany: mocks.trainingAllocationFindMany },
    trainingSessionAllocation: { findMany: mocks.trainingSessionAllocationFindMany },
    trainingSession: { findMany: mocks.trainingSessionFindMany },
    event: { findMany: mocks.eventFindMany },
    weekplannerPlan: { findFirst: mocks.weekplannerPlanFindFirst },
    wochenplanPlan: { findFirst: mocks.wochenplanPlanFindFirst },
    tenantDressingRoomOccupancyPreset: { findUnique: mocks.tenantDressingRoomOccupancyPresetFindUnique },
    tenant: { findFirst: mocks.tenantFindFirst, findUnique: mocks.tenantFindUnique },
    externalClub: { findMany: mocks.externalClubFindMany },
    teamSeason: { findMany: mocks.teamSeasonFindMany },
  },
}));

import { getWeekplannerWeek } from "../queries";

const TENANT_A = "tenant-a";

const WEEK_WINDOW = {
  from: new Date("2026-08-09T22:00:00.000Z"), // Monday 2026-08-10 00:00 Europe/Zurich
  to: new Date("2026-08-16T21:59:59.999Z"), // Sunday 2026-08-16 23:59:59.999 Europe/Zurich
  days: [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
  ],
  param: "2026-08-10",
  previousParam: "2026-08-03",
  nextParam: "2026-08-17",
};

const PITCH_RESOURCE = {
  id: "res-pitch-1",
  code: "KUNSTRASEN_1",
  name: "Kunstrasen 1",
  facility: { name: "Sportanlage Bruel" },
};
const HOME_ROOM_RESOURCE = {
  id: "res-room-home",
  code: "G1",
  name: "Garderobe 1",
  facility: { name: "Garderobentrakt" },
};
const AWAY_ROOM_RESOURCE = {
  id: "res-room-away",
  code: "G2",
  name: "Garderobe 2",
  facility: { name: "Garderobentrakt" },
};

function trainingSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    tenantId: TENANT_A,
    trainingSeriesId: "series-1",
    teamSeasonId: "teamseason-1",
    date: new Date("2026-08-10T00:00:00.000Z"),
    weekday: "MONDAY",
    startAt: new Date("2026-08-10T16:00:00.000Z"),
    endAt: new Date("2026-08-10T17:30:00.000Z"),
    timezone: "Europe/Zurich",
    status: "SCHEDULED",
    overrideDate: null,
    overrideStartAt: null,
    overrideEndAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    trainingSeries: {
      title: "E2 Training",
      teamSeason: {
        displayName: "FC Allschwil E2",
        team: { name: "E2", shortName: null, alternativeName: null },
      },
    },
    ...overrides,
  };
}

function matchEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-match-1",
    tenantId: TENANT_A,
    type: "MATCH",
    source: "MANUAL",
    status: "SCHEDULED",
    reviewStage: "DRAFT",
    reviewRequestedAt: null,
    reviewedAt: null,
    publishedAt: null,
    reviewNotes: null,
    title: "FC Allschwil 1 - Gegner FC",
    description: null,
    location: "Im Brüel",
    startAt: new Date("2026-08-15T13:00:00.000Z"),
    endAt: new Date("2026-08-15T14:30:00.000Z"),
    externalSource: null,
    externalSourceId: null,
    lastSyncedAt: null,
    opponentName: "Gegner FC",
    organizerName: null,
    competitionLabel: "3. Liga",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    meetingTime: null,
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: true,
    trainingsplanVisible: false,
    teamPageVisible: true,
    remarks: null,
    pitchCode: PITCH_RESOURCE.code,
    homeDressingRoomCode: HOME_ROOM_RESOURCE.code,
    awayDressingRoomCode: AWAY_ROOM_RESOURCE.code,
    team: { id: "team-own", name: "FC Allschwil 1", shortName: "1. Mannschaft", alternativeName: null },
    matchExternalMapping: null,
    ...overrides,
  };
}

function tournamentEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-tournament-1",
    tenantId: TENANT_A,
    title: "FCA Sommerturnier",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    reviewStage: "DRAFT",
    startAt: new Date("2026-08-15T08:00:00.000Z"),
    endAt: new Date("2026-08-15T16:00:00.000Z"),
    meetingTime: null,
    location: "Im Brüel",
    organizerName: "FC Allschwil",
    competitionLabel: null,
    resultLabel: null,
    remarks: null,
    homeAway: "HOME",
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: true,
    teamPageVisible: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    season: { id: "season-1", key: "2026-2027", name: "2026/2027" },
    team: null,
    tournamentParticipants: [
      {
        id: "participant-1",
        eventId: "event-tournament-1",
        teamId: "team-own",
        externalTeamId: null,
        manualLabel: null,
        displayOrder: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        team: { id: "team-own", name: "FC Allschwil E1", slug: "fca-e1", category: "JUNIOREN", genderGroup: null, ageGroup: "E" },
        externalTeam: null,
        dressingRoomAllocations: [
          {
            id: "participant-alloc-1",
            notes: null,
            displayOrder: 0,
            facilityResource: {
              id: HOME_ROOM_RESOURCE.id,
              code: HOME_ROOM_RESOURCE.code,
              name: HOME_ROOM_RESOURCE.name,
              type: "DRESSING_ROOM",
              facilityId: "fac-2",
              facility: { name: HOME_ROOM_RESOURCE.facility.name },
            },
          },
        ],
      },
    ],
    tournamentResourceAllocations: [
      {
        id: "resource-alloc-1",
        notes: null,
        displayOrder: 0,
        facilityResource: {
          id: PITCH_RESOURCE.id,
          code: PITCH_RESOURCE.code,
          name: PITCH_RESOURCE.name,
          type: "FULL_PITCH",
          facilityId: "fac-1",
          facility: { name: PITCH_RESOURCE.facility.name },
        },
      },
    ],
    ...overrides,
  };
}

function tournamentDto(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-tournament-1",
    tenantId: TENANT_A,
    title: "FCA Sommerturnier",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    startAt: "2026-08-15T08:00:00.000Z",
    endAt: "2026-08-15T16:00:00.000Z",
    meetingTime: null,
    location: "Im Brüel",
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    organizerExternalClubId: null,
    competitionLabel: null,
    resultLabel: null,
    remarks: null,
    season: { id: "season-1", key: "2026-2027", name: "2026/2027" },
    team: null,
    teamLogoUrl: null,
    homeAway: "HOME",
    participants: [
      {
        id: "participant-1",
        tournamentId: "event-tournament-1",
        kind: "TEAM",
        displayName: "FC Allschwil E1",
        logoUrl: null,
        team: {
          id: "team-own",
          name: "FC Allschwil E1",
          slug: "fca-e1",
          category: "JUNIOREN",
          genderGroup: null,
          ageGroup: "E",
        },
        externalTeam: null,
        externalClub: null,
        manualLabel: null,
        displayOrder: 0,
        dressingRoomAllocations: [
          {
            id: "participant-alloc-1",
            notes: null,
            displayOrder: 0,
            facilityResourceId: HOME_ROOM_RESOURCE.id,
            facilityResourceCode: HOME_ROOM_RESOURCE.code,
            facilityResourceName: HOME_ROOM_RESOURCE.name,
            facilityResourceType: "DRESSING_ROOM",
            facilityId: "fac-2",
            facilityName: HOME_ROOM_RESOURCE.facility.name,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    resourceAllocations: [
      {
        id: "resource-alloc-1",
        notes: null,
        displayOrder: 0,
        facilityResourceId: PITCH_RESOURCE.id,
        facilityResourceCode: PITCH_RESOURCE.code,
        facilityResourceName: PITCH_RESOURCE.name,
        facilityResourceType: "FULL_PITCH",
        facilityId: "fac-1",
        facilityName: PITCH_RESOURCE.facility.name,
      },
    ],
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: true,
      teamPageVisible: true,
    },
    reviewStage: "DRAFT",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function facilitiesFixture() {
  return [
    {
      id: "fac-pitch",
      name: PITCH_RESOURCE.facility.name,
      resources: [
        {
          id: PITCH_RESOURCE.id,
          code: PITCH_RESOURCE.code,
          name: PITCH_RESOURCE.name,
          status: "ACTIVE",
        },
      ],
    },
    {
      id: "fac-rooms",
      name: HOME_ROOM_RESOURCE.facility.name,
      resources: [
        {
          id: HOME_ROOM_RESOURCE.id,
          code: HOME_ROOM_RESOURCE.code,
          name: HOME_ROOM_RESOURCE.name,
          status: "ACTIVE",
        },
        {
          id: AWAY_ROOM_RESOURCE.id,
          code: AWAY_ROOM_RESOURCE.code,
          name: AWAY_ROOM_RESOURCE.name,
          status: "ACTIVE",
        },
      ],
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  cacheMocks.getFacilitiesForTenantCached.mockResolvedValue(facilitiesFixture());
  cacheMocks.getTenantDressingRoomOccupancyPresetsCached.mockResolvedValue(null);
  cacheMocks.getTenantMatchOperationalPolicyCached.mockResolvedValue({
    defaultMatchDurationMinutes: 120,
    isClubConfigured: false,
  });
  mocks.facilityResourceFindMany.mockResolvedValue([
    {
      ...PITCH_RESOURCE,
      type: "FULL_PITCH",
      facility: { id: "facility-pitch", name: PITCH_RESOURCE.facility.name },
    },
    {
      ...HOME_ROOM_RESOURCE,
      type: "DRESSING_ROOM",
      facility: { id: "facility-rooms", name: HOME_ROOM_RESOURCE.facility.name },
    },
    {
      ...AWAY_ROOM_RESOURCE,
      type: "DRESSING_ROOM",
      facility: { id: "facility-rooms", name: AWAY_ROOM_RESOURCE.facility.name },
    },
  ]);
  mocks.trainingAllocationFindMany.mockResolvedValue([]);
  mocks.trainingSessionAllocationFindMany.mockResolvedValue([]);
  mocks.trainingSessionFindMany.mockResolvedValue([]);
  mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
    if (args.where?.type === "TOURNAMENT") return Promise.resolve([]);
    return Promise.resolve([]);
  });
  mocks.weekplannerPlanFindFirst.mockResolvedValue({ wochenplanPlanId: null });
  mocks.wochenplanPlanFindFirst.mockResolvedValue(null);
  mocks.tenantDressingRoomOccupancyPresetFindUnique.mockResolvedValue(null);
  mocks.tenantFindFirst.mockResolvedValue({ name: "FC Allschwil", logoUrl: null });
  mocks.tenantFindUnique.mockResolvedValue({ logoUrl: null });
  mocks.externalClubFindMany.mockResolvedValue([]);
  mocks.listTournaments.mockResolvedValue([]);
  mocks.teamSeasonFindMany.mockResolvedValue([]);
});

describe("getWeekplannerWeek — TrainingSession", () => {
  it("surfaces a TrainingSession on its correct day with its series-level resource allocations", async () => {
    mocks.trainingSessionFindMany.mockResolvedValue([trainingSessionRow()]);
    mocks.trainingAllocationFindMany.mockResolvedValue([
      {
        trainingSeriesId: "series-1",
        facilityResource: { id: PITCH_RESOURCE.id, code: PITCH_RESOURCE.code, name: PITCH_RESOURCE.name, type: "FULL_PITCH", facility: { name: PITCH_RESOURCE.facility.name } },
      },
      {
        trainingSeriesId: "series-1",
        facilityResource: { id: HOME_ROOM_RESOURCE.id, code: HOME_ROOM_RESOURCE.code, name: HOME_ROOM_RESOURCE.name, type: "DRESSING_ROOM", facility: { name: HOME_ROOM_RESOURCE.facility.name } },
      },
    ]);

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);

    const monday = week.days.find((d) => d.dayKey === "2026-08-10");
    expect(monday?.items).toHaveLength(1);
    const [item] = monday!.items;
    expect(item.type).toBe("TRAINING");
    // TEAMCENTER-UX-01B: the shared lib/teams/team-naming.ts contract now
    // resolves Team.name ("E2") ahead of a seasonal TeamSeason.displayName
    // override ("FC Allschwil E2") — Team.name is the canonical Team
    // identity everywhere it is consumed, including here via
    // lib/training/session-generation-service.ts. Weekplanner itself is
    // untouched; only the shared naming utility's priority changed.
    expect(item.teamNames).toEqual(["E2"]);
    expect(item.pitchAllocations.map((r) => r.code)).toEqual([PITCH_RESOURCE.code]);
    expect(item.dressingRoomAllocations.map((r) => r.code)).toEqual([HOME_ROOM_RESOURCE.code]);

    // No sessions elsewhere in the week.
    for (const day of week.days) {
      if (day.dayKey !== "2026-08-10") expect(day.items).toHaveLength(0);
    }
  });

  it("prefers an occurrence-level TrainingSessionAllocation override over the series default", async () => {
    mocks.trainingSessionFindMany.mockResolvedValue([trainingSessionRow()]);
    mocks.trainingAllocationFindMany.mockResolvedValue([
      {
        trainingSeriesId: "series-1",
        facilityResource: { id: "series-default-pitch", code: "DEFAULT", name: "Standard-Platz", type: "FULL_PITCH", facility: { name: "Sportanlage" } },
      },
    ]);
    mocks.trainingSessionAllocationFindMany.mockResolvedValue([
      {
        trainingSessionId: "session-1",
        facilityResource: { id: PITCH_RESOURCE.id, code: PITCH_RESOURCE.code, name: PITCH_RESOURCE.name, type: "FULL_PITCH", facility: { name: PITCH_RESOURCE.facility.name } },
      },
    ]);

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const monday = week.days.find((d) => d.dayKey === "2026-08-10");
    expect(monday?.items[0].pitchAllocations.map((r) => r.code)).toEqual([PITCH_RESOURCE.code]);
  });
});

describe("getWeekplannerWeek — HOME Match", () => {
  it("surfaces a HOME match with pitch + home/away dressing-room allocations resolved from legacy codes", async () => {
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "MATCH") return Promise.resolve([matchEventRow()]);
      return Promise.resolve([]);
    });

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const saturday = week.days.find((d) => d.dayKey === "2026-08-15");
    expect(saturday?.items).toHaveLength(1);

    const [item] = saturday!.items;
    expect(item.type).toBe("MATCH");
    if (item.type !== "MATCH") throw new Error("expected MATCH");
    // MATCHCENTER-UX-01 / TEAM-IDENTITY-01: compact match-side names prefer
    // Team.shortName ("1. Mannschaft") over Team.name — same contract as Matchcenter.
    expect(item.teamNames).toEqual(["1. Mannschaft"]);
    expect(item.opponentName).toBe("Gegner FC");
    expect(item.homeSide.displayName).toBe("1. Mannschaft");
    expect(item.awaySide.displayName).toBe("Gegner FC");
    expect(item.eventSource).toBe("MANUAL");
    expect(item.homeAway).toBe("HOME");
    expect(item.pitchAllocations.map((r) => r.code)).toEqual([PITCH_RESOURCE.code]);
    expect(item.dressingRoomAllocations.map((r) => r.code)).toEqual([HOME_ROOM_RESOURCE.code]);
    expect(item.awayDressingRoomAllocations.map((r) => r.code)).toEqual([AWAY_ROOM_RESOURCE.code]);
  });

  it("resolves WeekplannerMatchItem.teamSeasonId from teamId + seasonId when Event.teamSeasonId is null (SFV)", async () => {
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "MATCH") {
        return Promise.resolve([
          matchEventRow({
            id: "event-sfv-s40",
            source: "SFV",
            teamId: "team-senioren-40",
            seasonId: "season-2026-2027",
            teamSeasonId: null,
            matchExternalMapping: {
              provider: "SFV",
              externalMatchId: 9001,
              externalSeasonId: 2027,
              matchNumber: 12345,
              providerHomeTeamId: 100,
              providerAwayTeamId: 200,
              providerHomeTeamName: "Provider Home",
              providerAwayTeamName: "Provider Away",
              homeTeamId: "team-senioren-40",
              awayTeamId: null,
              providerMatchState: 1,
              providerMatchStateName: "Geplant",
              scoreHome: null,
              scoreAway: null,
              providerLeagueId: 10,
              providerLeagueName: "League",
              providerDivisionId: 20,
              providerDivisionName: "Division",
              providerRoundNbr: 3,
              providerOrganisationId: 30,
              providerPlaygroundId: 40,
              providerVenueName: "Im Brüel",
              providerSeasonName: "2026/2027",
              lastSyncedAt: new Date("2026-07-20T10:00:00.000Z"),
              detailSyncedAt: new Date("2026-07-20T10:05:00.000Z"),
              homeTeam: {
                id: "team-senioren-40",
                name: "Senioren 40+",
                shortName: "Senioren 40+",
                alternativeName: null,
              },
              awayTeam: null,
            },
          }),
        ]);
      }
      return Promise.resolve([]);
    });
    mocks.teamSeasonFindMany.mockResolvedValue([
      {
        id: "ts-senioren-40-fca",
        teamId: "team-senioren-40",
        seasonId: "season-2026-2027",
      },
    ]);

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const saturday = week.days.find((d) => d.dayKey === "2026-08-15");
    const item = saturday?.items[0];
    expect(item?.type).toBe("MATCH");
    if (item?.type !== "MATCH") throw new Error("expected MATCH");
    expect(item.teamSeasonId).toBe("ts-senioren-40-fca");
    expect(mocks.teamSeasonFindMany).toHaveBeenCalled();
  });

  it("excludes an AWAY match entirely — it never creates local facility occupancy", async () => {
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "MATCH") {
        return Promise.resolve([matchEventRow({ id: "event-match-away", homeAway: "AWAY" })]);
      }
      return Promise.resolve([]);
    });

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const totalItems = week.days.reduce((sum, day) => sum + day.items.length, 0);
    expect(totalItems).toBe(0);
  });

  it("excludes a CANCELLED match", async () => {
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "MATCH") {
        return Promise.resolve([matchEventRow({ id: "event-match-cancelled", status: "CANCELLED" })]);
      }
      return Promise.resolve([]);
    });

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const totalItems = week.days.reduce((sum, day) => sum + day.items.length, 0);
    expect(totalItems).toBe(0);
  });
});

describe("getWeekplannerWeek — HOME Tournament", () => {
  it("surfaces a HOME tournament with its pitch and per-participant dressing-room allocations", async () => {
    mocks.listTournaments.mockResolvedValue([tournamentDto()]);

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const saturday = week.days.find((d) => d.dayKey === "2026-08-15");
    expect(saturday?.items).toHaveLength(1);

    const [item] = saturday!.items;
    expect(item.type).toBe("TOURNAMENT");
    if (item.type !== "TOURNAMENT") throw new Error("expected TOURNAMENT");
    expect(item.title).toBe("FCA Sommerturnier");
    expect(item.teamNames).toEqual(["FC Allschwil E1"]);
    expect(item.pitchAllocations.map((r) => r.code)).toEqual([PITCH_RESOURCE.code]);
    expect(item.participantAllocations).toHaveLength(1);
    expect(item.participantAllocations[0].dressingRoomAllocations.map((r) => r.code)).toEqual([HOME_ROOM_RESOURCE.code]);
  });

  it("excludes an AWAY tournament entirely", async () => {
    mocks.listTournaments.mockResolvedValue([
      tournamentDto({ id: "event-tournament-away", homeAway: "AWAY" }),
    ]);

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const totalItems = week.days.reduce((sum, day) => sum + day.items.length, 0);
    expect(totalItems).toBe(0);
  });
});

describe("getWeekplannerWeek — resource-conflict detection", () => {
  it("flags a TrainingSession and a HOME Match sharing the same pitch for an overlapping window", async () => {
    mocks.trainingSessionFindMany.mockResolvedValue([
      trainingSessionRow({
        startAt: new Date("2026-08-15T13:15:00.000Z"),
        endAt: new Date("2026-08-15T14:45:00.000Z"),
        date: new Date("2026-08-15T00:00:00.000Z"),
        weekday: "SATURDAY",
      }),
    ]);
    mocks.trainingAllocationFindMany.mockResolvedValue([
      {
        trainingSeriesId: "series-1",
        facilityResource: { id: PITCH_RESOURCE.id, code: PITCH_RESOURCE.code, name: PITCH_RESOURCE.name, type: "FULL_PITCH", facility: { name: PITCH_RESOURCE.facility.name } },
      },
    ]);
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "MATCH") return Promise.resolve([matchEventRow()]); // 13:00–14:30, same pitch code
      return Promise.resolve([]);
    });

    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    const saturday = week.days.find((d) => d.dayKey === "2026-08-15");
    expect(saturday?.items).toHaveLength(2);
    for (const item of saturday!.items) {
      expect(item.conflicts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            facilityResourceId: PITCH_RESOURCE.id,
            facilityResourceName: PITCH_RESOURCE.name,
            resourceKind: "PITCH_HALL",
          }),
        ]),
      );
    }
  });
});

describe("getWeekplannerWeek — tenant isolation", () => {
  it("scopes every underlying query by the given tenantId", async () => {
    mocks.trainingSessionFindMany.mockResolvedValue([trainingSessionRow()]);
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "MATCH") return Promise.resolve([matchEventRow()]);
      return Promise.resolve([]);
    });
    mocks.listTournaments.mockResolvedValue([tournamentDto()]);

    await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);

    expect(mocks.facilityResourceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(mocks.trainingSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(mocks.trainingAllocationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    expect(mocks.trainingSessionAllocationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    for (const call of mocks.eventFindMany.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }));
    }
    expect(mocks.listTournaments).toHaveBeenCalledWith(
      TENANT_A,
      expect.objectContaining({
        overlapsWindow: expect.objectContaining({ from: WEEK_WINDOW.from, to: WEEK_WINDOW.to }),
      }),
    );
  });

  it("propagates week navigation params through unchanged", async () => {
    const week = await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);
    expect(week.param).toBe(WEEK_WINDOW.param);
    expect(week.previousParam).toBe(WEEK_WINDOW.previousParam);
    expect(week.nextParam).toBe(WEEK_WINDOW.nextParam);
  });
});

describe("getWeekplannerWeek — Veranstaltung (SCE-EVENTS-01C)", () => {
  it("loads OTHER events with one bounded tenant/week query (no public feed)", async () => {
    mocks.eventFindMany.mockImplementation((args: { where?: { type?: string } }) => {
      if (args.where?.type === "OTHER") {
        return Promise.resolve([
          {
            id: "evt-other-1",
            title: "Sommerfest",
            location: "Clubhaus",
            startAt: new Date("2026-08-12T10:00:00.000Z"),
            endAt: new Date("2026-08-12T18:00:00.000Z"),
            allDay: false,
            teamSeasonId: null,
            pitchCode: null,
            homeDressingRoomCode: null,
            teamSeason: null,
            eventFacilityAllocations: [],
          },
        ]);
      }
      return Promise.resolve([]);
    });

    await getWeekplannerWeek(TENANT_A, WEEK_WINDOW);

    const otherCalls = mocks.eventFindMany.mock.calls.filter(
      (call) => call[0]?.where?.type === "OTHER",
    );
    expect(otherCalls).toHaveLength(1);
    expect(otherCalls[0]![0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_A,
          type: "OTHER",
          startAt: expect.objectContaining({ lt: WEEK_WINDOW.to }),
        }),
      }),
    );
  });
});
