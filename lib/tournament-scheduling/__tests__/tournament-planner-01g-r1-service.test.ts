/**
 * SCE-TOURNAMENT-PLANNER-01G-R1 — durable lock lifecycle + regeneration service boundary.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tournamentScheduleVersion: { findFirst: vi.fn() },
    tournamentFixtureAssignment: { findMany: vi.fn() },
    tournamentFixture: { findMany: vi.fn() },
    tournamentParticipant: { findMany: vi.fn() },
    tournamentPitch: { findMany: vi.fn() },
    tournamentBreak: { findMany: vi.fn() },
  },
}));

vi.mock("../feasibility-service", () => ({
  loadTournamentScheduleOptimisationContext: vi.fn(),
}));

vi.mock("../assignment-service", () => ({
  listTournamentFixtureAssignmentsForVersion: vi.fn(),
}));

vi.mock("../partial-regeneration/regenerate", () => ({
  regenerateTournamentSchedule: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { regenerateTournamentSchedule } from "../partial-regeneration/regenerate";
import { listTournamentFixtureAssignmentsForVersion } from "../assignment-service";
import { loadTournamentScheduleOptimisationContext } from "../feasibility-service";
import {
  runTournamentPartialRegenerationForVersion,
  TournamentPlannerNotOwnedError,
} from "../partial-regeneration-service";

const TENANT = "tenant-a";
const TOURNAMENT = "tournament-home";
const VERSION = "version-1";

function mockHomeEvent() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
    organizerName: "FC Allschwil",
    tenant: { name: "FC Allschwil" },
  } as never);
}

function mockAwayEvent() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "AWAY",
    organizerName: "External Club",
    tenant: { name: "FC Allschwil" },
  } as never);
}

function mockOptimisationContext() {
  vi.mocked(loadTournamentScheduleOptimisationContext).mockResolvedValue({
    tournamentWindow: { startUtcMs: 0, endUtcMs: 3_600_000 },
    schedulingConfig: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
    engineFixtures: [
      {
        fixtureId: "f1",
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
        stageKey: "MAIN",
      },
      {
        fixtureId: "f2",
        sideAParticipantId: "p3",
        sideBParticipantId: "p4",
        stageKey: "MAIN",
      },
    ],
    participants: [
      { participantId: "p1", displayOrder: 0 },
      { participantId: "p2", displayOrder: 1 },
      { participantId: "p3", displayOrder: 2 },
      { participantId: "p4", displayOrder: 3 },
    ],
    tournamentPitches: [
      { tournamentPitchId: "pitch-a", displayOrder: 0, label: "A" },
      { tournamentPitchId: "pitch-b", displayOrder: 1, label: "B" },
    ],
    breaks: [],
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOptimisationContext();
  vi.mocked(regenerateTournamentSchedule).mockImplementation((input) => ({
    status: "OPTIMAL",
    participantRestProofStatus: "UNRESOLVED",
    assignments: input.baselineAssignments ?? [],
    hardConstraintValidationOk: true,
    objectiveMetrics: null,
    objectiveScore: null,
    feasibilityMetrics: null,
    diagnostics: [],
    baselineObjectiveMetrics: null,
    changeMetrics: {
      fixturesMovedInBoth: 0,
      fixturesMovedInTime: 0,
      fixturesMovedInPitch: 0,
      totalTimeDisplacementMinutes: 0,
      unchangedFixtureCount: input.baselineAssignments?.length ?? 0,
    },
    lockConflictDiagnostics: [],
    preservedLockCount: input.scheduleLocks?.length ?? 0,
    searchStats: {
      candidateSlotCount: 0,
      completeAssignmentsExplored: 0,
      nodesVisited: 0,
    },
    optimalityNote: "mock",
  }));
});

describe("01G-R1 — partial regeneration service ownership", () => {
  it("allows tenant-organised HOME tournaments", async () => {
    mockHomeEvent();
    vi.mocked(listTournamentFixtureAssignmentsForVersion).mockResolvedValue([
      {
        id: "a1",
        scheduleVersionId: VERSION,
        fixtureId: "f1",
        tournamentPitchId: "pitch-a",
        startAt: new Date(0).toISOString(),
        endAt: new Date(600_000).toISOString(),
        isLocked: true,
        lockedAt: null,
        lockedByUserId: null,
        scheduleLockDimension: "TIME_AND_PITCH",
      },
      {
        id: "a2",
        scheduleVersionId: VERSION,
        fixtureId: "f2",
        tournamentPitchId: "pitch-b",
        startAt: new Date(600_000).toISOString(),
        endAt: new Date(1_200_000).toISOString(),
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        scheduleLockDimension: null,
      },
    ] as never);

    const result = await runTournamentPartialRegenerationForVersion({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
      scheduleVersionId: VERSION,
    });
    expect(result.hardConstraintValidationOk).toBe(true);
    expect(regenerateTournamentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleLocks: [{ fixtureId: "f1", dimension: "TIME_AND_PITCH" }],
      }),
    );
    expect(result.preservedLockCount).toBe(1);
  });

  it("rejects AWAY tournaments", async () => {
    mockAwayEvent();
    vi.mocked(listTournamentFixtureAssignmentsForVersion).mockResolvedValue([]);
    await expect(
      runTournamentPartialRegenerationForVersion({
        tenantId: TENANT,
        tournamentId: TOURNAMENT,
        scheduleVersionId: VERSION,
      }),
    ).rejects.toBeInstanceOf(TournamentPlannerNotOwnedError);
  });

  it("honours legacy isLocked=true when scheduleLockDimension is null after reload", async () => {
    mockHomeEvent();
    vi.mocked(listTournamentFixtureAssignmentsForVersion).mockResolvedValue([
      {
        id: "a1",
        scheduleVersionId: VERSION,
        fixtureId: "f1",
        tournamentPitchId: "pitch-a",
        startAt: new Date(0).toISOString(),
        endAt: new Date(600_000).toISOString(),
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedByUserId: "user-1",
        scheduleLockDimension: null,
      },
      {
        id: "a2",
        scheduleVersionId: VERSION,
        fixtureId: "f2",
        tournamentPitchId: "pitch-b",
        startAt: new Date(600_000).toISOString(),
        endAt: new Date(1_200_000).toISOString(),
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        scheduleLockDimension: null,
      },
    ] as never);

    const result = await runTournamentPartialRegenerationForVersion({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
      scheduleVersionId: VERSION,
    });
    expect(regenerateTournamentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleLocks: [{ fixtureId: "f1", dimension: "TIME_AND_PITCH" }],
      }),
    );
    expect(result.preservedLockCount).toBe(1);
  });
});
