/**
 * SCE-TOURNAMENT-PLANNER-01C — round-robin generation service (mocked Prisma).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
    tournamentParticipant: { findMany: vi.fn() },
    tournamentFixture: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    tournamentPhase: { findFirst: vi.fn(), create: vi.fn() },
    tournamentCompetitionConfiguration: { findFirst: vi.fn(), create: vi.fn() },
    tournamentFixtureSide: { createMany: vi.fn() },
    tournamentScheduleVersion: { findMany: vi.fn() },
    tournamentFixtureAssignment: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import { generateTournamentRoundRobinFixtures } from "../fixture-generation-service";
import { mockLegacyGroupMixPhaseBootstrap } from "./helpers/mock-legacy-phase-persistence";
import { generateRoundRobinFixtures, canonicalizeParticipantIds } from "../fixtures";
import {
  TournamentFixturesAlreadyExistError,
  TournamentFixtureSetConflictError,
  TournamentParticipantsInsufficientError,
  TournamentFormatUnsupportedError,
  TournamentPlannerNotOwnedByTenantError,
} from "../errors";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TOURNAMENT_ID = "tournament-01";

function mockTournament(
  tenantId: string = TENANT_A,
  homeAway: "HOME" | "AWAY" | null = "HOME",
  organizerName: string | null = null,
) {
  vi.mocked(prisma.event.findFirst).mockImplementation(async (args) => {
    const where = (args as { where: { id: string; tenantId: string; type: string } }).where;
    if (where.id === TOURNAMENT_ID && where.tenantId === tenantId && where.type === "TOURNAMENT") {
      return { id: TOURNAMENT_ID, homeAway, organizerName } as never;
    }
    return null;
  });
}

function mockTenantName(name: string = "FC Allschwil") {
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ name } as never);
}

function mockParticipants(participantIds: string[], tenantId: string = TENANT_A) {
  vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue(
    participantIds.map((id, displayOrder) => ({ id, displayOrder })) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTenantName();
  mockLegacyGroupMixPhaseBootstrap(TOURNAMENT_ID);
  vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tournamentScheduleVersion.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tournamentFixtureAssignment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
});

describe("generateTournamentRoundRobinFixtures", () => {
  it("generates and persists fixtures for a valid tournament", async () => {
    mockTournament();
    const participantIds = ["p1", "p2", "p3", "p4"];
    mockParticipants(participantIds);

    const expected = generateRoundRobinFixtures({ participantIds: canonicalizeParticipantIds(
      participantIds.map((id, displayOrder) => ({ id, displayOrder })),
    ) });

    let createCount = 0;
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: Record<string, unknown> }).data;
      createCount += 1;
      return {
        id: `fixture-${createCount}`,
        eventId: TOURNAMENT_ID,
        ...data,
      } as never;
    });

    const result = await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    expect(createCount).toBe(expected.length);
    expect(result).toHaveLength(expected.length);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when identical fixtures already exist", async () => {
    mockTournament();
    const participantIds = ["p1", "p2", "p3"];
    mockParticipants(participantIds);

    const generated = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
    });

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue(
      generated.map((g, index) => ({
        id: `existing-${index}`,
        eventId: TOURNAMENT_ID,
        ...g,
      })) as never,
    );

    const result = await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    expect(prisma.tournamentFixture.create).not.toHaveBeenCalled();
    expect(result).toHaveLength(generated.length);
  });

  it("rejects conflicting existing fixtures", async () => {
    mockTournament();
    mockParticipants(["p1", "p2", "p3"]);

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([
      {
        id: "wrong-1",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        generatorKey: null,
        sideAParticipantId: "p1",
        sideBParticipantId: "p3",
      },
      {
        id: "wrong-2",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        generatorKey: null,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        id: "wrong-3",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 2,
        slotIndexInRound: 0,
        generatorKey: null,
        sideAParticipantId: "p2",
        sideBParticipantId: "p3",
      },
    ] as never);

    await expect(generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID)).rejects.toBeInstanceOf(
      TournamentFixturesAlreadyExistError,
    );
  });

  it("rejects when participants changed after generation", async () => {
    mockTournament();
    mockParticipants(["p1", "p2", "p3"]);

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([
      {
        id: "f1",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        generatorKey: "k",
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        id: "f2",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 1,
        generatorKey: "k2",
        sideAParticipantId: "p3",
        sideBParticipantId: "p4-removed",
      },
    ] as never);

    await expect(generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID)).rejects.toBeInstanceOf(
      TournamentFixtureSetConflictError,
    );
  });

  it("rejects insufficient participants", async () => {
    mockTournament();
    mockParticipants(["only-one"]);
    await expect(generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID)).rejects.toBeInstanceOf(
      TournamentParticipantsInsufficientError,
    );
  });

  it("allows more than 16 participants when within technical fixture limit", async () => {
    mockTournament();
    mockParticipants(Array.from({ length: 17 }, (_, i) => `p${i}`));
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: "f", eventId: TOURNAMENT_ID, ...data } as never;
    });
    const result = await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    expect(result).toHaveLength((17 * 16) / 2);
  });

  it("rejects away / externally-organised tournaments before any writes", async () => {
    mockTournament(TENANT_A, "AWAY");
    mockParticipants(["p1", "p2", "p3"]);
    await expect(generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID)).rejects.toBeInstanceOf(
      TournamentPlannerNotOwnedByTenantError,
    );
    expect(prisma.tournamentFixture.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.tournamentParticipant.findMany).not.toHaveBeenCalled();
  });

  it("rejects unknown ownership (null homeAway, no organiser proof) before any writes", async () => {
    mockTournament(TENANT_A, null, null);
    mockParticipants(["p1", "p2", "p3"]);
    await expect(generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID)).rejects.toBeInstanceOf(
      TournamentPlannerNotOwnedByTenantError,
    );
    expect(prisma.tournamentFixture.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.tournamentParticipant.findMany).not.toHaveBeenCalled();
  });

  it("allows null homeAway when organizerName proves tenant organiser", async () => {
    mockTournament(TENANT_A, null, "FC Allschwil");
    mockParticipants(["p1", "p2", "p3"]);
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: "f1", eventId: TOURNAMENT_ID, ...data } as never;
    });
    const result = await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    expect(result.length).toBeGreaterThan(0);
    expect(prisma.tournamentFixture.create).toHaveBeenCalled();
  });

  it("rejects unsupported format", async () => {
    mockTournament();
    mockParticipants(["p1", "p2"]);
    await expect(
      generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID, {
        format: "KNOCKOUT" as never,
      }),
    ).rejects.toBeInstanceOf(TournamentFormatUnsupportedError);
  });

  it("rejects cross-tenant tournament access", async () => {
    mockTournament(TENANT_A);
    mockParticipants(["p1", "p2"]);
    await expect(generateTournamentRoundRobinFixtures(TENANT_B, TOURNAMENT_ID)).rejects.toBeInstanceOf(
      TournamentNotFoundError,
    );
  });

  it("does not create schedule versions or assignments", async () => {
    mockTournament();
    mockParticipants(["p1", "p2", "p3"]);
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: "f-new", eventId: TOURNAMENT_ID, ...data } as never;
    });

    await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    expect(prisma.tournamentScheduleVersion.findMany).not.toHaveBeenCalled();
    expect(prisma.tournamentFixtureAssignment.findMany).not.toHaveBeenCalled();
  });

  it("does not commit partial fixture sets when persistence fails mid-transaction", async () => {
    mockTournament();
    mockParticipants(["p1", "p2", "p3", "p4"]);

    let createAttempts = 0;
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      createAttempts += 1;
      if (createAttempts === 3) {
        throw new Error("simulated persistence failure");
      }
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: `fixture-${createAttempts}`, eventId: TOURNAMENT_ID, ...data } as never;
    });

    await expect(generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID)).rejects.toThrow(
      "simulated persistence failure",
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(createAttempts).toBe(3);
  });

  it("resolves concurrent first-writer race via unique constraint then idempotent read", async () => {
    mockTournament();
    const participantIds = ["p1", "p2", "p3"];
    mockParticipants(participantIds);

    const generated = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
    });

    let listCalls = 0;
    vi.mocked(prisma.tournamentFixture.findMany).mockImplementation(async () => {
      listCalls += 1;
      if (listCalls === 1) {
        return [] as never;
      }
      return generated.map((g, index) => ({
        id: `winner-${index}`,
        eventId: TOURNAMENT_ID,
        ...g,
      })) as never;
    });

    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const result = await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    expect(prisma.tournamentFixture.create).not.toHaveBeenCalled();
    expect(result).toHaveLength(generated.length);
    expect(listCalls).toBe(2);
  });

  it("uses canonical ordering independent of findMany return order", async () => {
    mockTournament();
    vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
      { id: "p3", displayOrder: 2 },
      { id: "p1", displayOrder: 0 },
      { id: "p2", displayOrder: 1 },
    ] as never);

    const createdSides: string[] = [];
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      const data = (args as { data: { sideAParticipantId: string; sideBParticipantId: string } }).data;
      createdSides.push(`${data.sideAParticipantId}:${data.sideBParticipantId}`);
      return { id: "x", eventId: TOURNAMENT_ID, ...(args as { data: object }).data } as never;
    });

    await generateTournamentRoundRobinFixtures(TENANT_A, TOURNAMENT_ID);
    const expected = generateRoundRobinFixtures({
      participantIds: ["p1", "p2", "p3"],
      config: { format: "ROUND_ROBIN" },
    });
    expect(createdSides.sort()).toEqual(
      expected.map((f) => `${f.sideAParticipantId}:${f.sideBParticipantId}`).sort(),
    );
  });
});
