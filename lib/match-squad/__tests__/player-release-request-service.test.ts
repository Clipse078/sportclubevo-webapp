import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  playerReleaseFindFirst: vi.fn(),
  playerSquadMemberFindFirst: vi.fn(),
  playerReleaseRequestFindFirst: vi.fn(),
  playerReleaseRequestCreate: vi.fn(),
  participationResponseFindFirst: vi.fn(),
  discover: vi.fn(),
  conflictHints: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerRelease: { findFirst: mocks.playerReleaseFindFirst },
    playerSquadMember: { findFirst: mocks.playerSquadMemberFindFirst },
    playerReleaseRequest: {
      findFirst: mocks.playerReleaseRequestFindFirst,
      create: mocks.playerReleaseRequestCreate,
    },
    participationResponse: { findFirst: mocks.participationResponseFindFirst },
  },
}));

vi.mock("@/lib/match-squad/player-release-discovery-service", () => ({
  discoverReleasedPlayersForTargetActivity: mocks.discover,
}));

vi.mock("@/lib/match-squad/person-activity-conflict-hints", () => ({
  loadPersonActivityConflictHints: mocks.conflictHints,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

import { createPlayerReleaseRequest } from "@/lib/match-squad/player-release-request-service";
import { PlayerReleaseRequestDuplicateError, PlayerReleaseRequestValidationError } from "@/lib/match-squad/player-release-request-errors";

describe("createPlayerReleaseRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.playerReleaseFindFirst.mockResolvedValue({
      id: "rel-1",
      tenantId: "tenant",
      personId: "person-1",
      sourceTeamSeasonId: "source-ts",
      targetTeamSeasonId: "target-ts",
      scope: "PERIOD",
      eventId: null,
      trainingSessionId: null,
      validFrom: new Date("2026-10-01T00:00:00.000Z"),
      validUntil: new Date("2026-11-30T00:00:00.000Z"),
      maxMinutes: 45,
      reason: "SPIELPRAXIS",
      status: "ACTIVE",
    });
    mocks.playerSquadMemberFindFirst.mockResolvedValue({ id: "psm-1" });
    mocks.playerReleaseRequestFindFirst.mockResolvedValue(null);
    mocks.participationResponseFindFirst.mockResolvedValue({ status: "YES" });
    mocks.conflictHints.mockResolvedValue([]);
    mocks.discover.mockResolvedValue([
      {
        releaseId: "rel-1",
        canRequest: true,
        request: null,
        requestBlockedReason: null,
      },
    ]);
    mocks.playerReleaseRequestCreate.mockResolvedValue({
      id: "req-1",
      tenantId: "tenant",
      playerReleaseId: "rel-1",
      personId: "person-1",
      sourceTeamSeasonId: "source-ts",
      targetTeamSeasonId: "target-ts",
      targetEventId: "event-1",
      requestedMinutes: null,
      requestNote: null,
      status: "PENDING",
      decisionNote: null,
      releaseMaxMinutesSnapshot: 45,
      releaseReasonSnapshot: "SPIELPRAXIS",
      decidedAt: null,
      updatedAt: new Date("2026-10-11T12:00:00.000Z"),
      person: { id: "person-1", firstName: "Test", lastName: "Spieler", displayName: null },
      sourceTeamSeason: {
        id: "source-ts",
        displayName: "B1",
        shortName: null,
        team: { name: "B1", shortName: null },
      },
      targetTeamSeason: {
        id: "target-ts",
        displayName: "B2",
        shortName: null,
        team: { name: "B2", shortName: null },
      },
      targetEvent: {
        id: "event-1",
        title: "Spiel",
        startAt: new Date("2026-10-17T13:00:00.000Z"),
        endAt: null,
        type: "MATCH",
      },
      playerRelease: {
        id: "rel-1",
        maxMinutes: 45,
        reason: "SPIELPRAXIS",
        status: "ACTIVE",
        scope: "PERIOD",
        eventId: null,
        trainingSessionId: null,
        validFrom: new Date("2026-10-01T00:00:00.000Z"),
        validUntil: new Date("2026-11-30T00:00:00.000Z"),
        targetTeamSeasonId: "target-ts",
      },
    });
  });

  it("creates PENDING request when release is valid", async () => {
    const result = await createPlayerReleaseRequest({
      tenantId: "tenant",
      actorUserId: "user-1",
      targetTeamSeasonId: "target-ts",
      targetEventId: "event-1",
      targetEventType: "MATCH",
      targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
      targetEndAt: null,
      timezone: "Europe/Zurich",
      playerReleaseId: "rel-1",
    });
    expect(result.status).toBe("PENDING");
    expect(mocks.playerReleaseRequestCreate).toHaveBeenCalled();
  });

  it("blocks duplicate pending request", async () => {
    mocks.playerReleaseRequestFindFirst.mockResolvedValue({
      id: "req-existing",
      status: "PENDING",
    });
    await expect(
      createPlayerReleaseRequest({
        tenantId: "tenant",
        actorUserId: "user-1",
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-1",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        targetEndAt: null,
        timezone: "Europe/Zurich",
        playerReleaseId: "rel-1",
      }),
    ).rejects.toBeInstanceOf(PlayerReleaseRequestDuplicateError);
  });

  it("rejects requested minutes above release max", async () => {
    await expect(
      createPlayerReleaseRequest({
        tenantId: "tenant",
        actorUserId: "user-1",
        targetTeamSeasonId: "target-ts",
        targetEventId: "event-1",
        targetEventType: "MATCH",
        targetActivityStartAt: new Date("2026-10-17T13:00:00.000Z"),
        targetEndAt: null,
        timezone: "Europe/Zurich",
        playerReleaseId: "rel-1",
        requestedMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(PlayerReleaseRequestValidationError);
  });
});
