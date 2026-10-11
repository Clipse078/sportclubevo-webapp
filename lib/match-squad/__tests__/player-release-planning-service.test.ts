import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rosterFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  eventFindMany: vi.fn(),
  playerReleaseFindFirst: vi.fn(),
  resolveTargetTeams: vi.fn(),
  resolveActivityContext: vi.fn(),
  conflictHints: vi.fn(),
  createPlayerRelease: vi.fn(),
  emitAwareness: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: mocks.rosterFindMany },
    teamSeason: {
      findMany: mocks.teamSeasonFindMany,
      findFirst: mocks.teamSeasonFindFirst,
    },
    event: { findMany: mocks.eventFindMany },
    playerRelease: { findFirst: mocks.playerReleaseFindFirst },
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
        displayName: "Junioren B2",
        shortName: null,
        team: { name: "B2", shortName: null },
      },
      {
        id: A2_TS,
        teamId: "team-a2",
        displayName: "Junioren A2",
        shortName: null,
        team: { name: "A2", shortName: null },
      },
    ]);
    mocks.eventFindMany.mockImplementation(({ where }: { where: { teamSeasonId?: { in: string[] } } }) => {
      if (where.teamSeasonId?.in) {
        return Promise.resolve([
          {
            id: EVENT_B2,
            type: "MATCH",
            title: "FC X",
            startAt: new Date("2026-10-17T12:00:00.000Z"),
            endAt: null,
            location: "Heim",
            teamSeasonId: B2_TS,
            teamId: "team-b2",
          },
          {
            id: EVENT_A2,
            type: "MATCH",
            title: "FC Y",
            startAt: new Date("2026-10-21T18:00:00.000Z"),
            endAt: null,
            location: "Auswärts",
            teamSeasonId: A2_TS,
            teamId: "team-a2",
          },
        ]);
      }
      return Promise.resolve([]);
    });
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
