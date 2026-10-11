import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  playerFindMany: vi.fn(),
  personFindFirst: vi.fn(),
  participationResponseFindMany: vi.fn(),
  matchSquadFindUnique: vi.fn(),
  matchSquadMemberFindMany: vi.fn(),
  playerReleaseRequestFindMany: vi.fn(),
  matchSquadMemberDeleteMany: vi.fn(),
  matchSquadUpdate: vi.fn(),
  transaction: vi.fn(),
  logAction: vi.fn(),
  loadTeamSeasonMap: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
    playerSquadMember: { findMany: mocks.playerFindMany },
    person: { findFirst: mocks.personFindFirst },
    participationResponse: {
      findMany: mocks.participationResponseFindMany,
      findFirst: vi.fn().mockResolvedValue(null),
    },
    matchSquad: {
      findUnique: mocks.matchSquadFindUnique,
      update: mocks.matchSquadUpdate,
    },
    matchSquadMember: {
      findMany: mocks.matchSquadMemberFindMany,
      deleteMany: mocks.matchSquadMemberDeleteMany,
    },
    playerReleaseRequest: { findMany: mocks.playerReleaseRequestFindMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/weekplanner/match-team-season-resolution", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/weekplanner/match-team-season-resolution")
  >();
  return {
    ...actual,
    loadTeamSeasonIdByTeamAndSeasonForMatches: mocks.loadTeamSeasonMap,
  };
});

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

vi.mock("@/lib/match-squad/person-activity-conflict-hints", () => ({
  loadPersonActivityConflictHints: vi.fn().mockResolvedValue([]),
}));

import {
  buildMatchSquadViewModel,
  setMatchSquadMembers,
} from "../match-squad-service";

const TENANT = "tenant-a";
const EVENT = "event-b2";
const TS_B2 = "ts-b2";

function baseEvent() {
  return {
    id: EVENT,
    tenantId: TENANT,
    teamId: "team-b2",
    teamSeasonId: TS_B2,
    seasonId: "season-1",
    status: "SCHEDULED",
    title: "Junioren B2 vs Old Boys",
    homeAway: "HOME",
    team: { id: "team-b2", name: "Junioren B2" },
    matchExternalMapping: null,
  };
}

const externalSelectedMember = {
  personId: "person-ext-1",
  playerReleaseRequestId: "req-1",
  playerReleaseRequest: {
    id: "req-1",
    sourceTeamSeasonId: "ts-b1",
    sourceTeamSeason: {
      displayName: "FC Allschwil Junioren B1",
      shortName: null,
      team: { name: "B1", shortName: null },
    },
    playerRelease: {
      status: "ACTIVE",
      revokedAt: null,
      scope: "ACTIVITY",
      eventId: EVENT,
      trainingSessionId: null,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: new Date("2027-01-01T00:00:00.000Z"),
      targetTeamSeasonId: TS_B2,
      sourceTeamSeasonId: "ts-b1",
    },
    targetEvent: { startAt: new Date("2026-10-18T13:00:00.000Z"), type: "MATCH" },
  },
};

const approvedCandidateRequest = {
  id: "req-1",
  tenantId: TENANT,
  status: "APPROVED" as const,
  personId: "person-ext-1",
  playerReleaseId: "rel-1",
  sourceTeamSeasonId: "ts-b1",
  targetTeamSeasonId: TS_B2,
  targetEventId: EVENT,
  updatedAt: new Date("2026-10-10T12:00:00.000Z"),
  person: { id: "person-ext-1", firstName: "SCE", lastName: "Testspieler 01", displayName: null },
  sourceTeamSeason: externalSelectedMember.playerReleaseRequest.sourceTeamSeason,
  targetTeamSeason: {
    id: TS_B2,
    displayName: "Junioren B2",
    shortName: null,
    team: { name: "B2", shortName: null },
  },
  targetEvent: {
    id: EVENT,
    title: "Test",
    startAt: new Date("2026-10-18T13:00:00.000Z"),
    endAt: null,
    type: "MATCH" as const,
    status: "SCHEDULED",
  },
  playerRelease: externalSelectedMember.playerReleaseRequest.playerRelease,
  assignmentMatchSquadMember: null,
};

describe("01E-R2 approved external assignment lifecycle", () => {
  let squadHasExternalAssignment = true;

  beforeEach(() => {
    vi.clearAllMocks();
    squadHasExternalAssignment = true;
    mocks.eventFindFirst.mockResolvedValue(baseEvent());
    mocks.teamSeasonFindFirst.mockResolvedValue({
      id: TS_B2,
      status: "ACTIVE",
      displayName: "Junioren B2",
      teamId: "team-b2",
    });
    mocks.loadTeamSeasonMap.mockResolvedValue(new Map());
    mocks.playerFindMany.mockResolvedValue([]);
    mocks.participationResponseFindMany.mockResolvedValue([]);
    mocks.matchSquadFindUnique.mockResolvedValue({
      id: "squad-b2",
      updatedAt: new Date("2026-10-11T12:00:00.000Z"),
      teamSeasonId: TS_B2,
    });
    mocks.personFindFirst.mockResolvedValue({
      id: "person-ext-1",
      firstName: "SCE",
      lastName: "Testspieler 01",
      displayName: null,
    });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        matchSquad: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: mocks.matchSquadUpdate },
        matchSquadMember: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "member-1",
              personId: "person-ext-1",
              playerReleaseRequestId: "req-1",
            },
          ]),
          deleteMany: mocks.matchSquadMemberDeleteMany,
          createMany: vi.fn(),
        },
      }),
    );
    mocks.matchSquadMemberFindMany.mockImplementation(async () =>
      squadHasExternalAssignment ? [externalSelectedMember] : [],
    );
    mocks.matchSquadMemberDeleteMany.mockImplementation(async () => {
      squadHasExternalAssignment = false;
      return { count: 1 };
    });
  });

  it("assigned external player is aufgeboten only — not in remaining, Kader stays structural", async () => {
    mocks.playerReleaseRequestFindMany.mockResolvedValue([]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);

    expect(view.remainingPersonIds).toEqual([]);
    expect(view.selectedPersonIds).toEqual(["person-ext-1"]);
    expect(view.selected[0]?.externalRelease?.sourceTeamLabel).toContain("Junioren B1");
    expect(view.counts.rosterTotal).toBe(0);
    expect(view.counts.selected).toBe(1);
    expect(view.approvedReleaseCandidates).toEqual([]);
  });

  it("after unassign, player returns to Genehmigte Freigaben and not Weitere Kaderspieler", async () => {
    mocks.playerReleaseRequestFindMany.mockImplementation(async () =>
      squadHasExternalAssignment ? [] : [approvedCandidateRequest],
    );

    const assigned = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(assigned.approvedReleaseCandidates).toHaveLength(0);

    await setMatchSquadMembers({
      tenantId: TENANT,
      eventId: EVENT,
      actorUserId: "user-1",
      desiredPersonIds: [],
    });

    expect(mocks.matchSquadMemberDeleteMany).toHaveBeenCalled();

    const afterRemove = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(afterRemove.selectedPersonIds).toEqual([]);
    expect(afterRemove.remainingPersonIds).toEqual([]);
    expect(afterRemove.approvedReleaseCandidates).toHaveLength(1);
    expect(afterRemove.approvedReleaseCandidates[0]?.personId).toBe("person-ext-1");
    expect(afterRemove.approvedReleaseCandidates[0]?.canAssign).toBe(true);
  });
});
