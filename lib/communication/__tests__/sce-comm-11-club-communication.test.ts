import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  audienceSpecFromSavedTargetGroupIds,
  wholeOrganisationAudienceSpec,
} from "@/lib/communication/club/club-audience-spec";
import { summarizeClubAudienceSpec } from "@/lib/communication/club/club-audience-summary";
import {
  clubNotificationTypeForCommunicationKind,
  defaultClubNotificationTitleForKind,
} from "@/lib/communication/club/club-communication-notification-kinds";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import {
  createClubCommunicationDraft,
  listClubCommunications,
  publishClubCommunication,
  updateClubCommunicationDraft,
} from "@/lib/communication/club/club-communication-service";
import {
  resolveClubAcknowledgementRequired,
  sendClubFormalCommunication,
} from "@/lib/communication/club/club-formal-communication-service";
import { resolveSenderCommunicationScope } from "@/lib/communication/platform/recipient-resolution/sender-communication-scope";
import { isNotificationTypePushEligible } from "@/lib/push/push-eligibility";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  platformCommunicationConversation: { findFirst: vi.fn(), create: vi.fn() },
  platformCommunication: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: { createMany: vi.fn(), groupBy: vi.fn() },
  platformCommunicationPublicationSchedule: { findMany: vi.fn(), findFirst: vi.fn() },
  targetGroup: { findMany: vi.fn() },
  orgUnit: { count: vi.fn() },
  team: { count: vi.fn() },
  role: { count: vi.fn() },
  person: { findFirst: vi.fn(), findMany: vi.fn() },
  communicationExternalContact: { findMany: vi.fn() },
  orgUnitMembership: { findMany: vi.fn() },
  trainerTeamMember: { findMany: vi.fn() },
  $transaction: vi.fn(),
  getEffectivePermissions: vi.fn(),
  userRole: { count: vi.fn() },
  logAction: vi.fn(),
  resolveCommunicationRecipientsForDispatch: vi.fn(),
  emitClubCommunicationPublishedNotifications: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  attachSelectionToPlatformCommunication: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunicationConversation: mocks.platformCommunicationConversation,
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    platformCommunicationPublicationSchedule: mocks.platformCommunicationPublicationSchedule,
    targetGroup: mocks.targetGroup,
    orgUnit: mocks.orgUnit,
    team: mocks.team,
    role: mocks.role,
    person: mocks.person,
    communicationExternalContact: mocks.communicationExternalContact,
    orgUnitMembership: mocks.orgUnitMembership,
    trainerTeamMember: mocks.trainerTeamMember,
    $transaction: mocks.$transaction,
    userRole: mocks.userRole,
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
    hasPermission: vi.fn(),
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: vi.fn(async () => false),
  isTenantClubAdmin: vi.fn(async () => false),
  resolvePersonIdForUser: vi.fn(async () => "person-sender"),
  resolvePersonCurrentTeamAllocation: vi.fn(),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipientsForDispatch: (...args: unknown[]) =>
    mocks.resolveCommunicationRecipientsForDispatch(...args),
}));

