import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  teamSeasonFindFirst: vi.fn(),
  playerSquadMemberFindFirst: vi.fn(),
  playerSquadMemberFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  playerReleaseFindMany: vi.fn(),
  playerReleaseCreate: vi.fn(),
  playerReleaseUpdateMany: vi.fn(),
  playerReleaseUpdate: vi.fn(),
  playerReleaseFindFirst: vi.fn(),
  playerReleaseFindFirstOrThrow: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamSeason: {
      findFirst: mocks.teamSeasonFindFirst,
      findMany: mocks.teamSeasonFindMany,
    },
    playerSquadMember: {
      findFirst: mocks.playerSquadMemberFindFirst,
      findMany: mocks.playerSquadMemberFindMany,
    },
    playerRelease: {
      findMany: mocks.playerReleaseFindMany,
      create: mocks.playerReleaseCreate,
      updateMany: mocks.playerReleaseUpdateMany,
      update: mocks.playerReleaseUpdate,
      findFirst: mocks.playerReleaseFindFirst,
      findFirstOrThrow: mocks.playerReleaseFindFirstOrThrow,
    },
  },
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

vi.mock("../player-release-target-discovery", () => ({
  assertPlayerReleaseTargetEligible: vi.fn(),
  mapTargetDiscoveryToPickerOptions: vi.fn(),
  resolvePlayerReleaseTargetTeams: vi.fn(),
}));

import {
  PLAYER_RELEASE_SIGNAL_BOUNDARIES,
  createPlayerRelease,
  revokePlayerRelease,
} from "../player-release-service";
import { PlayerReleaseOverlapError, PlayerReleaseValidationError } from "../player-release-errors";

const TENANT = "tenant-a";
const TEAM = "team-1";
const SOURCE_TS = "ts-source";
const TARGET_TS = "ts-target";
const PERSON = "person-1";

function releaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "release-1",
    tenantId: TENANT,
    personId: PERSON,
    sourceTeamSeasonId: SOURCE_TS,
    targetTeamSeasonId: TARGET_TS,
    scope: "PERIOD" as const,
    eventId: null,
    trainingSessionId: null,
    validFrom: new Date("2026-10-10T00:00:00.000Z"),
    validUntil: new Date("2026-11-30T00:00:00.000Z"),
    maxMinutes: 45,
    reason: "SPIELPRAXIS" as const,
    note: null,
    status: "ACTIVE" as const,
    revokedAt: null,
    revokedByUserId: null,
    createdByUserId: "user-1",
    updatedByUserId: "user-1",
    createdAt: new Date("2026-10-10T10:00:00.000Z"),
    updatedAt: new Date("2026-10-10T10:00:00.000Z"),
    person: { id: PERSON, firstName: "Alex", lastName: "Test", displayName: null },
    sourceTeamSeason: {
      id: SOURCE_TS,
      displayName: "Junioren B1",
      shortName: null,
      team: { id: TEAM, name: "FC Allschwil Junioren B1", shortName: null },
    },
    targetTeamSeason: {
      id: TARGET_TS,
      displayName: "Junioren B2",
      shortName: null,
      status: "ACTIVE" as const,
      team: { id: "team-2", name: "FC Allschwil Junioren B2", shortName: null },
    },
    ...overrides,
  };
}

