import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  trainerTeamMemberFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  tenantFindFirst: vi.fn(),
  playerReleaseFindMany: vi.fn(),
  playerReleaseRequestFindMany: vi.fn(),
  notificationFindUnique: vi.fn(),
  notificationUpdate: vi.fn(),
  transaction: vi.fn(),
  createNotificationIdempotent: vi.fn(),
  loadEffectivePreferencesForUsers: vi.fn(),
  prismaTeamSeasonFindFirst: vi.fn(),
  trainerTeamMemberFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainerTeamMember: {
      findMany: mocks.trainerTeamMemberFindMany,
      findFirst: mocks.trainerTeamMemberFindFirst,
    },
    teamSeason: {
      findMany: mocks.teamSeasonFindMany,
      findFirst: mocks.prismaTeamSeasonFindFirst,
    },
    tenant: { findFirst: mocks.tenantFindFirst },
    playerRelease: { findMany: mocks.playerReleaseFindMany },
    playerReleaseRequest: { findMany: mocks.playerReleaseRequestFindMany },
    notification: {
      findUnique: mocks.notificationFindUnique,
      update: mocks.notificationUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: mocks.createNotificationIdempotent,
}));

vi.mock("@/lib/notifications/preference-service", () => ({
  loadEffectivePreferencesForUsers: mocks.loadEffectivePreferencesForUsers,
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasPermission: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: vi.fn().mockResolvedValue(false),
  isTenantClubAdmin: vi.fn().mockResolvedValue(false),
  resolvePersonIdForUser: vi.fn().mockResolvedValue("person-b3"),
}));

vi.mock("@/lib/match-squad/player-release-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../player-release-auth")>();
  return {
    ...actual,
  };
});

import { resolveTargetTeamTrainerRecipientUserIds } from "../player-release-target-trainer-recipients";
import { listInboundTargetedPlayerReleases } from "../player-release-target-awareness-service";
import {
  emitTargetedPlayerReleaseAwareness,
  PLAYER_RELEASE_AWARENESS_AGGREGATION_WINDOW_MS,
} from "../player-release-awareness-producer";
import { buildTargetedPlayerReleaseAwarenessCopy } from "../player-release-target-awareness-copy";
import { resolvePlayerReleaseTargetViewAccess } from "../player-release-auth";

const TENANT = "tenant-1";
const SOURCE_TS = "ts-b1";
const TARGET_TS = "ts-b2";
const TEAM_B2 = "team-b2";

function activeRelease(overrides: Record<string, unknown> = {}) {
  const today = new Date("2026-10-11T12:00:00.000Z");
  const from = new Date("2026-10-01T00:00:00.000Z");
  const until = new Date("2026-11-30T00:00:00.000Z");
  return {
    id: "release-1",
    personId: "person-1",
    sourceTeamSeasonId: SOURCE_TS,
    validFrom: from,
    validUntil: until,
    maxMinutes: 45,
    reason: "SPIELPRAXIS",
    status: "ACTIVE",
    person: { id: "person-1", firstName: "A", lastName: "One", displayName: null },
    sourceTeamSeason: {
      id: SOURCE_TS,
      displayName: "Junioren B1",
      shortName: null,
      team: { name: "B1", shortName: null },
    },
    ...overrides,
  };
}

