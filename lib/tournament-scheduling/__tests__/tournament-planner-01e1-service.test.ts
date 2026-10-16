/**
 * SCE-TOURNAMENT-PLANNER-01E1 — generation service extensions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
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
import { generateRoundRobinFixtures, canonicalizeParticipantIds } from "../fixtures";
import {
  TournamentFixturesAlreadyExistError,
  TournamentFixtureSetConflictError,
} from "../errors";

const TENANT = "tenant-a";
const TOURNAMENT = "t-home";

function mockHomeTournament() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
  } as never);
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

describe("01E1 service — repeated round robin + drift", () => {
  it("persists 2× round robin fixtures", async () => {
    mockHomeTournament();
    const participantIds = ["p1", "p2", "p3"];
    mockParticipants(participantIds);

    let created = 0;
    vi.mocked(prisma.tournamentFixture.create).mockImplementation(async (args) => {
      created += 1;
      return { id: `f-${created}`, eventId: TOURNAMENT, ...(args as { data: object }).data } as never;
    });

    const result = await generateTournamentFixturesForEvent(TENANT, TOURNAMENT, {
      meetingsPerOpponent: 2,
    });
    const expected = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 2 },
    });
    expect(result).toHaveLength(expected.length);
    expect(created).toBe(expected.length);
  });

  it("detects 1× → 2× configuration drift", async () => {
    mockHomeTournament();
    const participantIds = ["p1", "p2", "p3"];
    mockParticipants(participantIds);

    const oneTimes = generateRoundRobinFixtures({
      participantIds: canonicalizeParticipantIds(
        participantIds.map((id, displayOrder) => ({ id, displayOrder })),
      ),
      config: { format: "ROUND_ROBIN", meetingsPerOpponent: 1 },
    });

    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue(
      oneTimes.map((g, index) => ({
        id: `existing-${index}`,
        eventId: TOURNAMENT,
        ...g,
      })) as never,
    );

    await expect(
      generateTournamentFixturesForEvent(TENANT, TOURNAMENT, { meetingsPerOpponent: 2 }),
    ).rejects.toBeInstanceOf(TournamentFixturesAlreadyExistError);
    expect(prisma.tournamentFixture.create).not.toHaveBeenCalled();
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
        generatorKey: "k",
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        id: "old2",
        eventId: TOURNAMENT,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 1,
        generatorKey: "k2",
        sideAParticipantId: "p3",
        sideBParticipantId: "p5-removed",
      },
    ] as never);

    await expect(generateTournamentFixturesForEvent(TENANT, TOURNAMENT)).rejects.toBeInstanceOf(
      TournamentFixtureSetConflictError,
    );
  });
});