describe("player-release-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.teamSeasonFindFirst.mockImplementation(async ({ where }: { where: { id?: string } }) => {
      if (where.id === SOURCE_TS) {
        return { id: SOURCE_TS, seasonId: "season-1", status: "ACTIVE" };
      }
      if (where.id === TARGET_TS) {
        return { id: TARGET_TS };
      }
      return null;
    });
    mocks.playerSquadMemberFindFirst.mockResolvedValue({ id: "psm-1" });
    mocks.playerReleaseFindMany.mockResolvedValue([]);
    mocks.playerReleaseCreate.mockImplementation(async ({ data }: { data: { personId: string } }) =>
      releaseRow({ personId: data.personId }),
    );
  });

  it("documents signal boundaries", () => {
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES).toMatchObject({
      doesNotMutateParticipationResponse: true,
      doesNotMutateMatchSquadMember: true,
      matchSquadSelectionDoesNotBlockRelease: true,
      availabilityDoesNotCreateOrRevokeRelease: true,
    });
  });

  it("createPlayerRelease requires structural roster membership", async () => {
    mocks.playerSquadMemberFindFirst.mockResolvedValue(null);
    await expect(
      createPlayerRelease({
        tenantId: TENANT,
        teamId: TEAM,
        sourceTeamSeasonId: SOURCE_TS,
        actorUserId: "user-1",
        personId: PERSON,
        targetTeamSeasonId: TARGET_TS,
        validFrom: "2026-10-10",
        validUntil: "2026-11-30",
        reason: "SPIELPRAXIS",
      }),
    ).rejects.toBeInstanceOf(PlayerReleaseValidationError);
  });

  it("createPlayerRelease rejects source == target", async () => {
    await expect(
      createPlayerRelease({
        tenantId: TENANT,
        teamId: TEAM,
        sourceTeamSeasonId: SOURCE_TS,
        actorUserId: "user-1",
        personId: PERSON,
        targetTeamSeasonId: SOURCE_TS,
        validFrom: "2026-10-10",
        validUntil: "2026-11-30",
        reason: "SPIELPRAXIS",
      }),
    ).rejects.toMatchObject({ code: "SAME_TARGET" });
  });

  it("createPlayerRelease rejects invalid date range", async () => {
    await expect(
      createPlayerRelease({
        tenantId: TENANT,
        teamId: TEAM,
        sourceTeamSeasonId: SOURCE_TS,
        actorUserId: "user-1",
        personId: PERSON,
        targetTeamSeasonId: TARGET_TS,
        validFrom: "2026-12-01",
        validUntil: "2026-11-01",
        reason: "SPIELPRAXIS",
      }),
    ).rejects.toMatchObject({ code: "INVALID_DATE_RANGE" });
  });

  it("createPlayerRelease rejects overlapping active rules", async () => {
    mocks.playerReleaseFindMany.mockResolvedValue([
      {
        id: "existing",
        scope: "PERIOD",
        eventId: null,
        trainingSessionId: null,
        validFrom: new Date("2026-10-01T00:00:00.000Z"),
        validUntil: new Date("2026-10-30T00:00:00.000Z"),
      },
    ]);

    await expect(
      createPlayerRelease({
        tenantId: TENANT,
        teamId: TEAM,
        sourceTeamSeasonId: SOURCE_TS,
        actorUserId: "user-1",
        personId: PERSON,
        targetTeamSeasonId: TARGET_TS,
        validFrom: "2026-10-15",
        validUntil: "2026-11-01",
        reason: "SPIELPRAXIS",
      }),
    ).rejects.toBeInstanceOf(PlayerReleaseOverlapError);
  });

  it("createPlayerRelease validates maxMinutes", async () => {
    await expect(
      createPlayerRelease({
        tenantId: TENANT,
        teamId: TEAM,
        sourceTeamSeasonId: SOURCE_TS,
        actorUserId: "user-1",
        personId: PERSON,
        targetTeamSeasonId: TARGET_TS,
        validFrom: "2026-10-10",
        validUntil: "2026-11-30",
        maxMinutes: 0,
        reason: "SPIELPRAXIS",
      }),
    ).rejects.toBeInstanceOf(PlayerReleaseValidationError);
  });

  it("revokePlayerRelease keeps history with REVOKED status", async () => {
    mocks.playerReleaseFindFirst.mockResolvedValue(releaseRow());
    mocks.playerReleaseUpdate.mockResolvedValue(
      releaseRow({ status: "REVOKED", revokedAt: new Date("2026-10-11T00:00:00.000Z") }),
    );

    const result = await revokePlayerRelease({
      tenantId: TENANT,
      teamId: TEAM,
      sourceTeamSeasonId: SOURCE_TS,
      releaseId: "release-1",
      actorUserId: "user-1",
    });

    expect(result.status).toBe("REVOKED");
    expect(mocks.playerReleaseUpdate).toHaveBeenCalled();
  });
});
