import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  playerFindMany: vi.fn(),
  playerSquadMemberFindFirst: vi.fn(),
  personFindFirst: vi.fn(),
  participationResponseFindMany: vi.fn(),
  matchSquadFindUnique: vi.fn(),
  matchSquadCreate: vi.fn(),
  matchSquadMemberFindMany: vi.fn(),
  matchSquadMemberDeleteMany: vi.fn(),
  matchSquadMemberCreateMany: vi.fn(),
  matchSquadUpdateMany: vi.fn(),
  matchSquadUpdate: vi.fn(),
  participationResponseUpdate: vi.fn(),
  participationResponseCreate: vi.fn(),
  participationResponseFindFirst: vi.fn(),
  transaction: vi.fn(),
  logAction: vi.fn(),
  resolveTeamSeasonId: vi.fn(),
  loadTeamSeasonMap: vi.fn(),
  resolveParticipationEventContext: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
    playerSquadMember: {
      findMany: mocks.playerFindMany,
      findFirst: mocks.playerSquadMemberFindFirst,
    },
    person: { findFirst: mocks.personFindFirst },
    participationResponse: {
      findMany: mocks.participationResponseFindMany,
      findFirst: mocks.participationResponseFindFirst,
      create: mocks.participationResponseCreate,
      update: mocks.participationResponseUpdate,
    },
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

vi.mock("@/lib/participation/event-reference", () => ({
  resolveParticipationEventContext: mocks.resolveParticipationEventContext,
}));

vi.mock("@/lib/dashboard/read-model/invalidate", () => ({
  notifyPersonalDashboardDomainMutation: vi.fn(),
}));

import { buildMatchSquadViewModel, setMatchSquadMembers } from "../match-squad-service";
import { respondToParticipation } from "@/lib/participation/participation-service";

const TENANT = "tenant-a";
const EVENT = "event-1";
const TEAM = "team-1";
const TS = "ts-1";

function baseEvent() {
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
  };
}

function roster(personId: string) {
  return {
    personId,
    shirtNumber: 9,
    sortOrder: 1,
    status: "ACTIVE",
    person: { firstName: "Max", lastName: "Muster", displayName: null },
  };
}

function participation(personId: string, status: "OPEN" | "YES" | "NO" | "MAYBE") {
  return { personId, status, note: null };
}

