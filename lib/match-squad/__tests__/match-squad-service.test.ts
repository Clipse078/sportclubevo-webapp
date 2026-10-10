import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  playerFindMany: vi.fn(),
  personFindFirst: vi.fn(),
  participationResponseFindMany: vi.fn(),
  matchSquadFindUnique: vi.fn(),
  matchSquadCreate: vi.fn(),
  matchSquadMemberFindMany: vi.fn(),
  matchSquadMemberDeleteMany: vi.fn(),
  matchSquadMemberCreateMany: vi.fn(),
  matchSquadUpdateMany: vi.fn(),
  matchSquadUpdate: vi.fn(),
  transaction: vi.fn(),
  logAction: vi.fn(),
  resolveTeamSeasonId: vi.fn(),
  loadTeamSeasonMap: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
    playerSquadMember: { findMany: mocks.playerFindMany },
    person: { findFirst: mocks.personFindFirst },
    participationResponse: { findMany: mocks.participationResponseFindMany },
    matchSquad: {
      findUnique: mocks.matchSquadFindUnique,
      create: mocks.matchSquadCreate,
      updateMany: mocks.matchSquadUpdateMany,
      update: mocks.matchSquadUpdate,
    },
    matchSquadMember: {
      findMany: mocks.matchSquadMemberFindMany,
      deleteMany: mocks.matchSquadMemberDeleteMany,
      createMany: mocks.matchSquadMemberCreateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/planning/resolve-team-season-id", () => ({
  resolveTeamSeasonIdForTeamAndSeason: mocks.resolveTeamSeasonId,
}));

vi.mock("@/lib/weekplanner/match-team-season-resolution", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/weekplanner/match-team-season-resolution")>();
  return {
    ...actual,
    loadTeamSeasonIdByTeamAndSeasonForMatches: mocks.loadTeamSeasonMap,
  };
});

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

import {
  buildMatchSquadViewModel,
  remainingRosterIsNotCrossTeamAvailability,
  setMatchSquadMembers,
} from "../match-squad-service";
import { MatchSquadConflictError, MatchSquadValidationError } from "../errors";

const TENANT = "tenant-a";
const EVENT = "event-1";
const TEAM = "team-1";
const TS = "ts-1";

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT,
    tenantId: TENANT,
    teamId: TEAM,
    teamSeasonId: TS,
    seasonId: "season-1",
    status: "SCHEDULED",
    title: "Testspiel",
    homeAway: "HOME",
    team: { id: TEAM, name: "Team A" },
    matchExternalMapping: null,
    ...overrides,
  };
}

function roster(personId: string) {
  return {
    personId,
    shirtNumber: 9,
    sortOrder: 1,
    status: "ACTIVE" as const,
    person: { firstName: "Max", lastName: "Muster", displayName: null },
  };
}

