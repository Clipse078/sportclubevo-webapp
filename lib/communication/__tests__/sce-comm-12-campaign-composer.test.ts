import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  audienceSpecFromSavedTargetGroupIds,
  audienceSpecFromStructuralSelectors,
  wholeOrganisationAudienceSpec,
} from "@/lib/communication/club/club-audience-spec";
import { resolveCampaignAuthorization } from "@/lib/communication/campaign/campaign-authorization";
import { CAMPAIGN_BOUNDARY_FLAGS } from "@/lib/communication/campaign/campaign-boundaries";
import {
  defaultCampaignOrchestrationMeta,
  parseCampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import {
  campaignNotificationType,
  defaultCampaignNotificationTitle,
} from "@/lib/communication/campaign/campaign-notification-kinds";
import {
  archiveCampaign,
  createCampaignDraft,
  listCampaigns,
  markCampaignReady,
  publishCampaign,
  updateCampaignDraft,
} from "@/lib/communication/campaign/campaign-service";
import { canInspectCampaignEngagementDetail } from "@/lib/communication/campaign/campaign-engagement-service";
import { listClubCommunications } from "@/lib/communication/club/club-communication-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { isNotificationTypePushEligible } from "@/lib/push/push-eligibility";

const mocks = vi.hoisted(() => ({
  platformCommunicationConversation: { findFirst: vi.fn(), create: vi.fn() },
  platformCommunication: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: { createMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  platformCommunicationPublicationSchedule: { findMany: vi.fn(), findFirst: vi.fn() },
  targetGroup: { findMany: vi.fn() },
  orgUnit: { count: vi.fn() },
  team: { count: vi.fn() },
  role: { count: vi.fn() },
  person: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
  getEffectivePermissions: vi.fn(),
  userRole: { count: vi.fn() },
  logAction: vi.fn(),
  resolveCommunicationRecipientsForDispatch: vi.fn(),
  emitCampaignPublishedNotifications: vi.fn(),
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
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipientsForDispatch: (...args: unknown[]) =>
    mocks.resolveCommunicationRecipientsForDispatch(...args),
}));

vi.mock("@/lib/communication/campaign/campaign-notification-producer", () => ({
  emitCampaignPublishedNotifications: (...args: unknown[]) =>
    mocks.emitCampaignPublishedNotifications(...args),
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

function mockCampaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "camp-1",
    tenantId: "tenant-a",
    status: "DRAFT",
    kind: "CAMPAIGN",
    bodyText: "Campaign body",
    subject: "Public title",
    internalName: "Internal campaign",
    contextRef: { kind: "ORGANISATION", tenantId: "tenant-a" },
    audienceSpecJson: wholeOrganisationAudienceSpec(),
    conversation: { contextKind: "ORGANISATION", teamId: null },
    createdByUserId: "user-club",
    senderPersonId: "person-sender",
    orchestrationMetaJson: defaultCampaignOrchestrationMeta(),
    ...overrides,
  };
}

function mockDispatch(recipientCount: number, communicationId = "camp-1") {
  const deliveryTargets = Array.from({ length: recipientCount }, (_, i) => ({
    subjectPersonId: `p-${i}`,
    deliveryUserId: `u-${i}`,
    channel: "IN_APP" as const,
    capturedAt: "2026-09-27T10:00:00.000Z",
    viaGuardianSubstitution: i % 23 === 0,
  }));
  mocks.resolveCommunicationRecipientsForDispatch.mockResolvedValue({
    core: {
      metadata: {
        audienceFingerprint: "fp-campaign",
        resolvedAt: "2026-09-27T10:00:00.000Z",
      },
      effectiveRecipientPersonIds: deliveryTargets.map((d) => d.subjectPersonId),
    },
    pipeline: { deliveryTargets },
    communicationDispatchRef: communicationId,
  });
}

describe("SCE-COMM-12 campaign composer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.platformCommunicationConversation.findFirst.mockResolvedValue({
      id: "conv-org",
      contextKind: "ORGANISATION",
      teamId: null,
    });
    mocks.person.findFirst.mockResolvedValue({ id: "person-sender" });
    mocks.targetGroup.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in ?? [];
      return ids.map((id) => ({ id, status: "ACTIVE" as const }));
    });
    mocks.orgUnit.count.mockResolvedValue(1);
    mocks.team.count.mockResolvedValue(1);
    mocks.role.count.mockResolvedValue(1);
    mocks.logAction.mockResolvedValue(undefined);
    mocks.platformCommunicationPublicationSchedule.findMany.mockResolvedValue([]);
    mocks.platformCommunicationPublicationSchedule.findFirst.mockResolvedValue(null);
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.userRole.count.mockResolvedValue(0);
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        platformCommunication: {
          updateMany: mocks.platformCommunication.updateMany,
          findFirst: mocks.platformCommunication.findFirst,
        },
        platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
      }),
    );
    mocks.platformCommunication.updateMany.mockResolvedValue({ count: 1 });
  });

  it("exposes explicit COMM-13/14/15/16 boundary flags", () => {
    expect(CAMPAIGN_BOUNDARY_FLAGS.outboundEmail).toBe("EMAIL_IMPLEMENTED");
    expect(CAMPAIGN_BOUNDARY_FLAGS.sponsor).toBe("SPONSOR_AUDIENCE_INTEGRATED");
    expect(CAMPAIGN_BOUNDARY_FLAGS.communicationCenterImap).toBe("IMAP_NOT_IMPLEMENTED");
    expect(CAMPAIGN_BOUNDARY_FLAGS.templates).toBe("TEMPLATES_NOT_IMPLEMENTED");
    expect(CAMPAIGN_BOUNDARY_FLAGS.scheduling).toBe("SCHEDULING_NOT_IMPLEMENTED");
  });

  it("maps campaign notifications and push eligibility (COMM-09 seam)", () => {
    expect(campaignNotificationType()).toBe("CLUB_CAMPAIGN_PUBLISHED");
    expect(defaultCampaignNotificationTitle(null, "Internal")).toBe("Internal");
    expect(isNotificationTypePushEligible("CLUB_CAMPAIGN_PUBLISHED")).toBe(true);
  });

  it("authorizes campaign publish via communication.club.send", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_CLUB_SEND],
    });
    const auth = await resolveCampaignAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fca",
      userId: "user-club",
    });
    expect(auth.canSend).toBe(true);
  });

  it("creates campaign draft without recipient snapshots", async () => {
    mocks.platformCommunication.create.mockResolvedValue({
      id: "camp-new",
      kind: "CAMPAIGN",
      status: "DRAFT",
    });

    const draft = await createCampaignDraft({
      tenantId: "tenant-a",
      senderUserId: "user-club",
      internalName: "Frühjahr 2026",
      subject: "Wichtige Info",
      bodyText: "Inhalt",
      audienceSpec: wholeOrganisationAudienceSpec(),
    });

    expect(draft.id).toBe("camp-new");
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).not.toHaveBeenCalled();
    expect(mocks.resolveCommunicationRecipientsForDispatch).not.toHaveBeenCalled();
  });

  it("supports whole org, single/multi zielgruppe, and structural audience specs", () => {
    const whole = wholeOrganisationAudienceSpec();
    expect(whole.components[0]?.structural?.wholeOrganisation).toBe(true);

    const single = audienceSpecFromSavedTargetGroupIds(["tg-1"]);
    expect(single.components).toHaveLength(1);

    const multi = audienceSpecFromSavedTargetGroupIds(["tg-1", "tg-2", "tg-1"]);
    expect(multi.composition).toBe("UNION");
    expect(multi.components).toHaveLength(2);

    const structural = audienceSpecFromStructuralSelectors({ orgUnitIds: ["ou-1"], teamIds: ["team-1"] });
    expect(structural.components[0]?.structural?.orgUnitIds).toEqual(["ou-1"]);
  });

  it("updates draft audience dynamically before publish", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue(mockCampaignRow());
    mocks.targetGroup.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in ?? [];
      return ids.map((id) => ({ id, status: "ACTIVE" as const }));
    });

    await updateCampaignDraft({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      actorUserId: "user-club",
      audienceSpec: audienceSpecFromSavedTargetGroupIds(["tg-1", "tg-2"]),
    });

    expect(mocks.platformCommunication.update).toHaveBeenCalled();
  });

  it("marks campaign ready without dispatch", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue(mockCampaignRow());
    mocks.platformCommunication.update.mockResolvedValue({});

    const result = await markCampaignReady({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      actorUserId: "user-club",
    });

    expect(result.status).toBe("READY");
    expect(mocks.resolveCommunicationRecipientsForDispatch).not.toHaveBeenCalled();
  });

  it("publish resolves COMM-03, persists snapshots, and emits notifications", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue(mockCampaignRow({ status: "READY" }));
    mockDispatch(250);

    const result = await publishCampaign({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      senderUserId: "user-club",
    });

    expect(result.recipientCount).toBe(250);
    expect(result.alreadyPublished).toBe(false);
    expect(mocks.resolveCommunicationRecipientsForDispatch).toHaveBeenCalledTimes(1);
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.emitCampaignPublishedNotifications).toHaveBeenCalledTimes(1);
  });

  it("publish is idempotent when campaign is already published", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue(
      mockCampaignRow({ status: "PUBLISHED" }),
    );
    mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(42);

    const result = await publishCampaign({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      senderUserId: "user-club",
    });

    expect(result.alreadyPublished).toBe(true);
    expect(result.recipientCount).toBe(42);
    expect(mocks.resolveCommunicationRecipientsForDispatch).not.toHaveBeenCalled();
    expect(mocks.emitCampaignPublishedNotifications).not.toHaveBeenCalled();
  });

  it("handles concurrent publish by skipping duplicate transition", async () => {
    mocks.platformCommunication.findFirst
      .mockResolvedValueOnce(mockCampaignRow({ status: "DRAFT" }))
      .mockResolvedValueOnce({ status: "PUBLISHED" });
    mockDispatch(5);
    mocks.platformCommunication.updateMany.mockResolvedValueOnce({ count: 0 });
    mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(5);

    const result = await publishCampaign({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      senderUserId: "user-club",
    });

    expect(result.alreadyPublished).toBe(true);
    expect(result.recipientCount).toBe(5);
    expect(mocks.emitCampaignPublishedNotifications).not.toHaveBeenCalled();
  });

  it("archives campaign and records audit", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue(
      mockCampaignRow({ status: "PUBLISHED" }),
    );
    mocks.platformCommunication.update.mockResolvedValue({});

    await archiveCampaign({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      actorUserId: "user-club",
    });

    expect(mocks.platformCommunication.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "ARCHIVED" } }),
    );
  });

  it("lists campaigns with aggregate recipient counts only when published", async () => {
    mocks.platformCommunication.findMany.mockResolvedValue([
      {
        id: "camp-1",
        internalName: "Internal",
        status: "PUBLISHED",
        subject: "Title",
        bodyText: "Body",
        audienceSpecJson: wholeOrganisationAudienceSpec(),
        publishedAt: new Date("2026-01-02"),
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        senderPerson: { id: "p1", firstName: "A", lastName: "B" },
        _count: { recipientSnapshots: 99 },
      },
    ]);

    const items = await listCampaigns({
      tenantId: "tenant-a",
      viewerUserId: "user-club",
      viewerCanSend: true,
    });

    expect(items[0]?.recipientCount).toBe(99);
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).not.toHaveBeenCalled();
  });

  it("keeps club mitteilungen list separate from campaigns", async () => {
    mocks.platformCommunication.findMany.mockResolvedValue([]);

    await listClubCommunications({
      tenantId: "tenant-a",
      viewerUserId: "user-club",
      viewerCanSend: true,
    });

    expect(mocks.platformCommunication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: { not: "CAMPAIGN" } }),
      }),
    );
  });

  it("records channel intent with email enabled by default (COMM-14)", () => {
    const meta = defaultCampaignOrchestrationMeta();
    expect(meta.channels.email).toBe(true);
    expect(parseCampaignOrchestrationMeta(meta)?.scheduling.mode).toBe("IMMEDIATE");
  });

  it("gates engagement detail without engagement_detail permission", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue(
      mockCampaignRow({
        status: "PUBLISHED",
        senderPersonId: "person-other",
      }),
    );

    const allowed = await canInspectCampaignEngagementDetail({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      viewerUserId: "user-viewer",
      viewerCanViewEngagementDetail: false,
    });

    expect(allowed).toBe(false);
  });

  it("rejects cross-tenant target group ownership on draft create", async () => {
    mocks.targetGroup.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in ?? [];
      return ids
        .filter((id) => id === "tg-1")
        .map((id) => ({ id, status: "ACTIVE" as const }));
    });

    await expect(
      createCampaignDraft({
        tenantId: "tenant-a",
        senderUserId: "user-club",
        internalName: "Cross tenant",
        bodyText: "Body",
        audienceSpec: audienceSpecFromSavedTargetGroupIds(["tg-1", "tg-foreign"]),
      }),
    ).rejects.toThrow(/target group not found/);
  });
});
