/**
 * SCE-TOURNAMENT-PLANNER-01E3C — knockout bracket service (mocked Prisma).
 */

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
    tournamentParticipant: { findFirst: vi.fn(), findMany: vi.fn() },
    tournamentFixture: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    tournamentFixtureSide: { createMany: vi.fn() },
    tournamentQualificationSource: { findFirst: vi.fn(), create: vi.fn() },
    tournamentCompetitionConfiguration: { findFirst: vi.fn() },
    tournamentPhase: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import { generateKnockoutBracketForPhase } from "../knockout-bracket/knockout-bracket-service";
import {
  TournamentFixtureSetConflictError,
  TournamentFormatUnsupportedError,
} from "../errors";

const TENANT = "tenant-a";
const TOURNAMENT = "tournament-01";
const PHASE_KO = "phase-ko";

function mockOrganiserTournament() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
    organizerName: "FC Allschwil",
  } as never);
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ name: "FC Allschwil" } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrganiserTournament();
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
});

describe("01E3C — knockout service guards", () => {
  it("rejects GROUP_MIX phase", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "GROUP_MIX_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: "phase-group",
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "GROUP_MIX",
      label: "Gruppenphase",
      stageKey: "MAIN",
      groupMixStrategy: "ROUND_ROBIN",
      smartMixTargetMatchesPerParticipant: null,
    } as never);

    await expect(
      generateKnockoutBracketForPhase(TENANT, {
        tournamentId: TOURNAMENT,
        phaseId: "phase-group",
        entrants: [
          { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
          { kind: "CONCRETE_PARTICIPANT", participantId: "p2" },
        ],
      }),
    ).rejects.toBeInstanceOf(TournamentFormatUnsupportedError);
  });

  it("persists knockout fixtures with null tournamentGroupId", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "KNOCKOUT_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "KNOCKOUT",
      label: "K.-o.-Phase",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
      const id = (args as { where: { id: string } }).where.id;
      return { id } as never;
    });
    vi.mocked(prisma.tournamentFixture.update).mockResolvedValue({} as never);
    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([]);
    let createCount = 0;
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      createCount += 1;
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: `fx-${createCount}`, eventId: TOURNAMENT, ...data } as never;
    });
    vi.mocked(prisma.tournamentQualificationSource.create).mockImplementation(async () => {
      return { id: `wq-${createCount}`, sourceType: "WINNER_OF_FIXTURE" } as never;
    });

    const result = await generateKnockoutBracketForPhase(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE_KO,
      entrants: [
        { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
        { kind: "CONCRETE_PARTICIPANT", participantId: "p2" },
      ],
    });

    expect(result.fixtures).toHaveLength(1);
    expect(result.fixtures[0]?.tournamentGroupId).toBeNull();
    expect(result.fixtures[0]?.tournamentPhaseId).toBe(PHASE_KO);
    expect(vi.mocked(prisma.tournamentFixture.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tournamentGroupId: null, tournamentPhaseId: PHASE_KO }),
      }),
    );
  });

  it("returns idempotent result when generator keys match", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "KNOCKOUT_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "KNOCKOUT",
      label: "K.-o.",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
      const id = (args as { where: { id: string } }).where.id;
      return { id } as never;
    });
    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([
      {
        id: "fx-1",
        eventId: TOURNAMENT,
        tournamentPhaseId: PHASE_KO,
        tournamentGroupId: null,
        stageKey: "KO",
        roundIndex: 0,
        slotIndexInRound: 0,
        generatorKey: "knockout:KO:r0:s0",
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
    ] as never);

    const result = await generateKnockoutBracketForPhase(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE_KO,
      entrants: [
        { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
        { kind: "CONCRETE_PARTICIPANT", participantId: "p2" },
      ],
    });

    expect(result.fixtures).toHaveLength(1);
    expect(vi.mocked(prisma.tournamentFixture.create)).not.toHaveBeenCalled();
  });

  it("rejects drift when existing knockout keys differ", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "KNOCKOUT_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "KNOCKOUT",
      label: "K.-o.",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
      const id = (args as { where: { id: string } }).where.id;
      return { id } as never;
    });
    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([
      {
        id: "fx-old",
        generatorKey: "knockout:KO:r0:s99",
      },
    ] as never);

    await expect(
      generateKnockoutBracketForPhase(TENANT, {
        tournamentId: TOURNAMENT,
        phaseId: PHASE_KO,
        entrants: [
          { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
          { kind: "CONCRETE_PARTICIPANT", participantId: "p2" },
        ],
      }),
    ).rejects.toBeInstanceOf(TournamentFixtureSetConflictError);
  });

  it("resolves concurrent first-writer race via P2002 then idempotent read", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "KNOCKOUT_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "KNOCKOUT",
      label: "K.-o.",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
      const id = (args as { where: { id: string } }).where.id;
      return { id } as never;
    });

    let listCalls = 0;
    vi.mocked(prisma.tournamentFixture.findMany).mockImplementation(async () => {
      listCalls += 1;
      if (listCalls === 1) {
        return [] as never;
      }
      return [
        {
          id: "fx-1",
          eventId: TOURNAMENT,
          tournamentPhaseId: PHASE_KO,
          tournamentGroupId: null,
          stageKey: "KO",
          roundIndex: 0,
          slotIndexInRound: 0,
          generatorKey: "knockout:KO:r0:s0",
          sideAParticipantId: "p1",
          sideBParticipantId: "p2",
        },
      ] as never;
    });

    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const result = await generateKnockoutBracketForPhase(TENANT, {
      tournamentId: TOURNAMENT,
      phaseId: PHASE_KO,
      entrants: [
        { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
        { kind: "CONCRETE_PARTICIPANT", participantId: "p2" },
      ],
    });

    expect(result.fixtures).toHaveLength(1);
    expect(vi.mocked(prisma.tournamentFixture.create)).not.toHaveBeenCalled();
    expect(listCalls).toBeGreaterThanOrEqual(2);
  });

  it("does not leave partial bracket when transaction fails", async () => {
    vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue({
      id: "cfg",
      eventId: TOURNAMENT,
      competitionFormat: "KNOCKOUT_ONLY",
    } as never);
    vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
      id: PHASE_KO,
      eventId: TOURNAMENT,
      displayOrder: 1,
      phaseType: "KNOCKOUT",
      label: "K.-o.",
      stageKey: "KO",
      groupMixStrategy: null,
      smartMixTargetMatchesPerParticipant: null,
    } as never);
    vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
      const id = (args as { where: { id: string } }).where.id;
      return { id } as never;
    });
    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("simulated persistence failure"));

    await expect(
      generateKnockoutBracketForPhase(TENANT, {
        tournamentId: TOURNAMENT,
        phaseId: PHASE_KO,
        entrants: [
          { kind: "CONCRETE_PARTICIPANT", participantId: "p1" },
          { kind: "CONCRETE_PARTICIPANT", participantId: "p2" },
        ],
      }),
    ).rejects.toThrow("simulated persistence failure");
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1);
  });
});