describe("player-release-target-awareness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantFindFirst.mockResolvedValue({ timezone: "Europe/Zurich" });
    mocks.playerReleaseRequestFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        notification: {
          findUnique: mocks.notificationFindUnique,
          update: mocks.notificationUpdate,
        },
      }),
    );
    mocks.loadEffectivePreferencesForUsers.mockResolvedValue(
      new Map([["user-a", { inAppEnabled: true, emailEnabled: false, pushEnabled: false }]]),
    );
    mocks.notificationFindUnique.mockResolvedValue(null);
    mocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED", notificationId: "n-1" });
    mocks.prismaTeamSeasonFindFirst.mockResolvedValue({ id: TARGET_TS, teamId: "team-b2" });
  });

  it("ONE TARGETED RELEASE — resolves B2 trainer recipients with user accounts", async () => {
    mocks.trainerTeamMemberFindMany.mockResolvedValue([
      { person: { userId: "user-trainer-a" } },
      { person: { userId: "user-trainer-b" } },
      { person: { userId: null } },
    ]);

    const result = await resolveTargetTeamTrainerRecipientUserIds({
      tenantId: TENANT,
      targetTeamSeasonId: TARGET_TS,
    });

    expect(result.recipientUserIds.sort()).toEqual(["user-trainer-a", "user-trainer-b"]);
    expect(result.trainersWithoutUserAccount).toBe(1);
  });

  it("NO USER ACCOUNT — emit completes without creating notifications", async () => {
    mocks.trainerTeamMemberFindMany.mockResolvedValue([{ person: { userId: null } }]);
    mocks.teamSeasonFindMany.mockResolvedValue([
      {
        id: SOURCE_TS,
        displayName: "Junioren B1",
        shortName: null,
        teamId: "team-b1",
        team: { name: "B1", shortName: null },
      },
      {
        id: TARGET_TS,
        displayName: "Junioren B2",
        shortName: null,
        teamId: TEAM_B2,
        team: { name: "B2", shortName: null },
      },
    ]);
    mocks.playerReleaseFindMany.mockResolvedValue([activeRelease()]);

    await expect(
      emitTargetedPlayerReleaseAwareness({
        tenantId: TENANT,
        sourceTeamSeasonId: SOURCE_TS,
        targetTeamSeasonId: TARGET_TS,
        actorUserId: "user-source",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createNotificationIdempotent).not.toHaveBeenCalled();
  });

  it("THREE TARGETED RELEASES — aggregated copy uses count 3", () => {
    const copy = buildTargetedPlayerReleaseAwarenessCopy({
      sourceTeamLabel: "Junioren B1",
      targetTeamLabel: "Junioren B2",
      playerCount: 3,
    });
    expect(copy.title).toBe("Junioren B1 hat 3 Spieler für Junioren B2 freigegeben.");
  });

  it("SAME ACTIVITY — match-specific notification copy", () => {
    const copy = buildTargetedPlayerReleaseAwarenessCopy({
      sourceTeamLabel: "Junioren B1",
      targetTeamLabel: "Junioren B2",
      playerCount: 2,
      activityKind: "MATCH",
      activityTitle: "FC Basel",
      activityScheduleLine: "Sa. 17.10 · 14:00",
    });
    expect(copy.title).toBe(
      "Junioren B1 hat 2 Spieler für euer Spiel gegen FC Basel freigegeben.",
    );
    expect(copy.body).toBe("Sa. 17.10 · 14:00");
  });

  it("THREE TARGETED RELEASES — single notification with player count 3", async () => {
    mocks.trainerTeamMemberFindMany.mockResolvedValue([{ person: { userId: "user-a" } }]);
    mocks.teamSeasonFindMany.mockResolvedValue([
      {
        id: SOURCE_TS,
        displayName: "Junioren B1",
        shortName: null,
        teamId: "team-b1",
        team: { name: "B1", shortName: null },
      },
      {
        id: TARGET_TS,
        displayName: "Junioren B2",
        shortName: null,
        teamId: TEAM_B2,
        team: { name: "B2", shortName: null },
      },
    ]);
    mocks.playerReleaseFindMany.mockResolvedValue([
      activeRelease({ id: "r1", personId: "p1" }),
      activeRelease({ id: "r2", personId: "p2" }),
      activeRelease({ id: "r3", personId: "p3" }),
    ]);

    await emitTargetedPlayerReleaseAwareness({
      tenantId: TENANT,
      sourceTeamSeasonId: SOURCE_TS,
      targetTeamSeasonId: TARGET_TS,
      actorUserId: "user-source",
      awarenessBurstKey: "burst-1",
    });

    expect(mocks.createNotificationIdempotent).toHaveBeenCalledTimes(1);
    expect(mocks.createNotificationIdempotent.mock.calls[0]?.[1]?.title).toContain("3 Spieler");
  });

  it("EXPIRED and REVOKED releases are excluded from actionable inbound list", async () => {
    mocks.playerReleaseFindMany.mockResolvedValue([
      activeRelease({ id: "active" }),
      activeRelease({
        id: "expired",
        validFrom: new Date("2020-01-01"),
        validUntil: new Date("2020-01-02"),
      }),
      activeRelease({ id: "revoked", status: "REVOKED" }),
    ]);

    const rows = await listInboundTargetedPlayerReleases({
      tenantId: TENANT,
      targetTeamSeasonId: TARGET_TS,
      timezone: "Europe/Zurich",
      now: new Date("2026-10-11T12:00:00.000Z"),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.releaseId).toBe("active");
  });

  it("TARGET_CHANGED — inbound list scoped to target team season query", async () => {
    mocks.playerReleaseFindMany.mockResolvedValue([activeRelease({ id: "for-b2" })]);

    await listInboundTargetedPlayerReleases({
      tenantId: TENANT,
      targetTeamSeasonId: TARGET_TS,
      timezone: "Europe/Zurich",
    });

    expect(mocks.playerReleaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetTeamSeasonId: TARGET_TS }),
      }),
    );
  });

  it("REQUESTED / APPROVED states surface on inbound overview", async () => {
    mocks.playerReleaseFindMany.mockResolvedValue([activeRelease({ id: "r1" })]);
    mocks.playerReleaseRequestFindMany.mockResolvedValue([
      { id: "req-1", playerReleaseId: "r1", status: "APPROVED", updatedAt: new Date() },
    ]);

    const rows = await listInboundTargetedPlayerReleases({
      tenantId: TENANT,
      targetTeamSeasonId: TARGET_TS,
      timezone: "Europe/Zurich",
    });

    expect(rows[0]?.request?.statusLabel).toBe("Genehmigt");
  });

  it("REJECTED state surfaces on inbound overview", async () => {
    mocks.playerReleaseFindMany.mockResolvedValue([activeRelease({ id: "r1" })]);
    mocks.playerReleaseRequestFindMany.mockResolvedValue([
      { id: "req-1", playerReleaseId: "r1", status: "REJECTED", updatedAt: new Date() },
    ]);

    const rows = await listInboundTargetedPlayerReleases({
      tenantId: TENANT,
      targetTeamSeasonId: TARGET_TS,
      timezone: "Europe/Zurich",
    });

    expect(rows[0]?.request?.statusLabel).toBe("Abgelehnt");
  });

  it("WRONG TEAM — non-target trainer denied by target view access", async () => {
    mocks.prismaTeamSeasonFindFirst.mockResolvedValue({ id: TARGET_TS, teamId: "team-b2" });
    mocks.trainerTeamMemberFindFirst.mockResolvedValue(null);

    const allowed = await resolvePlayerReleaseTargetViewAccess({
      userId: "user-b3",
      tenantId: TENANT,
      tenantKey: "fca",
      targetTeamSeasonId: TARGET_TS,
    });

    expect(allowed).toBe(false);
  });

  it("aggregation window constant is bounded", () => {
    expect(PLAYER_RELEASE_AWARENESS_AGGREGATION_WINDOW_MS).toBeGreaterThan(0);
  });
});
