/**
 * SCE-TOURNAMENT-PLANNER-01E2 — Smart Mix service bridge.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
    tournamentParticipant: { findMany: vi.fn() },
    tournamentFixture: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    tournamentScheduleVersion: { findMany: vi.fn() },
    tournamentFixtureAssignment: { findMany: vi.fn() },
    tournamentPitch: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import { generateTournamentFixturesForEvent } from "../fixture-generation-service";
import {
  generateSmartMixFixtures,
  canonicalizeParticipantIds,
  generateRoundRobinFixtures,
} from "../fixtures";
import {
  TournamentFixturesAlreadyExistError,
  TournamentFixtureSetConflictError,
  TournamentSmartMixTargetInvalidError,
} from "../errors";

const TENANT = "tenant-a";
const TOURNAMENT = "t-home";

function mockHomeTournament() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
    organizerName: "FC Allschwil",
  } as never);
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ name: "FC Allschwil" } as never);
}

function mockParticipants(ids: string[]) {
  vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue(
    ids.map((id, displayOrder) => ({ id, displayOrder })) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tournamentScheduleVersion.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tournamentFixtureAssignment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
});

describe("01E2 service — Smart Mix", () => {
  it("persists Smart Mix fixtures", async () => {
    mockHomeTournament();
    const participantIds = ["p1", "p2", "p3", "p4"];
    mockParticipants(participantIds);

    let created = 0;
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      created += 1;
      return { id: `f-${created}`, eventId: TOURNAMENT, ...(args as { data: object }).data } as never;
    });

    const result = await generateTournamentFixturesForEvent(TENANT, TOURNAMENT, {
      strategy: "SMART_MIX",
      targetMatchesPerParticipant: 3,
    });
    const expected = generateSmartMixFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
      config: { targetMatchesPerParticipant: 3 },
    });
    expect(result).toHaveLength(expected.length);
    expect(created).toBe(expected.length);
  });

  it("requires targetMatchesPerParticipant", async () => {
    mockHomeTournament();
    mockParticipants(["p1", "p2"]);
    await expect(
      generateTournamentFixturesForEvent(TENANT, TOURNAMENT, { strategy: "SMART_MIX" }),
    ).rejects.toBeInstanceOf(TournamentSmartMixTargetInvalidError);
  });

  it("detects target drift", async () => {
    mockHomeTournament();
    const participantIds = ["p1", "p2", "p3", "p4"];
    mockParticipants(participantIds);

    const target4 = generateSmartMixFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
      config: { targetMatchesPerParticipant: 4 },
    });

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue(
      target4.map((g, index) => ({
        id: `existing-${index}`,
        eventId: TOURNAMENT,
        ...g,
      })) as never,
    );

    await expect(
      generateTournamentFixturesForEvent(TENANT, TOURNAMENT, {
        strategy: "SMART_MIX",
        targetMatchesPerParticipant: 5,
      }),
    ).rejects.toBeInstanceOf(TournamentFixturesAlreadyExistError);
  });

  it("detects strategy drift ROUND_ROBIN → SMART_MIX", async () => {
    mockHomeTournament();
    const participantIds = ["p1", "p2", "p3", "p4"];
    mockParticipants(participantIds);

    const rr = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 1 },
    });

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue(
      rr.map((g, index) => ({ id: `existing-${index}`, eventId: TOURNAMENT, ...g })) as never,
    );

    await expect(
      generateTournamentFixturesForEvent(TENANT, TOURNAMENT, {
        strategy: "SMART_MIX",
        targetMatchesPerParticipant: 2,
      }),
    ).rejects.toBeInstanceOf(TournamentFixturesAlreadyExistError);
  });

  it("detects participant drift", async () => {
    mockHomeTournament();
    mockParticipants(["p1", "p2", "p3", "p4"]);

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([
      {
        id: "old",
        eventId: TOURNAMENT,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        generatorKey: "smart-mix:MAIN:0",
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        id: "old2",
        eventId: TOURNAMENT,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 1,
        generatorKey: "smart-mix:MAIN:1",
        sideAParticipantId: "p3",
        sideBParticipantId: "p5-removed",
      },
    ] as never);

    await expect(
      generateTournamentFixturesForEvent(TENANT, TOURNAMENT, {
        strategy: "SMART_MIX",
        targetMatchesPerParticipant: 2,
      }),
    ).rejects.toBeInstanceOf(TournamentFixtureSetConflictError);
  });
});
