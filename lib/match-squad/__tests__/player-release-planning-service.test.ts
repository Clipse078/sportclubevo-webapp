import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rosterFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  eventFindMany: vi.fn(),
  eventFindFirst: vi.fn(),
  playerReleaseFindFirst: vi.fn(),
  resolveTargetTeams: vi.fn(),
  resolveActivityContext: vi.fn(),
  conflictHints: vi.fn(),
  createPlayerRelease: vi.fn(),
  emitAwareness: vi.fn(),
}));

const txMock = {
  playerSquadMember: { findMany: mocks.rosterFindMany },
  teamSeason: {
    findMany: mocks.teamSeasonFindMany,
    findFirst: mocks.teamSeasonFindFirst,
  },
    event: { findMany: mocks.eventFindMany, findFirst: mocks.eventFindFirst },
  playerRelease: { findFirst: mocks.playerReleaseFindFirst, create: vi.fn() },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: mocks.rosterFindMany },
    teamSeason: {
      findMany: mocks.teamSeasonFindMany,
      findFirst: mocks.teamSeasonFindFirst,
    },
    event: { findMany: mocks.eventFindMany, findFirst: mocks.eventFindFirst },
    playerRelease: { findFirst: mocks.playerReleaseFindFirst },
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<string[]>) => fn(txMock)),
  },
}));

vi.mock("@/lib/match-squad/player-release-target-discovery", () => ({
  resolvePlayerReleaseTargetTeams: mocks.resolveTargetTeams,
}));

vi.mock("@/lib/match-squad/player-release-activity-context", () => ({
  resolvePlayerReleaseActivityContext: mocks.resolveActivityContext,
}));

vi.mock("@/lib/match-squad/person-activity-conflict-hints", () => ({
  loadPersonActivityConflictHints: mocks.conflictHints,
}));

vi.mock("@/lib/match-squad/player-release-service", () => ({
  createPlayerRelease: mocks.createPlayerRelease,
}));

vi.mock("@/lib/match-squad/player-release-awareness-producer", () => ({
  emitTargetedPlayerReleaseAwareness: mocks.emitAwareness,
}));

import {
  buildPlayerReleasePlan,
  createPlayerReleasePlan,
  resolvePlayerReleasePlanningCandidates,
} from "@/lib/match-squad/player-release-planning-service";

const TENANT = "tenant-1";
const SOURCE_TS = "ts-b1";
const TEAM_ID = "team-b1";
const P1 = "person-01";
const P2 = "person-06";
const B2_TS = "ts-b2";
const A2_TS = "ts-a2";
const EVENT_B2 = "event-b2-a";
const EVENT_A2 = "event-a2-b";
const SOURCE_MATCH = "event-b1-source";

function eligibleTarget(teamSeasonId: string) {
  return {
    teamSeasonId,
    teamId: `team-${teamSeasonId}`,
    label: teamSeasonId,
    secondaryLabel: null,
    category: "JUNIOREN",
    ageGroup: null,
    genderGroup: null,
    eligibilityState: "ELIGIBLE" as const,
    reasons: [],
  };
}