vi.mock("@/lib/communication/club/club-communication-notification-producer", () => ({
  emitClubCommunicationPublishedNotifications: (...args: unknown[]) =>
    mocks.emitClubCommunicationPublishedNotifications(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/communication/platform-email/email-readiness-service", () => ({
  evaluatePlatformEmailReadiness: vi.fn(async () => ({
    ready: true,
    senderConfigured: true,
    transportConfigured: true,
    fromAddressValid: true,
    activeSource: "PLATFORM",
    providerStatus: "VERIFIED",
    platformFallbackActive: true,
    reasons: [],
  })),
}));

vi.mock("@/lib/communication/platform-email/platform-email-dispatch-service", () => ({
  enqueuePlatformCommunicationEmailDeliveries: vi.fn(async () => ({
    examined: 0,
    queued: 0,
    skipped: 0,
  })),
}));

vi.mock("@/lib/communication/sender-identity/prepare-email-sender-for-publish", () => ({
  prepareEmailSenderForPublish: vi.fn(async () => ({
    emailTransportReady: true,
    snapshotData: {},
  })),
}));

describe("SCE-COMM-11 club communication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.platformCommunicationConversation.findFirst.mockResolvedValue({
      id: "conv-org",
      contextKind: "ORGANISATION",
      teamId: null,
    });
    mocks.platformCommunicationConversation.create.mockResolvedValue({ id: "conv-org" });
    mocks.person.findFirst.mockResolvedValue({ id: "person-sender" });
    mocks.person.findMany.mockResolvedValue([]);
    mocks.communicationExternalContact.findMany.mockResolvedValue([]);
    mocks.targetGroup.findMany.mockResolvedValue([{ id: "tg-1", status: "ACTIVE" }]);
    mocks.orgUnit.count.mockResolvedValue(1);
    mocks.team.count.mockResolvedValue(1);
    mocks.role.count.mockResolvedValue(1);
    mocks.logAction.mockResolvedValue(undefined);
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.userRole.count.mockResolvedValue(0);
    mocks.platformCommunicationPublicationSchedule.findMany.mockResolvedValue([]);
    mocks.platformCommunicationPublicationSchedule.findFirst.mockResolvedValue(null);
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        platformCommunication: mocks.platformCommunication,
        platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
      }),
    );
  });

  it("builds canonical whole-organisation and multi-zielgruppe audience specs", () => {
    const whole = wholeOrganisationAudienceSpec();
    expect(whole.components[0]?.structural?.wholeOrganisation).toBe(true);
    const multi = audienceSpecFromSavedTargetGroupIds(["tg-a", "tg-b", "tg-a"]);
    expect(multi.composition).toBe("UNION");
    expect(multi.components).toHaveLength(2);
    expect(summarizeClubAudienceSpec(multi)).toBe("1 Zielgruppe + 1 Zielgruppe");
  });

  it("maps club notification types and push eligibility", () => {
    expect(clubNotificationTypeForCommunicationKind("ANNOUNCEMENT")).toBe("CLUB_ANNOUNCEMENT_PUBLISHED");
    expect(clubNotificationTypeForCommunicationKind("ALERT")).toBe("CLUB_ALERT_PUBLISHED");
    expect(clubNotificationTypeForCommunicationKind("MESSAGE")).toBe("CLUB_COMMUNICATION_PUBLISHED");
    expect(defaultClubNotificationTitleForKind("ALERT", null)).toBe("Vereins-Alarm");
    expect(isNotificationTypePushEligible("CLUB_ALERT_PUBLISHED")).toBe(true);
  });

  it("authorizes club send separately from team trainer defaults", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_TEAM_SEND],
    });
    const trainer = await resolveClubCommunicationAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fca",
      userId: "user-trainer",
    });
    expect(trainer.canView).toBe(false);
    expect(trainer.canSend).toBe(false);

    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_CLUB_SEND, PERMISSIONS.COMMUNICATION_CLUB_VIEW],
    });
    const sender = await resolveClubCommunicationAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fca",
      userId: "user-club",
    });
    expect(sender.canSend).toBe(true);
    expect(sender.canViewEngagementDetail).toBe(true);
  });

  it("creates draft without freezing dispatch snapshots", async () => {
    mocks.platformCommunication.create.mockResolvedValue({
      id: "comm-club-1",
      kind: "ANNOUNCEMENT",
      status: "DRAFT",
    });

    const draft = await createClubCommunicationDraft({
      tenantId: "tenant-a",
      senderUserId: "user-club",
      kind: "ANNOUNCEMENT",
      bodyText: "Hallöchen Verein",
      audienceSpec: audienceSpecFromSavedTargetGroupIds(["tg-1"]),
    });

    expect(draft.id).toBe("comm-club-1");
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).not.toHaveBeenCalled();
    expect(mocks.resolveCommunicationRecipientsForDispatch).not.toHaveBeenCalled();
  });

  it("updates draft audience dynamically before publish", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-club-1",
      status: "DRAFT",
      createdByUserId: "user-club",
      conversation: { contextKind: "ORGANISATION", teamId: null },
      kind: "MESSAGE",
    });
    mocks.platformCommunication.update.mockResolvedValue({});

    await updateClubCommunicationDraft({
      tenantId: "tenant-a",
      communicationId: "comm-club-1",
      actorUserId: "user-club",
      audienceSpec: audienceSpecFromSavedTargetGroupIds(["tg-1"]),
    });

    expect(mocks.platformCommunication.update).toHaveBeenCalled();
  });

  it("publish resolves COMM-03 dispatch and persists immutable snapshots", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-club-1",
      tenantId: "tenant-a",
      status: "DRAFT",
      kind: "ANNOUNCEMENT",
      bodyText: "Published",
      subject: "News",
      contextRef: { kind: "ORGANISATION", tenantId: "tenant-a" },
      audienceSpecJson: wholeOrganisationAudienceSpec(),
      conversation: { contextKind: "ORGANISATION", teamId: null },
    });

    const deliveryTargets = Array.from({ length: 120 }, (_, i) => ({
      subjectPersonId: `p-${i}`,
      deliveryUserId: `u-${i}`,
      channel: "IN_APP" as const,
      capturedAt: "2026-09-27T10:00:00.000Z",
      viaGuardianSubstitution: i % 17 === 0,
    }));

    mocks.resolveCommunicationRecipientsForDispatch.mockResolvedValue({
      core: {
        metadata: {
          audienceFingerprint: "fp-club",
          resolvedAt: "2026-09-27T10:00:00.000Z",
        },
        effectiveRecipientPersonIds: deliveryTargets.map((d) => d.subjectPersonId),
      },
      pipeline: { deliveryTargets },
      communicationDispatchRef: "comm-club-1",
    });

    const result = await publishClubCommunication({
      tenantId: "tenant-a",
      communicationId: "comm-club-1",
      senderUserId: "user-club",
    });

    expect(result.recipientCount).toBe(120);
    expect(mocks.resolveCommunicationRecipientsForDispatch).toHaveBeenCalledTimes(1);
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.emitClubCommunicationPublishedNotifications).toHaveBeenCalled();
  });

  it("formal send creates draft then publishes with acknowledgement defaults", async () => {
    mocks.platformCommunication.create.mockResolvedValue({ id: "comm-alert", kind: "ALERT", status: "DRAFT" });
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-alert",
      tenantId: "tenant-a",
      status: "DRAFT",
      kind: "ALERT",
      bodyText: "Wichtig",
      subject: "Sturm",
      contextRef: { kind: "ORGANISATION", tenantId: "tenant-a" },
      audienceSpecJson: wholeOrganisationAudienceSpec(),
      conversation: { contextKind: "ORGANISATION", teamId: null },
    });
    mocks.resolveCommunicationRecipientsForDispatch.mockResolvedValue({
      core: {
        metadata: { audienceFingerprint: "fp", resolvedAt: "2026-09-27T10:00:00.000Z" },
        effectiveRecipientPersonIds: ["p-1"],
      },
      pipeline: {
        deliveryTargets: [
          {
            subjectPersonId: "p-1",
            deliveryUserId: "u-1",
            channel: "IN_APP",
            capturedAt: "2026-09-27T10:00:00.000Z",
            viaGuardianSubstitution: false,
          },
        ],
      },
      communicationDispatchRef: "comm-alert",
    });

    expect(resolveClubAcknowledgementRequired("ALERT", undefined)).toBe(true);

    await sendClubFormalCommunication({
      tenantId: "tenant-a",
      senderUserId: "user-club",
      kind: "ALERT",
      subject: "Sturm",
      bodyText: "Training abgesagt",
      audienceSpec: wholeOrganisationAudienceSpec(),
    });

    expect(mocks.platformCommunication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acknowledgementRequired: true }) }),
    );
  });

  it("lists club communications without loading recipient snapshots", async () => {
    mocks.platformCommunication.findMany.mockResolvedValue([
      {
        id: "comm-1",
        kind: "MESSAGE",
        status: "PUBLISHED",
        bodyText: "Hi",
        subject: "Hello",
        acknowledgementRequired: false,
        publishedAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        audienceSpecJson: wholeOrganisationAudienceSpec(),
        senderPerson: { id: "p1", firstName: "A", lastName: "Sender" },
        _count: { recipientSnapshots: 12 },
      },
    ]);
    mocks.platformCommunicationPublicationSchedule.findMany.mockResolvedValue([]);

    const items = await listClubCommunications({
      tenantId: "tenant-a",
      viewerUserId: "user-club",
      viewerCanSend: true,
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.deliverySnapshotCount).toBe(12);
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).not.toHaveBeenCalled();
  });

  it("sender scope for organisation requires club send for full organisation", async () => {
    mocks.getEffectivePermissions.mockResolvedValueOnce({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE],
    });
    mocks.person.findMany.mockResolvedValue([{ id: "p-1" }, { id: "p-2" }]);
    mocks.orgUnitMembership.findMany.mockResolvedValue([]);
    mocks.trainerTeamMember.findMany.mockResolvedValue([]);

    const scoped = await resolveSenderCommunicationScope({
      tenantId: "tenant-a",
      senderUserId: "zg-admin",
      context: { kind: "ORGANISATION", tenantId: "tenant-a" },
    });
    expect(scoped.previewScopeLimited).toBe(true);
    expect(scoped.scope.allowedSubjectPersonIds.size).toBeLessThan(3);

    mocks.getEffectivePermissions.mockResolvedValueOnce({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_CLUB_SEND],
    });
    mocks.person.findMany.mockResolvedValue([{ id: "p-1" }, { id: "p-2" }, { id: "p-3" }]);

    const full = await resolveSenderCommunicationScope({
      tenantId: "tenant-a",
      senderUserId: "club-sender",
      context: { kind: "ORGANISATION", tenantId: "tenant-a" },
    });
    expect(full.previewScopeLimited).toBe(false);
    expect(full.scope.allowedSubjectPersonIds.size).toBe(3);
  });
});