describe("match squad combined availability × selection", () => {
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
    mocks.playerFindMany.mockResolvedValue([roster("p1"), roster("p2"), roster("p3")]);
    mocks.participationResponseFindMany.mockResolvedValue([]);
    mocks.matchSquadFindUnique.mockResolvedValue({
      id: "squad-1",
      updatedAt: new Date("2026-10-10T12:00:00.000Z"),
      teamSeasonId: TS,
    });
    mocks.matchSquadMemberFindMany.mockResolvedValue([]);
    mocks.personFindFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
    }));
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
    mocks.matchSquadUpdateMany.mockResolvedValue({ count: 1 });
    mocks.playerSquadMemberFindFirst.mockResolvedValue({ id: "psm-1" });
    mocks.personFindFirst.mockImplementation(async (args: { where: { id?: string }; select?: { isPlayer?: boolean } }) => {
      if (args.select?.isPlayer) {
        return { id: args.where.id, isPlayer: true };
      }
      return { id: args.where.id };
    });
    mocks.resolveParticipationEventContext.mockResolvedValue({
      eventKind: "MATCH",
      eventId: EVENT,
      trainingSessionId: null,
      teamSeasonId: TS,
    });
  });

  const cases = [
    { id: "p1", participation: "OPEN" as const, selected: false, availability: "UNKNOWN" },
    { id: "p2", participation: "YES" as const, selected: false, availability: "AVAILABLE" },
    { id: "p3", participation: "NO" as const, selected: false, availability: "UNAVAILABLE" },
  ] as const;

  it.each(cases)(
    "$availability + not selected read model",
    async ({ id, participation: partStatus, selected, availability }) => {
      mocks.participationResponseFindMany.mockResolvedValue([participation(id, partStatus)]);
      mocks.matchSquadMemberFindMany.mockResolvedValue([]);

      const view = await buildMatchSquadViewModel(TENANT, EVENT);
      const player = view.remaining.find((row) => row.personId === id);
      expect(player).toBeDefined();
      expect(player?.selected).toBe(selected);
      expect(player?.availability).toBe(availability);
      expect(player?.availabilityConflict).toBe(false);
    },
  );

  it("UNKNOWN + selected", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "OPEN")]);
    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    const player = view.selected[0];
    expect(player.availability).toBe("UNKNOWN");
    expect(player.selected).toBe(true);
    expect(player.availabilityConflict).toBe(false);
  });

  it("AVAILABLE + selected", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "YES")]);
    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    const player = view.selected[0];
    expect(player.availability).toBe("AVAILABLE");
    expect(player.availabilityConflict).toBe(false);
  });

  it("UNAVAILABLE + selected surfaces conflict", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "NO")]);
    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    const player = view.selected[0];
    expect(player.availability).toBe("UNAVAILABLE");
    expect(player.availabilityConflict).toBe(true);
    expect(player.presentationStatus).toBe("UNAVAILABLE");
    expect(player.availabilityLabel).toBe("Nicht verfügbar");
    expect(view.counts.conflicts).toBe(1);
  });

  it("MAYBE + not selected keeps domain UNKNOWN and presentation MAYBE", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "MAYBE")]);
    mocks.matchSquadMemberFindMany.mockResolvedValue([]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    const player = view.remaining.find((row) => row.personId === "p1");
    expect(player?.availability).toBe("UNKNOWN");
    expect(player?.presentationStatus).toBe("MAYBE");
    expect(player?.availabilityLabel).toBe("Unsicher");
    expect(player?.availabilityConflict).toBe(false);
    expect(player?.canSelect).toBe(true);
  });

  it("MAYBE + selected is not a hard unavailable conflict", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "MAYBE")]);
    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);

    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    const player = view.selected[0];
    expect(player.availability).toBe("UNKNOWN");
    expect(player.presentationStatus).toBe("MAYBE");
    expect(player.availabilityLabel).toBe("Unsicher");
    expect(player.availabilityConflict).toBe(false);
    expect(view.counts.conflicts).toBe(0);
    expect(view.counts.selectedMaybe).toBe(1);
  });

  it("availability YES does not create MatchSquadMember", async () => {
    mocks.participationResponseFindFirst.mockResolvedValue(null);
    mocks.participationResponseCreate.mockResolvedValue({ id: "pr-1", status: "YES" });
    mocks.playerFindMany.mockResolvedValue([roster("p1")]);

    await respondToParticipation(TENANT, "user-1", {
      personId: "p1",
      teamSeasonId: TS,
      event: { eventKind: "MATCH", eventId: EVENT },
      status: "YES",
      responseSource: "PLAYER",
    });

    expect(mocks.matchSquadMemberCreateMany).not.toHaveBeenCalled();
  });

  it("availability NO does not delete MatchSquadMember", async () => {
    mocks.participationResponseFindFirst.mockResolvedValue({
      id: "pr-1",
      status: "YES",
      note: null,
    });
    mocks.participationResponseUpdate.mockResolvedValue({ id: "pr-1", status: "NO" });
    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);

    await respondToParticipation(TENANT, "user-1", {
      personId: "p1",
      teamSeasonId: TS,
      event: { eventKind: "MATCH", eventId: EVENT },
      status: "NO",
      responseSource: "PLAYER",
    });

    expect(mocks.matchSquadMemberDeleteMany).not.toHaveBeenCalled();
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "NO")]);
    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(view.selectedPersonIds).toEqual(["p1"]);
    expect(view.selected[0]?.availabilityConflict).toBe(true);
  });

  it("trainer select does not fabricate ParticipationResponse", async () => {
    mocks.matchSquadMemberFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ personId: "p1" }]);

    await setMatchSquadMembers({
      tenantId: TENANT,
      eventId: EVENT,
      actorUserId: "trainer-1",
      desiredPersonIds: ["p1"],
    });

    expect(mocks.participationResponseCreate).not.toHaveBeenCalled();
    expect(mocks.participationResponseUpdate).not.toHaveBeenCalled();

    mocks.matchSquadMemberFindMany.mockResolvedValue([{ personId: "p1" }]);
    mocks.participationResponseFindMany.mockResolvedValue([]);
    const after = await buildMatchSquadViewModel(TENANT, EVENT);
    expect(after.selected[0]?.availability).toBe("UNKNOWN");
  });

  it("trainer remove does not change availability", async () => {
    mocks.participationResponseFindMany.mockResolvedValue([participation("p1", "YES")]);
    mocks.matchSquadMemberFindMany
      .mockResolvedValueOnce([{ id: "m1", personId: "p1" }])
      .mockResolvedValueOnce([{ id: "m1", personId: "p1" }])
      .mockResolvedValueOnce([]);

    await setMatchSquadMembers({
      tenantId: TENANT,
      eventId: EVENT,
      actorUserId: "trainer-1",
      desiredPersonIds: [],
    });

    expect(mocks.participationResponseUpdate).not.toHaveBeenCalled();
    mocks.matchSquadMemberFindMany.mockResolvedValue([]);
    const view = await buildMatchSquadViewModel(TENANT, EVENT);
    const remaining = view.remaining.find((row) => row.personId === "p1");
    expect(remaining?.availability).toBe("AVAILABLE");
    expect(remaining?.selected).toBe(false);
  });
});
