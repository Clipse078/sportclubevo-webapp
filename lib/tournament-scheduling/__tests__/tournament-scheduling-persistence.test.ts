/**
 * SCE-TOURNAMENT-PLANNER-01B — fixture / schedule version / assignment services.
 * Prisma and facility validation mocked — no DB access.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tournamentParticipant: { findFirst: vi.fn() },
    tournamentFixture: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    tournamentFixtureSide: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    tournamentScheduleVersion: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    tournamentFixtureAssignment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tournamentPitch: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/operational/tenant-operational-duration-policy-service", () => ({
  getTenantOperationalDurationPolicy: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import {
  createTournamentFixture,
  listTournamentFixtures,
  getTournamentFixture,
} from "../fixture-service";
import {
  createWorkingTournamentScheduleVersion,
  listTournamentScheduleVersions,
  approveTournamentScheduleVersion,
} from "../schedule-version-service";
import {
  persistTournamentFixtureAssignment,
  updateTournamentFixtureAssignment,
  removeTournamentFixtureAssignment,
  setTournamentFixtureAssignmentLocked,
  setTournamentFixtureAssignmentScheduleLock,
  listTournamentFixtureAssignmentsForVersion,
} from "../assignment-service";
import { loadTournamentScheduleSnapshot } from "../schedule-snapshot-service";
import {
  TournamentScheduleParticipantInvalidError,
  TournamentFixtureNotFoundError,
  TournamentScheduleApprovedImmutableError,
  TournamentAssignmentDuplicateError,
  TournamentScheduleStaleVersionError,
  TournamentScheduleResourceInvalidError,
  TournamentScheduleWorkingExistsError,
} from "../errors";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TOURNAMENT_ID = "tournament-01";
const OTHER_TOURNAMENT = "tournament-02";
const PARTICIPANT_A = "participant-a";
const PARTICIPANT_B = "participant-b";
const FIXTURE_ID = "fixture-01";
const VERSION_ID = "version-01";
const VERSION_ID_2 = "version-02";
const ASSIGNMENT_ID = "assignment-01";
const PITCH_ID = "tournament-pitch-1";

function mockTournamentExists(tenantId: string = TENANT_A) {
  vi.mocked(prisma.event.findFirst).mockResolvedValue({ id: TOURNAMENT_ID } as never);
  void tenantId;
}

function mockParticipants(
  eventId: string,
  participantIds: string[],
  tenantId: string = TENANT_A,
) {
  vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
    const where = (args as { where: { id: string; tenantId: string; eventId: string } }).where;
    if (
      participantIds.includes(where.id) &&
      where.tenantId === tenantId &&
      where.eventId === eventId
    ) {
      return { id: where.id } as never;
    }
    return null;
  });
}

function mockActivePitch() {
  vi.mocked(prisma.tournamentPitch.findFirst).mockResolvedValue({ id: PITCH_ID } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTenantOperationalDurationPolicy).mockResolvedValue({
    TOURNAMENT: { durationMinutes: 90, isClubConfigured: true },
    MATCH: { durationMinutes: 90, isClubConfigured: true },
    TRAINING: { durationMinutes: 90, isClubConfigured: true },
  } as never);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
    typeof fn === "function" ? fn(prisma) : fn,
  );
});

describe("fixtures", () => {
  it("creates fixture with two valid participants", async () => {
    mockTournamentExists();
    mockParticipants(TOURNAMENT_ID, [PARTICIPANT_A, PARTICIPANT_B]);
    vi.mocked(prisma.tournamentFixture.create).mockResolvedValue({
      id: FIXTURE_ID,
      eventId: TOURNAMENT_ID,
      stageKey: "MAIN",
      roundIndex: 0,
      slotIndexInRound: 0,
      generatorKey: null,
      sideAParticipantId: PARTICIPANT_A,
      sideBParticipantId: PARTICIPANT_B,
    } as never);

    const result = await createTournamentFixture(TENANT_A, TOURNAMENT_ID, {
      roundIndex: 0,
      slotIndexInRound: 0,
      sideAParticipantId: PARTICIPANT_A,
      sideBParticipantId: PARTICIPANT_B,
    });

    expect(result.id).toBe(FIXTURE_ID);
    expect(result.sideAParticipantId).toBe(PARTICIPANT_A);
  });

  it("rejects same participant twice", async () => {
    mockTournamentExists();
    await expect(
      createTournamentFixture(TENANT_A, TOURNAMENT_ID, {
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: PARTICIPANT_A,
        sideBParticipantId: PARTICIPANT_A,
      }),
    ).rejects.toThrow(TournamentScheduleParticipantInvalidError);
  });

  it("rejects participant from another tournament", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentParticipant.findFirst).mockImplementation(async (args) => {
      const where = (args as { where: { id: string; eventId: string } }).where;
      if (where.id === PARTICIPANT_B && where.eventId === TOURNAMENT_ID) {
        return { id: PARTICIPANT_B } as never;
      }
      return null;
    });

    await expect(
      createTournamentFixture(TENANT_A, TOURNAMENT_ID, {
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: PARTICIPANT_B,
        sideBParticipantId: PARTICIPANT_A,
      }),
    ).rejects.toThrow(TournamentScheduleParticipantInvalidError);
  });

  it("rejects cross-tenant participant lookup", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentParticipant.findFirst).mockResolvedValue(null);

    await expect(
      createTournamentFixture(TENANT_A, TOURNAMENT_ID, {
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: PARTICIPANT_A,
        sideBParticipantId: PARTICIPANT_B,
      }),
    ).rejects.toThrow(TournamentScheduleParticipantInvalidError);
  });

  it("lists deterministic fixture order", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([
      {
        id: "f2",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        generatorKey: null,
        sideAParticipantId: PARTICIPANT_A,
        sideBParticipantId: PARTICIPANT_B,
      },
      {
        id: "f1",
        eventId: TOURNAMENT_ID,
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        generatorKey: null,
        sideAParticipantId: PARTICIPANT_A,
        sideBParticipantId: PARTICIPANT_B,
      },
    ] as never);

    await listTournamentFixtures(TENANT_A, TOURNAMENT_ID);
    expect(prisma.tournamentFixture.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { stageKey: "asc" },
          { roundIndex: "asc" },
          { slotIndexInRound: "asc" },
          { id: "asc" },
        ],
      }),
    );
  });

  it("tenant B cannot read tenant A fixture", async () => {
    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue(null);
    await expect(getTournamentFixture(TENANT_B, FIXTURE_ID)).rejects.toThrow(
      TournamentFixtureNotFoundError,
    );
  });
});

describe("schedule versions", () => {
  it("creates WORKING schedule with incrementing version number", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tournamentScheduleVersion.aggregate).mockResolvedValue({
      _max: { versionNumber: 1 },
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.create).mockResolvedValue({
      id: VERSION_ID,
      eventId: TOURNAMENT_ID,
      versionNumber: 2,
      status: "WORKING",
      revision: 0,
      matchDurationMinutes: null,
      transitionMinutes: null,
      minRestMinutes: null,
      approvedAt: null,
      supersededAt: null,
    } as never);

    const version = await createWorkingTournamentScheduleVersion(TENANT_A, TOURNAMENT_ID);
    expect(version.versionNumber).toBe(2);
    expect(version.status).toBe("WORKING");
  });

  it("rejects second WORKING version", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({ id: VERSION_ID } as never);
    await expect(createWorkingTournamentScheduleVersion(TENANT_A, TOURNAMENT_ID)).rejects.toThrow(
      TournamentScheduleWorkingExistsError,
    );
  });

  it("lists schedule versions", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentScheduleVersion.findMany).mockResolvedValue([] as never);
    await listTournamentScheduleVersions(TENANT_A, TOURNAMENT_ID);
    expect(prisma.tournamentScheduleVersion.findMany).toHaveBeenCalled();
  });

  it("rejects cross-tenant tournament", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    await expect(createWorkingTournamentScheduleVersion(TENANT_B, TOURNAMENT_ID)).rejects.toThrow(
      TournamentNotFoundError,
    );
  });
});

describe("assignments", () => {
  const workingVersion = {
    id: VERSION_ID,
    eventId: TOURNAMENT_ID,
    status: "WORKING" as const,
    revision: 3,
    matchDurationMinutes: 60,
  };

  function mockWorkingVersion(overrides: Partial<typeof workingVersion> = {}) {
    const version = { ...workingVersion, ...overrides };
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue(version as never);
    return version;
  }

  it("assigns fixture to tournament pitch + start", async () => {
    mockWorkingVersion();
    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.findUnique).mockResolvedValue(null);
    mockActivePitch();
    vi.mocked(prisma.tournamentScheduleVersion.findUniqueOrThrow).mockResolvedValue({
      revision: 3,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({ revision: 4 } as never);
    const startAt = new Date("2026-08-01T10:00:00.000Z");
    vi.mocked(prisma.tournamentFixtureAssignment.create).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt,
      endAt: new Date("2026-08-01T11:00:00.000Z"),
      isLocked: false,
      lockedAt: null,
      lockedByUserId: null,
      scheduleLockDimension: null,
    } as never);

    const result = await persistTournamentFixtureAssignment(TENANT_A, VERSION_ID, {
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt,
    });

    expect(result.revision).toBe(4);
    expect(result.assignment.fixtureId).toBe(FIXTURE_ID);
  });

  it("rejects duplicate fixture per schedule version", async () => {
    mockWorkingVersion();
    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.findUnique).mockResolvedValue({ id: "x" } as never);
    mockActivePitch();

    await expect(
      persistTournamentFixtureAssignment(TENANT_A, VERSION_ID, {
        fixtureId: FIXTURE_ID,
        tournamentPitchId: PITCH_ID,
        startAt: new Date(),
      }),
    ).rejects.toThrow(TournamentAssignmentDuplicateError);
  });

  it("rejects unknown tournament pitch", async () => {
    mockWorkingVersion();
    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tournamentPitch.findFirst).mockResolvedValue(null);

    await expect(
      persistTournamentFixtureAssignment(TENANT_A, VERSION_ID, {
        fixtureId: FIXTURE_ID,
        tournamentPitchId: PITCH_ID,
        startAt: new Date(),
      }),
    ).rejects.toThrow(TournamentScheduleResourceInvalidError);
  });

  it("approved version rejects assignment mutation", async () => {
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({
      id: VERSION_ID,
      eventId: TOURNAMENT_ID,
      status: "APPROVED",
      revision: 1,
    } as never);

    await expect(
      persistTournamentFixtureAssignment(TENANT_A, VERSION_ID, {
        fixtureId: FIXTURE_ID,
        tournamentPitchId: PITCH_ID,
        startAt: new Date(),
      }),
    ).rejects.toThrow(TournamentScheduleApprovedImmutableError);
  });

  it("sets TIME schedule lock dimension with revision bump", async () => {
    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: false,
      lockedAt: null,
      lockedByUserId: null,
      scheduleLockDimension: null,
      scheduleVersion: { id: VERSION_ID, status: "WORKING", revision: 4 },
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.findUniqueOrThrow).mockResolvedValue({
      revision: 4,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({ revision: 5 } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.update).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: false,
      lockedAt: new Date(),
      lockedByUserId: "user-1",
      scheduleLockDimension: "TIME",
    } as never);

    const locked = await setTournamentFixtureAssignmentScheduleLock(
      TENANT_A,
      ASSIGNMENT_ID,
      "TIME",
      "user-1",
      { expectedRevision: 4 },
    );
    expect(locked.revision).toBe(5);
    expect(locked.assignment.scheduleLockDimension).toBe("TIME");
    expect(locked.assignment.isLocked).toBe(false);
  });

  it("clears schedule lock dimension on unlock", async () => {
    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: true,
      lockedAt: new Date(),
      lockedByUserId: "user-1",
      scheduleLockDimension: "PITCH",
      scheduleVersion: { id: VERSION_ID, status: "WORKING", revision: 6 },
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.findUniqueOrThrow).mockResolvedValue({
      revision: 6,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({ revision: 7 } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.update).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: false,
      lockedAt: null,
      lockedByUserId: null,
      scheduleLockDimension: null,
    } as never);

    const unlocked = await setTournamentFixtureAssignmentScheduleLock(
      TENANT_A,
      ASSIGNMENT_ID,
      null,
      null,
      { expectedRevision: 6 },
    );
    expect(unlocked.revision).toBe(7);
    expect(unlocked.assignment.scheduleLockDimension).toBeNull();
  });

  it("rejects stale revision on schedule lock mutation", async () => {
    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: false,
      lockedAt: null,
      lockedByUserId: null,
      scheduleLockDimension: null,
      scheduleVersion: { id: VERSION_ID, status: "WORKING", revision: 9 },
    } as never);

    await expect(
      setTournamentFixtureAssignmentScheduleLock(TENANT_A, ASSIGNMENT_ID, "PITCH", "user-1", {
        expectedRevision: 3,
      }),
    ).rejects.toMatchObject({ code: "SCHEDULE.STALE_VERSION" });
  });

  it("rejects cross-tenant assignment lock mutation", async () => {
    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue(null);
    await expect(
      setTournamentFixtureAssignmentScheduleLock(TENANT_B, ASSIGNMENT_ID, "TIME", "user-1"),
    ).rejects.toThrow();
  });

  it("locks and unlocks assignment", async () => {
    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: false,
      lockedAt: null,
      lockedByUserId: null,
      scheduleLockDimension: null,
      scheduleVersion: { id: VERSION_ID, status: "WORKING", revision: 2 },
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.findUniqueOrThrow).mockResolvedValue({
      revision: 2,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({ revision: 3 } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.update).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date(),
      endAt: new Date(),
      isLocked: true,
      lockedAt: new Date(),
      lockedByUserId: "user-1",
      scheduleLockDimension: "TIME_AND_PITCH",
    } as never);

    const locked = await setTournamentFixtureAssignmentLocked(
      TENANT_A,
      ASSIGNMENT_ID,
      true,
      "user-1",
      { expectedRevision: 2 },
    );
    expect(locked.assignment.isLocked).toBe(true);
  });

  it("stale revision rejects with SCHEDULE.STALE_VERSION", async () => {
    mockWorkingVersion({ revision: 5 });
    vi.mocked(prisma.tournamentFixture.findFirst).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.findUnique).mockResolvedValue(null);
    mockActivePitch();

    await expect(
      persistTournamentFixtureAssignment(
        TENANT_A,
        VERSION_ID,
        {
          fixtureId: FIXTURE_ID,
          tournamentPitchId: PITCH_ID,
          startAt: new Date(),
        },
        { expectedRevision: 2 },
      ),
    ).rejects.toMatchObject({ code: "SCHEDULE.STALE_VERSION" });
    await expect(
      persistTournamentFixtureAssignment(
        TENANT_A,
        VERSION_ID,
        {
          fixtureId: FIXTURE_ID,
          tournamentPitchId: PITCH_ID,
          startAt: new Date(),
        },
        { expectedRevision: 2 },
      ),
    ).rejects.toThrow(TournamentScheduleStaleVersionError);
  });

  it("updates and removes assignment", async () => {
    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureResourceId: PITCH_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date("2026-08-01T10:00:00.000Z"),
      endAt: new Date("2026-08-01T11:00:00.000Z"),
      scheduleVersion: { id: VERSION_ID, status: "WORKING", revision: 1, eventId: TOURNAMENT_ID },
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.findUniqueOrThrow).mockResolvedValue({
      revision: 1,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({ revision: 2 } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.update).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      fixtureId: FIXTURE_ID,
      tournamentPitchId: PITCH_ID,
      startAt: new Date("2026-08-01T12:00:00.000Z"),
      endAt: new Date("2026-08-01T13:00:00.000Z"),
      isLocked: false,
      lockedAt: null,
      lockedByUserId: null,
      scheduleLockDimension: null,
    } as never);

    const updated = await updateTournamentFixtureAssignment(
      TENANT_A,
      ASSIGNMENT_ID,
      { startAt: new Date("2026-08-01T12:00:00.000Z") },
      { expectedRevision: 1 },
    );
    expect(updated.revision).toBe(2);

    vi.mocked(prisma.tournamentFixtureAssignment.findFirst).mockResolvedValue({
      id: ASSIGNMENT_ID,
      scheduleVersionId: VERSION_ID,
      scheduleVersion: { id: VERSION_ID, status: "WORKING", revision: 2 },
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.findUniqueOrThrow).mockResolvedValue({
      revision: 2,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({ revision: 3 } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.delete).mockResolvedValue({} as never);

    const removed = await removeTournamentFixtureAssignment(TENANT_A, ASSIGNMENT_ID, {
      expectedRevision: 2,
    });
    expect(removed.revision).toBe(3);
  });
});

describe("schedule snapshot", () => {
  it("loads fixtures and assignments for version", async () => {
    mockTournamentExists();
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({
      id: VERSION_ID,
      eventId: TOURNAMENT_ID,
      versionNumber: 1,
      status: "WORKING",
      revision: 0,
      matchDurationMinutes: null,
      transitionMinutes: null,
      minRestMinutes: null,
      approvedAt: null,
      supersededAt: null,
    } as never);
    vi.mocked(prisma.tournamentFixture.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.tournamentFixtureAssignment.findMany).mockResolvedValue([] as never);

    const snapshot = await loadTournamentScheduleSnapshot(TENANT_A, VERSION_ID);
    expect(snapshot.version.id).toBe(VERSION_ID);
    expect(snapshot.fixtures).toEqual([]);
    expect(snapshot.assignments).toEqual([]);
  });
});

describe("approved immutability foundation", () => {
  it("approve marks version APPROVED", async () => {
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({
      id: VERSION_ID,
      eventId: TOURNAMENT_ID,
      status: "WORKING",
    } as never);
    vi.mocked(prisma.tournamentScheduleVersion.update).mockResolvedValue({
      id: VERSION_ID,
      eventId: TOURNAMENT_ID,
      versionNumber: 1,
      status: "APPROVED",
      revision: 0,
      matchDurationMinutes: null,
      transitionMinutes: null,
      minRestMinutes: null,
      approvedAt: new Date(),
      supersededAt: null,
    } as never);

    const approved = await approveTournamentScheduleVersion(TENANT_A, VERSION_ID);
    expect(approved.status).toBe("APPROVED");
  });
});

describe("isolation", () => {
  it("schedule version listing requires tournament tenant", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    await expect(listTournamentScheduleVersions(TENANT_B, TOURNAMENT_ID)).rejects.toThrow(
      TournamentNotFoundError,
    );
  });

  it("lists assignments scoped to tenant", async () => {
    vi.mocked(prisma.tournamentScheduleVersion.findFirst).mockResolvedValue({ id: VERSION_ID } as never);
    vi.mocked(prisma.tournamentFixtureAssignment.findMany).mockResolvedValue([] as never);
    await listTournamentFixtureAssignmentsForVersion(TENANT_A, VERSION_ID);
    expect(prisma.tournamentFixtureAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_A, scheduleVersionId: VERSION_ID } }),
    );
  });
});