describe("match-squad-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindFirst.mockResolvedValue(baseEvent());
    mocks.teamSeasonFindFirst.mockResolvedValue({
      id: TS,
      status: "ACTIVE",
      displayName: "Team A 26/27",
      teamId: TEAM,
    });
    mocks.loadTeamSeasonMap.mockResolvedValue(new Map());
    mocks.playerFindMany.mockResolvedValue([roster("p1"), roster("p2")]);
    mocks.matchSquadFindUnique.mockResolvedValue(null);
    mocks.matchSquadMemberFindMany.mockResolvedValue([]);
    mocks.participationResponseFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        matchSquad: {
          updateMany: mocks.matchSquadUpdateMany,
          update: mocks.matchSquadUpdate,
        },
        matchSquadMember: {
          findMany: mocks.matchSquadMemberFindMany,
          deleteMany: mocks.matchSquadMemberDeleteMany,
          createMany: mocks.matchSquadMemberCreateMany,
        },
      }),
    );
    mocks.matchSquadCreate.mockResolvedValue({
      id: "squad-1",
      updatedAt: new Date("2026-10-10T12:00:00.000Z"),
      teamSeasonId: TS,
    });
    mocks.matchSquadUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("remainingRosterIsNotCrossTeamAvailability documents 01A invariant", () => {
    expect(remainingRosterIsNotCrossTeamAvailability()).toBe(true);
  });

  it("buildMatchSquadViewModel without MatchSquad row returns empty selection", async () => {
    mocks.matchSquadFindUnique.mockResolvedValue(null);
    mocks.matchSquadMemberFindMany.mockResolvedValue([]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(view.selected).toEqual([]);
    expect(view.selectedPersonIds).toEqual([]);
    expect(view.version).toBe("1970-01-01T00:00:00.000Z");
    expect(mocks.matchSquadCreate).not.toHaveBeenCalled();
  });

  it("buildMatchSquadViewModel maps missing ParticipationResponse to UNKNOWN", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(view.remaining.every((row) => row.availability === "UNKNOWN")).toBe(true);
    expect(view.remaining.every((row) => row.presentationStatus === "OPEN")).toBe(true);
    expect(view.remaining.every((row) => row.availabilityLabel === "Offen")).toBe(true);
  });

  it("buildMatchSquadViewModel counts split maybe and open", async () => {
    mocks.playerFindMany.mockResolvedValue([
      roster("p1"),
      roster("p2"),
      roster("p3"),
      roster("p4"),
    ]);
    mocks.participationResponseFindMany.mockResolvedValue([
      { personId: "p1", status: "YES", note: null },
      { personId: "p2", status: "NO", note: null },
      { personId: "p3", status: "MAYBE", note: null },
    ]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(view.counts).toMatchObject({
      rosterTotal: 4,
      available: 1,
      unavailable: 1,
      maybe: 1,
      open: 1,
    });
    expect(
      view.counts.available +
        view.counts.unavailable +
        view.counts.maybe +
        view.counts.open,
    ).toBe(view.counts.rosterTotal);
  });

  it("buildMatchSquadViewModel splits ACTIVE roster into selected and remaining", async () => {
    mocks.matchSquadFindUnique.mockResolvedValue({
      id: "squad-1",
      updatedAt: new Date("2026-10-10T12:00:00.000Z"),
      teamSeasonId: TS,
    });
    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(view.selectedPersonIds).toEqual(["p1"]);
    expect(view.remainingPersonIds).toEqual(["p2"]);
  });

  it("setMatchSquadMembers rejects person not on ACTIVE roster", async () => {
    mocks.personFindFirst.mockResolvedValue({ id: "foreign" });
    await expect(
      setMatchSquadMembers({
        tenantId: TENANT,
        eventId: EVENT,
        actorUserId: "user-1",
        desiredPersonIds: ["foreign"],
      }),
    ).rejects.toBeInstanceOf(MatchSquadValidationError);
  });

  it("setMatchSquadMembers rejects duplicate ids cleanly via unique desired list", async () => {
    mocks.personFindFirst.mockResolvedValue({ id: "p1" });
    mocks.matchSquadFindUnique.mockResolvedValue({
      id: "squad-1",
      updatedAt: new Date("2026-10-10T12:00:00.000Z"),
      teamSeasonId: TS,
    });
    mocks.matchSquadMemberFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ personId: "p1" }]);

    const view = await setMatchSquadMembers({
      tenantId: TENANT,
      eventId: EVENT,
      actorUserId: "user-1",
      desiredPersonIds: ["p1", "p1"],
    });
    expect(view.selectedPersonIds).toEqual(["p1"]);
    expect(mocks.matchSquadMemberCreateMany).toHaveBeenCalledWith({
      data: [{ matchSquadId: "squad-1", personId: "p1" }],
    });
  });

  it("setMatchSquadMembers returns conflict when expectedVersion is stale", async () => {
    mocks.personFindFirst.mockResolvedValue({ id: "p1" });
    mocks.matchSquadFindUnique.mockResolvedValue({
      id: "squad-1",
      updatedAt: new Date("2026-10-10T12:00:00.000Z"),
      teamSeasonId: TS,
    });
    mocks.matchSquadMemberFindMany.mockResolvedValue([]);
    mocks.matchSquadUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      setMatchSquadMembers({
        tenantId: TENANT,
        eventId: EVENT,
        actorUserId: "user-1",
        desiredPersonIds: ["p1"],
        expectedVersion: "2026-10-10T11:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(MatchSquadConflictError);
  });

  it("cancelled match is read-only", async () => {
    mocks.eventFindFirst.mockResolvedValue(baseEvent({ status: "CANCELLED" }));
    await expect(
      setMatchSquadMembers({
        tenantId: TENANT,
        eventId: EVENT,
        actorUserId: "user-1",
        desiredPersonIds: ["p1"],
      }),
    ).rejects.toMatchObject({ code: "READ_ONLY" });
  });
});