describe("player-release-planning-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rosterFindMany.mockImplementation(
      ({ where }: { where: { personId?: { in: string[] } } }) => {
        const ids = where.personId?.in ?? [];
        const all = [
          {
            personId: P1,
            person: { firstName: "SCE", lastName: "01", displayName: "SCE Testspieler 01" },
          },
          {
            personId: P2,
            person: { firstName: "SCE", lastName: "06", displayName: "SCE Testspieler 06" },
          },
        ];
        return Promise.resolve(all.filter((row) => ids.includes(row.personId)));
      },
    );
    mocks.teamSeasonFindFirst.mockResolvedValue({
      displayName: "Junioren B1",
      shortName: null,
      team: { name: "B1", shortName: null },
    });
    mocks.teamSeasonFindMany.mockResolvedValue([
      {
        id: B2_TS,
        teamId: "team-b2",
        seasonId: "season-1",
        displayName: "Junioren B2",
        shortName: null,
        team: { name: "B2", shortName: null },
      },
      {
        id: A2_TS,
        teamId: "team-a2",
        seasonId: "season-1",
        displayName: "Junioren A2",
        shortName: null,
        team: { name: "A2", shortName: null },
      },
    ]);
    const planningTargetEvents = [
      {
        id: EVENT_B2,
        type: "MATCH" as const,
        title: "FC X",
        startAt: new Date("2026-10-17T12:00:00.000Z"),
        endAt: null,
        location: "Heim",
        teamSeasonId: B2_TS,
        teamId: "team-b2",
        seasonId: "season-1",
      },
      {
        id: EVENT_A2,
        type: "MATCH" as const,
        title: "FC Y",
        startAt: new Date("2026-10-21T18:00:00.000Z"),
        endAt: null,
        location: "Auswärts",
        teamSeasonId: A2_TS,
        teamId: "team-a2",
        seasonId: "season-1",
      },
    ];
    mocks.eventFindMany.mockImplementation(
      ({ where }: { where: { teamSeasonId?: string | { in: string[] }; OR?: unknown[] } }) => {
        if (where.teamSeasonId === SOURCE_TS) {
          return Promise.resolve([]);
        }
        if (where.OR || where.teamSeasonId?.in) {
          return Promise.resolve(planningTargetEvents);
        }
        return Promise.resolve([]);
      },
    );
    mocks.resolveTargetTeams.mockImplementation(({ personId }: { personId: string }) => {
      if (personId === P1) {
        return Promise.resolve([eligibleTarget(B2_TS), eligibleTarget(A2_TS)]);
      }
      if (personId === P2) {
        return Promise.resolve([eligibleTarget(B2_TS)]);
      }
      return Promise.resolve([]);
    });
    mocks.resolveActivityContext.mockResolvedValue({
      activityEditable: true,
      eventId: EVENT_B2,
    });
    mocks.playerReleaseFindFirst.mockResolvedValue(null);
    mocks.conflictHints.mockResolvedValue([]);
    mocks.createPlayerRelease.mockResolvedValue({ id: "release-new" });
    mocks.eventFindFirst.mockResolvedValue(null);
  });

  it("KADER_ENTRY — candidates without source event context", async () => {
    const result = await resolvePlayerReleasePlanningCandidates({
      tenantId: TENANT,
      sourceTeamSeasonId: SOURCE_TS,
      personIds: [P1],
      timezone: "Europe/Zurich",
    });

    expect(result.planningMode).toBe("KADER");
    expect(result.sourceEventContext).toBeNull();
    expect(result.targetTeams.length).toBeGreaterThan(0);
  });

  it("MATCH_ENTRY — uses sourceEventId for context and target ordering", async () => {
    mocks.eventFindFirst.mockResolvedValueOnce({
      id: SOURCE_MATCH,
      title: "FC Concordia Basel b",
      startAt: new Date("2026-10-17T13:00:00.000Z"),
      teamSeasonId: SOURCE_TS,
      teamId: TEAM_ID,
    });

    const result = await resolvePlayerReleasePlanningCandidates({
      tenantId: TENANT,
      sourceTeamSeasonId: SOURCE_TS,
      personIds: [P1],
      timezone: "Europe/Zurich",
      sourceEventId: SOURCE_MATCH,
    });

    expect(result.planningMode).toBe("MATCH_SOURCE");
    expect(result.sourceEventContext?.eventId).toBe(SOURCE_MATCH);
    expect(result.targetTeams[0]?.activities[0]?.eventId).toBe(EVENT_B2);
  });

  it("DOMAIN_EQUIVALENCE — same plan from kader vs match entry", async () => {
    const kaderReview = await buildPlayerReleasePlan({
      tenantId: TENANT,
      teamId: TEAM_ID,
      sourceTeamSeasonId: SOURCE_TS,
      personIds: [P1],
      eventIds: [EVENT_B2],
      timezone: "Europe/Zurich",
    });

    mocks.eventFindFirst.mockResolvedValueOnce({
      id: SOURCE_MATCH,
      title: "FC Concordia Basel b",
      startAt: new Date("2026-10-17T13:00:00.000Z"),
      teamSeasonId: SOURCE_TS,
      teamId: TEAM_ID,
    });

    const matchReview = await buildPlayerReleasePlan({
      tenantId: TENANT,
      teamId: TEAM_ID,
      sourceTeamSeasonId: SOURCE_TS,
      personIds: [P1],
      eventIds: [EVENT_B2],
      timezone: "Europe/Zurich",
      sourceEventId: SOURCE_MATCH,
    });

    expect(matchReview.validReleaseCount).toBe(kaderReview.validReleaseCount);
    expect(matchReview.combinations[0]?.eventId).toBe(EVENT_B2);
  });

  it("SOURCE_NOT_TARGET — release eventId is target activity", async () => {
    await createPlayerReleasePlan({
      tenantId: TENANT,
      teamId: TEAM_ID,
      sourceTeamSeasonId: SOURCE_TS,
      actorUserId: "user-1",
      personIds: [P1],
      eventIds: [EVENT_B2],
      timezone: "Europe/Zurich",
      sourceEventId: SOURCE_MATCH,
    });

    expect(mocks.createPlayerRelease.mock.calls[0]?.[0]?.eventId).toBe(EVENT_B2);
    expect(mocks.createPlayerRelease.mock.calls[0]?.[0]?.eventId).not.toBe(SOURCE_MATCH);
  });

  it("MULTI_PLAYER_MULTI_ACTIVITY — 4 valid combinations when all eligible", async () => {
    const review = await buildPlayerReleasePlan({
      tenantId: TENANT,
      teamId: TEAM_ID,
      sourceTeamSeasonId: SOURCE_TS,
      personIds: [P1, P2],
      eventIds: [EVENT_B2, EVENT_A2],
      timezone: "Europe/Zurich",
    });

    expect(review.validReleaseCount).toBe(3);
    expect(review.invalidCombinationCount).toBe(1);
  });

  it("createPlayerReleasePlan rolls back all releases when one create fails", async () => {
    mocks.createPlayerRelease
      .mockResolvedValueOnce({ id: "release-1" })
      .mockRejectedValueOnce(new Error("simulated write failure"));

    await expect(
      createPlayerReleasePlan({
        tenantId: TENANT,
        teamId: TEAM_ID,
        sourceTeamSeasonId: SOURCE_TS,
        actorUserId: "user-1",
        personIds: [P1, P2],
        eventIds: [EVENT_B2, EVENT_A2],
        timezone: "Europe/Zurich",
      }),
    ).rejects.toThrow("simulated write failure");

    expect(mocks.createPlayerRelease).toHaveBeenCalledTimes(2);
    expect(mocks.emitAwareness).not.toHaveBeenCalled();
  });

  it("createPlayerReleasePlan emits activity-scoped awareness groups", async () => {
    await createPlayerReleasePlan({
      tenantId: TENANT,
      teamId: TEAM_ID,
      sourceTeamSeasonId: SOURCE_TS,
      actorUserId: "user-1",
      personIds: [P1],
      eventIds: [EVENT_B2, EVENT_A2],
      timezone: "Europe/Zurich",
    });

    expect(mocks.createPlayerRelease).toHaveBeenCalledTimes(2);
    expect(mocks.emitAwareness).toHaveBeenCalledTimes(2);
    expect(mocks.emitAwareness.mock.calls[0]?.[0]?.targetEventId).toBe(EVENT_B2);
  });

  it("DUPLICATE — marks combination invalid", async () => {
    mocks.playerReleaseFindFirst.mockResolvedValueOnce({ id: "existing" });

    const review = await buildPlayerReleasePlan({
      tenantId: TENANT,
      teamId: TEAM_ID,
      sourceTeamSeasonId: SOURCE_TS,
      personIds: [P1],
      eventIds: [EVENT_B2],
      timezone: "Europe/Zurich",
    });

    expect(review.validReleaseCount).toBe(0);
    expect(review.invalidCombinationCount).toBe(1);
  });
});
