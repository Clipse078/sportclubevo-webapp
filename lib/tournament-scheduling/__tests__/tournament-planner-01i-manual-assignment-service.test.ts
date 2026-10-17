/**
 * SCE-TOURNAMENT-PLANNER-01I — manual assignment service boundary (mocked Prisma).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tournamentScheduleVersion: { findFirst: vi.fn() },
    tournamentFixtureAssignment: { findFirst: vi.fn(), findFirstOrThrow: vi.fn() },
    tournamentFixture: { findFirst: vi.fn() },
    tournamentPitch: { findFirst: vi.fn() },
    tournamentParticipant: { findMany: vi.fn() },
  },
}));

vi.mock("../feasibility-service", () => ({
  loadTournamentScheduleOptimisationContext: vi.fn(),
}));

vi.mock("../schedule-engine-load-service", () => ({
  listTournamentScheduleEngineFixtures: vi.fn(),
}));

vi.mock("../assignment-service", () => ({
  listTournamentFixtureAssignmentsForVersion: vi.fn(),
  updateTournamentFixtureAssignment: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { loadTournamentScheduleOptimisationContext } from "../feasibility-service";
import { listTournamentScheduleEngineFixtures } from "../schedule-engine-load-service";
import {
  listTournamentFixtureAssignmentsForVersion,
  updateTournamentFixtureAssignment,
} from "../assignment-service";
import { applyTournamentManualAssignment } from "../manual-assignment-service";
import { TournamentManualAssignmentInvalidError } from "../errors";
import { TournamentPlannerNotOwnedError } from "../partial-regeneration-service";

const TENANT = "tenant-a";
const TOURNAMENT = "tournament-home";
const VERSION = "version-1";
const FIXTURE = "fixture-1";
const PITCH_A = "pitch-a";
const PITCH_B = "pitch-b";

function mockOwnedEvent() {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: TOURNAMENT,
    homeAway: "HOME",
    organizerName: "Club",
    tenant: { name: "Club" },
  } as never);
}

function mockEngine() {
  vi.mocked(loadTournamentScheduleOptimisationContext).mockResolvedValue({
    tournamentWindow: { startUtcMs: 0, endUtcMs: 86_400_000 },
    schedulingConfig: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
    tournamentPitches: [
      { tournamentPitchId: PITCH_A, displayOrder: 0, label: "Feld 1", playableIntervals: [] },
      { tournamentPitchId: PITCH_B, displayOrder: 1, label: "Feld 2", playableIntervals: [] },
    ],
    breaks: [],
    engineFixtures: [],
    participants: [],
  } as never);

  vi.mocked(listTournamentScheduleEngineFixtures).mockResolvedValue([
    {
      fixtureId: FIXTURE,
      stageKey: "MAIN",
      sideAParticipantId: "p1",
      sideBParticipantId: "p2",
    },
  ] as never);

  vi.mocked(listTournamentFixtureAssignmentsForVersion).mockResolvedValue([
    {
      id: "assign-1",
      fixtureId: FIXTURE,
      tournamentPitchId: PITCH_A,
      startAt: new Date(3_600_000).toISOString(),
      endAt: new Date(3_600_000 + 12 * 60_000).toISOString(),
      scheduleLockDimension: null,
      isLocked: false,
      scheduleVersionId: VERSION,
      lockedAt: null,
      lockedByUserId: null,
    },
  ] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOwnedEvent();
  mockEngine();
  vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({ id: VERSION } as never);
  vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
    id: "assign-1",
    fixtureId: FIXTURE,
    tournamentPitchId: PITCH_A,
    startAt: new Date(3_600_000),
    scheduleLockDimension: null,
    isLocked: false,
  } as never);
  vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({ id: FIXTURE } as never);
  vi.mocked(prisma.tournamentPitch.findFirst).mockResolvedValue({ id: PITCH_B, label: "Feld 2" } as never);
  vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.tournamentFixtureAssignment.findFirstOrThrow).mockResolvedValue({
    id: "assign-1",
    scheduleVersion: { revision: 4 },
  } as never);
});

describe("01I manual assignment service", () => {
  it("O — successful move bumps revision via assignment service", async () => {
    vi.mocked(updateTournamentFixtureAssignment).mockResolvedValue({
      assignment: {} as never,
      revision: 5,
    });
    const result = await applyTournamentManualAssignment({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
      scheduleVersionId: VERSION,
      fixtureId: FIXTURE,
      expectedRevision: 4,
      targetTournamentPitchId: PITCH_B,
      targetStartAt: new Date(3_600_000).toISOString(),
    });
    expect(result.revision).toBe(5);
    expect(updateTournamentFixtureAssignment).toHaveBeenCalled();
  });

  it("N — unlocked move does not create lock (update payload has no lock fields)", async () => {
    vi.mocked(updateTournamentFixtureAssignment).mockResolvedValue({
      assignment: {} as never,
      revision: 5,
    });
    await applyTournamentManualAssignment({
      tenantId: TENANT,
      tournamentId: TOURNAMENT,
      scheduleVersionId: VERSION,
      fixtureId: FIXTURE,
      expectedRevision: 4,
      targetTournamentPitchId: PITCH_B,
      targetStartAt: new Date(3_600_000).toISOString(),
    });
    const updateArg = vi.mocked(updateTournamentFixtureAssignment).mock.calls[0]?.[2];
    expect(updateArg).not.toHaveProperty("scheduleLockDimension");
  });

  it("U — unknown ownership fails closed", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: TOURNAMENT,
      homeAway: "AWAY",
      organizerName: "External",
      tenant: { name: "Club" },
    } as never);
    await expect(
      applyTournamentManualAssignment({
        tenantId: TENANT,
        tournamentId: TOURNAMENT,
        scheduleVersionId: VERSION,
        fixtureId: FIXTURE,
        expectedRevision: 4,
        targetTournamentPitchId: PITCH_B,
        targetStartAt: new Date(3_600_000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(TournamentPlannerNotOwnedError);
  });

  it("R — cross-tournament pitch rejected", async () => {
    vi.mocked(prisma.tournamentPitch.findFirst).mockResolvedValue(null);
    await expect(
      applyTournamentManualAssignment({
        tenantId: TENANT,
        tournamentId: TOURNAMENT,
        scheduleVersionId: VERSION,
        fixtureId: FIXTURE,
        expectedRevision: 4,
        targetTournamentPitchId: "foreign-pitch",
        targetStartAt: new Date(3_600_000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(TournamentManualAssignmentInvalidError);
  });
});
