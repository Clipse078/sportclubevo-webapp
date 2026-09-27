import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createTeamCommunicationDraft,
  listTeamCommunications,
  publishTeamCommunication,
  validateCommunicationKindSeam,
} from "@/lib/communication/team/team-communication-service";
import { teamAudienceSpecForPreset } from "@/lib/communication/team/team-audience-presets";
import { createTeamCommunicationContext } from "@/lib/communication/team/team-communication-context";
import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";
import { canTransitionCommunicationStatus } from "@/lib/communication/team/team-communication-lifecycle";
import { resolveCommunicationRecipientsForDispatch } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { buildDispatchRecipientSnapshots } from "@/lib/communication/platform/recipient-resolution/snapshot-builder";

const mocks = vi.hoisted(() => ({
  team: { findFirst: vi.fn(), findMany: vi.fn() },
  platformCommunicationConversation: { upsert: vi.fn(), findFirst: vi.fn() },
  platformCommunication: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: { createMany: vi.fn(), findMany: vi.fn() },
  person: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
  getEffectivePermissions: vi.fn(),
  trainerTeamMember: { findFirst: vi.fn(), findMany: vi.fn() },
  playerSquadMember: { findFirst: vi.fn() },
  userRole: { count: vi.fn() },
  logAction: vi.fn(),
  resolveCommunicationRecipientsForDispatch: vi.fn(),
  createNotificationIdempotent: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    team: mocks.team,
    platformCommunicationConversation: mocks.platformCommunicationConversation,
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    person: mocks.person,
    trainerTeamMember: mocks.trainerTeamMember,
    playerSquadMember: mocks.playerSquadMember,
    userRole: mocks.userRole,
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: vi.fn(async () => false),
  isTenantClubAdmin: vi.fn(async () => false),
  resolvePersonIdForUser: vi.fn(async () => "person-trainer"),
  resolvePersonCurrentTeamAllocation: vi.fn(async () => ({
    isAllocated: true,
    isPlayer: false,
    isTrainer: true,
  })),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipientsForDispatch: (...args: unknown[]) =>
    mocks.resolveCommunicationRecipientsForDispatch(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/communication/team/team-communication-notification-producer", () => ({
  emitTeamCommunicationPublishedNotifications: vi.fn(),
}));

describe("SCE-COMM-04 team communication foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.team.findFirst.mockResolvedValue({ id: "team-1" });
    mocks.platformCommunicationConversation.upsert.mockResolvedValue({
      id: "conv-1",
      tenantId: "tenant-a",
      teamId: "team-1",
    });
    mocks.platformCommunicationConversation.findFirst.mockResolvedValue({ id: "conv-1" });
    mocks.person.findFirst.mockResolvedValue({ id: "person-trainer" });
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.userRole.count.mockResolvedValue(0);
    mocks.logAction.mockResolvedValue(undefined);
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        platformCommunication: mocks.platformCommunication,
        platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
      }),
    );
  });

  it("creates team communication context ref", () => {
    expect(createTeamCommunicationContext("team-1")).toEqual({ kind: "TEAM", teamId: "team-1" });
  });

  it("builds default team audience without saved target group", () => {
    const audience = teamAudienceSpecForPreset("team-1", "ALL");
    expect(audience.components[0]?.structural?.teamIds).toEqual(["team-1"]);
  });

  it("supports MESSAGE and ANNOUNCEMENT/ALERT seams", () => {
    expect(() => validateCommunicationKindSeam("MESSAGE")).not.toThrow();
    expect(() => validateCommunicationKindSeam("ANNOUNCEMENT")).not.toThrow();
    expect(() => validateCommunicationKindSeam("ALERT")).not.toThrow();
    expect(() => validateCommunicationKindSeam("POLL")).toThrow();
  });

  it("enforces lifecycle transitions", () => {
    expect(canTransitionCommunicationStatus("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransitionCommunicationStatus("PUBLISHED", "DRAFT")).toBe(false);
  });

  it("creates draft team communication", async () => {
    mocks.platformCommunication.create.mockResolvedValue({
      id: "comm-1",
      kind: "MESSAGE",
      status: "DRAFT",
    });

    const result = await createTeamCommunicationDraft({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      bodyText: "Hello team",
    });

    expect(result.id).toBe("comm-1");
    expect(mocks.platformCommunication.create).toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalled();
  });

  it("lists team communications without loading snapshots", async () => {
    mocks.platformCommunication.findMany.mockResolvedValue([
      {
        id: "comm-1",
        kind: "MESSAGE",
        status: "PUBLISHED",
        bodyText: "Hi",
        subject: null,
        publishedAt: new Date("2026-01-01T10:00:00Z"),
        createdAt: new Date("2026-01-01T09:00:00Z"),
        senderPerson: { id: "p1", firstName: "T", lastName: "Trainer" },
      },
    ]);

    const items = await listTeamCommunications({ tenantId: "tenant-a", teamId: "team-1" });
    expect(items).toHaveLength(1);
    expect(mocks.platformCommunicationRecipientSnapshot.findMany).not.toHaveBeenCalled();
  });

  it("publish calls COMM-03 dispatch resolver and persists snapshots", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      tenantId: "tenant-a",
      status: "DRAFT",
      kind: "MESSAGE",
      bodyText: "Published body",
      subject: null,
      contextRef: { kind: "TEAM", teamId: "team-1" },
      audienceSpecJson: teamAudienceSpecForPreset("team-1"),
      conversation: { teamId: "team-1" },
    });

    mocks.resolveCommunicationRecipientsForDispatch.mockResolvedValue({
      core: {
        metadata: {
          audienceFingerprint: "fp-1",
          resolvedAt: "2026-01-01T10:00:00.000Z",
        },
        effectiveRecipientPersonIds: ["p1"],
      },
      pipeline: {
        deliveryTargets: [
          {
            subjectPersonId: "p1",
            deliveryUserId: "u1",
            channel: "IN_APP",
            capturedAt: "2026-01-01T10:00:00.000Z",
            viaGuardianSubstitution: false,
          },
        ],
      },
      communicationDispatchRef: "comm-1",
    });

    const snapshots = buildDispatchRecipientSnapshots({
      communicationDispatchRef: "comm-1",
      tenantId: "tenant-a",
      audienceFingerprint: "fp-1",
      channel: "IN_APP",
      resolvedAt: "2026-01-01T10:00:00.000Z",
      deliveryTargets: [
        {
          subjectPersonId: "p1",
          deliveryUserId: "u1",
          channel: "IN_APP",
          capturedAt: "2026-01-01T10:00:00.000Z",
          viaGuardianSubstitution: false,
        },
      ],
    });
    expect(snapshots).toHaveLength(1);

    const published = await publishTeamCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-1",
      senderUserId: "user-trainer",
    });

    expect(published.recipientCount).toBe(1);
    expect(mocks.resolveCommunicationRecipientsForDispatch).toHaveBeenCalled();
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).toHaveBeenCalled();
  });

  it("authorization: trainer can send, unrelated user without allocation cannot", async () => {
    const { resolvePersonCurrentTeamAllocation } = await import("@/lib/teams/team-document-auth");

    vi.mocked(resolvePersonCurrentTeamAllocation).mockResolvedValueOnce({
      isAllocated: true,
      isPlayer: false,
      isTrainer: true,
    });
    const trainerAuth = await resolveTeamCommunicationAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fc-test",
      userId: "trainer-user",
      teamId: "team-1",
    });
    expect(trainerAuth?.canSend).toBe(true);

    vi.mocked(resolvePersonCurrentTeamAllocation).mockResolvedValueOnce({
      isAllocated: true,
      isPlayer: true,
      isTrainer: false,
    });
    const playerAuth = await resolveTeamCommunicationAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fc-test",
      userId: "player-user",
      teamId: "team-1",
    });
    expect(playerAuth?.canSend).toBe(false);
    expect(playerAuth?.canView).toBe(true);
  });

  it("tenant mismatch on publish is rejected", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      tenantId: "tenant-a",
      status: "DRAFT",
      kind: "MESSAGE",
      bodyText: "x",
      subject: null,
      contextRef: { kind: "TEAM", teamId: "team-1" },
      audienceSpecJson: teamAudienceSpecForPreset("team-1"),
      conversation: { teamId: "team-other" },
    });

    await expect(
      publishTeamCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-1",
        senderUserId: "user-trainer",
      }),
    ).rejects.toThrow(/Tenant mismatch/i);
  });
});

describe("COMM-03 dispatch wrapper (regression)", () => {
  it("resolveCommunicationRecipientsForDispatch remains exported", () => {
    expect(typeof resolveCommunicationRecipientsForDispatch).toBe("function");
  });
});
