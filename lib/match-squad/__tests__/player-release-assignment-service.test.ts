import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  buildMatchSquadViewModel: vi.fn(),
  evaluateReleaseAssignmentFeasibility: vi.fn(),
  emitNotifications: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerReleaseRequest: { findFirst: mocks.findFirst },
    matchSquad: { findUnique: mocks.findUnique, create: mocks.create, update: mocks.update },
    matchSquadMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/match-squad/match-squad-service", () => ({
  buildMatchSquadViewModel: mocks.buildMatchSquadViewModel,
  buildTournamentSquadViewModel: mocks.buildMatchSquadViewModel,
}));

vi.mock("@/lib/match-squad/player-release-assignment-candidates", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/match-squad/player-release-assignment-candidates")
  >();
  return {
    ...actual,
    evaluateReleaseAssignmentFeasibility: mocks.evaluateReleaseAssignmentFeasibility,
  };
});

vi.mock("@/lib/match-squad/player-release-assignment-producer", () => ({
  emitPlayerReleaseAssignmentNotifications: mocks.emitNotifications,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

import { assignApprovedPlayerReleaseRequest } from "@/lib/match-squad/player-release-assignment-service";
import { PlayerReleaseRequestValidationError } from "@/lib/match-squad/player-release-request-errors";

const baseRequest = {
  id: "req-1",
  tenantId: "tenant-1",
  status: "APPROVED" as const,
  personId: "person-1",
  playerReleaseId: "rel-1",
  sourceTeamSeasonId: "ts-b1",
  targetTeamSeasonId: "ts-b2",
  targetEventId: "event-1",
  updatedAt: new Date(),
  person: { id: "person-1", firstName: "SCE", lastName: "Test", displayName: null },
  sourceTeamSeason: {
    id: "ts-b1",
    displayName: "Junioren B1",
    shortName: null,
    team: { name: "B1", shortName: null },
  },
  targetTeamSeason: {
    id: "ts-b2",
    displayName: "Junioren B2",
    shortName: null,
    team: { name: "B2", shortName: null },
  },
  targetEvent: {
    id: "event-1",
    title: "Test",
    startAt: new Date(),
    endAt: null,
    type: "MATCH" as const,
    status: "SCHEDULED",
  },
  playerRelease: {
    id: "rel-1",
    personId: "person-1",
    status: "ACTIVE" as const,
    revokedAt: null,
    scope: "ACTIVITY" as const,
    eventId: "event-1",
    trainingSessionId: null,
    validFrom: new Date(),
    validUntil: new Date(),
    targetTeamSeasonId: "ts-b2",
    sourceTeamSeasonId: "ts-b1",
  },
  assignmentMatchSquadMember: null,
};

describe("assignApprovedPlayerReleaseRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emitNotifications.mockResolvedValue(undefined);
    mocks.buildMatchSquadViewModel.mockResolvedValue({ eventId: "event-1", selected: [] });
    mocks.evaluateReleaseAssignmentFeasibility.mockResolvedValue({
      canAssign: true,
      blockedReason: null,
      warning: null,
    });
    mocks.findUnique.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        playerReleaseRequest: {
          findFirst: vi.fn().mockResolvedValue({
            id: "req-1",
            status: "APPROVED",
            assignmentMatchSquadMember: null,
          }),
        },
        matchSquad: {
          create: vi.fn().mockResolvedValue({ id: "sq-1", teamSeasonId: "ts-b2" }),
          update: vi.fn(),
        },
        matchSquadMember: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "member-1" }),
        },
      }),
    );
  });

  it("blocks when feasibility rejects assignment", async () => {
    mocks.findFirst.mockResolvedValue(baseRequest);
    mocks.evaluateReleaseAssignmentFeasibility.mockResolvedValue({
      canAssign: false,
      blockedReason: "Die Freigabe wurde inzwischen widerrufen.",
    });

    await expect(
      assignApprovedPlayerReleaseRequest({
        tenantId: "tenant-1",
        requestId: "req-1",
        targetEventId: "event-1",
        targetTeamSeasonId: "ts-b2",
        activityKind: "MATCH",
        actorUserId: "user-1",
        timezone: "Europe/Zurich",
      }),
    ).rejects.toBeInstanceOf(PlayerReleaseRequestValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });

  it("returns idempotent replay when already assigned", async () => {
    mocks.findFirst.mockResolvedValue({
      ...baseRequest,
      assignmentMatchSquadMember: { id: "member-1", matchSquadId: "sq-1", personId: "person-1" },
    });

    const result = await assignApprovedPlayerReleaseRequest({
      tenantId: "tenant-1",
      requestId: "req-1",
      targetEventId: "event-1",
      targetTeamSeasonId: "ts-b2",
      activityKind: "MATCH",
      actorUserId: "user-1",
      timezone: "Europe/Zurich",
    });

    expect(result.idempotentReplay).toBe(true);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });

  it("commits assignment and emits notifications on success", async () => {
    mocks.findFirst.mockResolvedValue(baseRequest);

    const result = await assignApprovedPlayerReleaseRequest({
      tenantId: "tenant-1",
      requestId: "req-1",
      targetEventId: "event-1",
      targetTeamSeasonId: "ts-b2",
      activityKind: "MATCH",
      actorUserId: "user-1",
      timezone: "Europe/Zurich",
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.matchSquadMemberId).toBe("member-1");
    expect(mocks.transaction).toHaveBeenCalled();
    expect(mocks.emitNotifications).toHaveBeenCalled();
  });
});
