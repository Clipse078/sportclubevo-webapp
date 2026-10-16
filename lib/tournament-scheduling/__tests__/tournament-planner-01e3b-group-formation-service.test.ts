/**
 * SCE-TOURNAMENT-PLANNER-01E3B — group formation + fixture persistence (mocked Prisma).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
    tournamentParticipant: { findFirst: vi.fn(), findMany: vi.fn() },
    tournamentFixture: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    tournamentPhase: { findFirst: vi.fn(), findMany: vi.fn() },
    tournamentGroup: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    tournamentGroupMembership: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    tournamentCompetitionConfiguration: { findFirst: vi.fn() },
    tournamentFixtureSide: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  formTournamentGroups,
  formTournamentGroupsAndGenerateGroupFixtures,
  generateTournamentGroupFixturesForPhase,
} from "../group-formation";
import {
  TournamentCompetitionConflictError,
  TournamentCompetitionValidationError,
  TournamentFormatUnsupportedError,
} from "../errors";

const TENANT = "tenant-a";
const TOURNAMENT = "tournament-01";
const PHASE = "phase-group";

function mockOrganiserTournament() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
    organizerName: "FC Allschwil",
  } as never);
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ name: "FC Allschwil" } as never);
}

function mockGroupMixPhase(strategy: "ROUND_ROBIN" | "SMART_MIX" = "ROUND_ROBIN") {
  vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
    id: "cfg",
    eventId: TOURNAMENT,
    competitionFormat: "GROUP_MIX_ONLY",
  } as never);
  vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
    id: PHASE,
    eventId: TOURNAMENT,
    displayOrder: 1,
    phaseType: "GROUP_MIX",
    label: "Gruppen",
    stageKey: "MAIN",
    groupMixStrategy: strategy,
    smartMixTargetMatchesPerParticipant: strategy === "SMART_MIX" ? 2 : null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrganiserTournament();
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
  vi.mocked(prisma.tournamentFixture.count).mockResolvedValue(0);
  vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([]);
});

describe("01E3B — format validation", () => {
  it("rejects KNOCKOUT_ONLY", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      competitionFormat: "KNOCKOUT_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE,
      phaseType: "KNOCKOUT",
      stageKey: "MAIN",
    } as never);

    await expect(
      formTournamentGroups(TENANT, {
        tournamentId: TOURNAMENT,
        phaseId: PHASE,
        participantIds: ["p1", "p2"],
        groupCount: 1,
      }),
    ).rejects.toBeInstanceOf(TournamentFormatUnsupportedError);
  });
});

describe("01E3B — participant validation", () => {
  it("rejects duplicate participant ids", async () => {
    mockGroupMixPhase();
    await expect(
      formTournamentGroups(TENANT, {
        tournamentId: TOURNAMENT,
        phaseId: PHASE,
        participantIds: ["p1", "p1"],
        groupCount: 1,
      }),
    ).rejects.toBeInstanceOf(TournamentCompetitionValidationError);
  });
});

describe("01E3B — persistence + idempotency", () => {
  it("creates groups and memberships", async () => {
    mockGroupMixPhase();
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "p1", displayOrder: 0 },
      { id: "p2", displayOrder: 1 },
      { id: "p3", displayOrder: 2 },
      { id: "p4", displayOrder: 3 },
    ] as never);
    vi.mocked(prisma.tournamentGroup.findMany).mockResolvedValue([]);
    let groupCounter = 0;
    vi.mocked(prisma.tournamentGroup.create).mockImplementation(async (args) => {
      groupCounter += 1;
      const data = (args as { data: { label: string; displayOrder: number } }).data;
      return {
        id: `group-${groupCounter}`,
        eventId: TOURNAMENT,
        tournamentPhaseId: PHASE,
        ...data,
      } as never;
    });
    vi.mocked(prisma.tournamentGroupMembership.create).mockImplementation(async (args) => {
      const data = (args as { data: { tournamentGroupId: string; tournamentParticipantId: string } })
        .data;
      return { id: `m-${data.tournamentParticipantId}`, eventId: TOURNAMENT, ...data } as never;
    });
    vi.mocked(prisma.tournamentGroupMembership.findMany).mockResolvedValue([
      {
        id: "m1",
        eventId: TOURNAMENT,
        tournamentGroupId: "group-1",
        tournamentParticipantId: "p1",
      },
      {
        id: "m2",
        eventId: TOURNAMENT,
        tournamentGroupId: "group-1",
        tournamentParticipantId: "p2",
      },
      {
        id: "m3",
        eventId: TOURNAMENT,
        tournamentGroupId: "group-2",
        tournamentParticipantId: "p3",
      },
      {
        id: "m4",
        eventId: TOURNAMENT,
        tournamentGroupId: "group-2",
        tournamentParticipantId: "p4",
      },
    ] as never);

    const result = await formTournamentGroups(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE,
      participantIds: ["p1", "p2", "p3", "p4"],
      groupCount: 2,
    });

    expect(result.groups).toHaveLength(2);
    expect(result.diagnostics.maxGroupSize - result.diagnostics.minGroupSize).toBeLessThanOrEqual(1);
    expect(prisma.tournamentGroup.create).toHaveBeenCalledTimes(2);
  });
});

describe("01E3B — group fixture generation", () => {
  it("persists group-scoped round robin fixtures", async () => {
    mockGroupMixPhase("ROUND_ROBIN");
    vi.mocked(prisma.tournamentGroup.findMany).mockResolvedValue([
      {
        id: "g1",
        displayOrder: 1,
        memberships: [{ tournamentParticipantId: "p1" }, { tournamentParticipantId: "p2" }],
      },
      {
        id: "g2",
        displayOrder: 2,
        memberships: [{ tournamentParticipantId: "p3" }, { tournamentParticipantId: "p4" }],
      },
    ] as never);
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "p1", displayOrder: 0 },
      { id: "p2", displayOrder: 1 },
      { id: "p3", displayOrder: 2 },
      { id: "p4", displayOrder: 3 },
    ] as never);
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: `fx-${data.generatorKey}`, eventId: TOURNAMENT, ...data } as never;
    });

    const result = await generateTournamentGroupFixturesForPhase(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE,
    });

    expect(result.fixtures.length).toBe(2);
    expect(result.fixtures.every((f) => f.tournamentGroupId)).toBe(true);
    expect(result.diagnostics.fixtureCountByGroup.g1).toBe(1);
  });
});

describe("01E3B — drift/conflict", () => {
  it("rejects topology drift when groups already differ", async () => {
    mockGroupMixPhase();
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "p1", displayOrder: 0 },
      { id: "p2", displayOrder: 1 },
    ] as never);
    vi.mocked(prisma.tournamentGroup.findMany).mockResolvedValue([
      {
        id: "g1",
        displayOrder: 1,
        label: "Gruppe A",
        memberships: [{ tournamentParticipantId: "p2" }],
      },
    ] as never);

    await expect(
      formTournamentGroups(TENANT, {
        tournamentId: TOURNAMENT,
        phaseId: PHASE,
        participantIds: ["p1", "p2"],
        groupCount: 1,
      }),
    ).rejects.toBeInstanceOf(TournamentCompetitionConflictError);
  });
});

describe("01E3B — duplicate source team participants", () => {
  it("keeps two participants that share source team identity separate", async () => {
    mockGroupMixPhase();
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "tp-rot", displayOrder: 0 },
      { id: "tp-blau", displayOrder: 1 },
      { id: "p3", displayOrder: 2 },
      { id: "p4", displayOrder: 3 },
    ] as never);
    vi.mocked(prisma.tournamentGroup.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tournamentGroup.create).mockImplementation(async (args) => {
      const data = (args as { data: { displayOrder: number; label: string } }).data;
      return {
        id: `g-${data.displayOrder}`,
        eventId: TOURNAMENT,
        tournamentPhaseId: PHASE,
        ...data,
      } as never;
    });
    vi.mocked(prisma.tournamentGroupMembership.create).mockResolvedValue({} as never);
    vi.mocked(prisma.tournamentGroupMembership.findMany).mockResolvedValue([
      { id: "1", eventId: TOURNAMENT, tournamentGroupId: "g-1", tournamentParticipantId: "tp-rot" },
      { id: "2", eventId: TOURNAMENT, tournamentGroupId: "g-2", tournamentParticipantId: "tp-blau" },
    ] as never);

    const result = await formTournamentGroups(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE,
      participantIds: ["tp-rot", "tp-blau", "p3", "p4"],
      groupCount: 2,
    });

    expect(result.memberships.map((m) => m.tournamentParticipantId).sort()).toEqual([
      "tp-blau",
      "tp-rot",
    ]);
  });
});

describe("01E3B — manual move guard", () => {
  it("documents move guard via competition structure (fixtures block moves)", async () => {
    const { moveParticipantBetweenTournamentGroups } = await import("../competition-structure");
    vi.mocked(prisma.tournamentFixture.count).mockResolvedValue(1);
    await expect(
      moveParticipantBetweenTournamentGroups(TENANT, TOURNAMENT, "g1", "g2", "p1"),
    ).rejects.toBeInstanceOf(TournamentCompetitionConflictError);
  });
});

describe("01E3B — combined command", () => {
  it("forms groups then generates fixtures", async () => {
    mockGroupMixPhase("ROUND_ROBIN");
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "p1", displayOrder: 0 },
      { id: "p2", displayOrder: 1 },
    ] as never);
    vi.mocked(prisma.tournamentGroup.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: "g1",
          displayOrder: 1,
          memberships: [{ tournamentParticipantId: "p1" }, { tournamentParticipantId: "p2" }],
        },
      ] as never);
    vi.mocked(prisma.tournamentGroup.create).mockResolvedValue({
      id: "g1",
      eventId: TOURNAMENT,
      tournamentPhaseId: PHASE,
      displayOrder: 1,
      label: "Gruppe A",
    } as never);
    vi.mocked(prisma.tournamentGroupMembership.create).mockResolvedValue({} as never);
    vi.mocked(prisma.tournamentGroupMembership.findMany).mockResolvedValue([
      { id: "m1", eventId: TOURNAMENT, tournamentGroupId: "g1", tournamentParticipantId: "p1" },
      { id: "m2", eventId: TOURNAMENT, tournamentGroupId: "g1", tournamentParticipantId: "p2" },
    ] as never);
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: "fx1", eventId: TOURNAMENT, ...data } as never;
    });

    const result = await formTournamentGroupsAndGenerateGroupFixtures(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE,
      participantIds: ["p1", "p2"],
      groupCount: 1,
    });

    expect(result.formation.groups).toHaveLength(1);
    expect(result.fixtures.fixtures).toHaveLength(1);
  });
});
