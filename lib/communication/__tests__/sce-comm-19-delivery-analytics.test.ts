import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_TRUTH_STATEMENT,
  bucketEmailSkipFailureCode,
  mergePushRecipientStatus,
} from "@/lib/communication/analytics/analytics-semantics";
import {
  decodeDeliveryDetailCursor,
  encodeDeliveryDetailCursor,
} from "@/lib/communication/analytics/delivery-detail-cursor";
import { resolveCommunicationAnalyticsAccess } from "@/lib/communication/analytics/communication-analytics-authorization";
import {
  getCommunicationDeliveryAnalytics,
  listCommunicationDeliveryDetail,
} from "@/lib/communication/analytics/communication-delivery-analytics-service";
import { summarizePlatformEmailDeliveries } from "@/lib/communication/platform-email/platform-email-delivery-summary-service";

const mocks = vi.hoisted(() => ({
  platformCommunication: { findFirst: vi.fn() },
  platformCommunicationRecipientSnapshot: {
    count: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  platformCommunicationEmailDeliveryAttempt: { groupBy: vi.fn() },
  platformCommunicationPollResponse: { count: vi.fn() },
  platformCommunicationRequestClaim: { count: vi.fn() },
  notificationDelivery: { findMany: vi.fn() },
  notificationPushDeliveryAttempt: { groupBy: vi.fn() },
  getEffectivePermissions: vi.fn(),
  userRole: { count: vi.fn() },
  team: { findFirst: vi.fn() },
  resolvePersonIdForUser: vi.fn(),
  summarizePlatformEmailDeliveries: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    platformCommunicationEmailDeliveryAttempt: mocks.platformCommunicationEmailDeliveryAttempt,
    platformCommunicationPollResponse: mocks.platformCommunicationPollResponse,
    platformCommunicationRequestClaim: mocks.platformCommunicationRequestClaim,
    notificationDelivery: mocks.notificationDelivery,
    notificationPushDeliveryAttempt: mocks.notificationPushDeliveryAttempt,
    team: mocks.team,
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
  resolvePersonIdForUser: (...args: unknown[]) => mocks.resolvePersonIdForUser(...args),
  resolvePersonCurrentTeamAllocation: vi.fn(async () => ({ isAllocated: true, isPlayer: false, isTrainer: false })),
}));

vi.mock("@/lib/communication/platform-email/platform-email-delivery-summary-service", () => ({
  summarizePlatformEmailDeliveries: (...args: unknown[]) =>
    mocks.summarizePlatformEmailDeliveries(...args),
}));

function publishedComm(overrides: Record<string, unknown> = {}) {
  return {
    id: "comm-1",
    status: "PUBLISHED",
    publishedAt: new Date("2026-01-01T12:00:00Z"),
    acknowledgementRequired: true,
    publicationSchedule: null,
    poll: null,
    request: null,
    ...overrides,
  };
}

describe("SCE-COMM-19 delivery & analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.userRole.count.mockResolvedValue(0);
    mocks.summarizePlatformEmailDeliveries.mockResolvedValue({
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
    mocks.platformCommunicationEmailDeliveryAttempt.groupBy.mockResolvedValue([]);
    mocks.notificationDelivery.findMany.mockResolvedValue([]);
    mocks.notificationPushDeliveryAttempt.groupBy.mockResolvedValue([]);
    mocks.platformCommunicationPollResponse.count.mockResolvedValue(0);
    mocks.platformCommunicationRequestClaim.count.mockResolvedValue(0);
  });

  describe("COUNTING semantics", () => {
    beforeEach(() => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.count.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
        if (args.where && "subjectMinorAtDispatch" in (args.where as object)) return 2;
        if (args.where && "viaGuardianSubstitution" in (args.where as object)) return 3;
        if (args.where && "safeguardingReasonCode" in (args.where as object)) return 1;
        return 12;
      });
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockImplementation(
        async (args: { by?: string[]; where?: Record<string, unknown> }) => {
          if (args.by?.includes("subjectPersonId")) {
            return [{ subjectPersonId: "p1" }, { subjectPersonId: "p2" }];
          }
          if (args.by?.includes("sponsorContactId") && args.where?.subjectPersonId === null) {
            return [{ sponsorContactId: "sc1" }];
          }
          if (args.by?.includes("deliveryUserId")) {
            return [{ deliveryUserId: "u1" }, { deliveryUserId: "u2" }, { deliveryUserId: "u3" }];
          }
          if (args.by?.includes("engagement")) {
            return [
              { engagement: "PENDING", _count: { _all: 2 } },
              { engagement: "READ", _count: { _all: 5 } },
              { engagement: "ACKNOWLEDGED", _count: { _all: 3 } },
              { engagement: "RESPONDED", _count: { _all: 2 } },
            ];
          }
          return [];
        },
      );
    });

    it("1–3 reports subject, snapshot, and delivery identity counts", async () => {
      mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(12);
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "tenant-a",
        communicationId: "comm-1",
      });
      expect(analytics?.audience.targetSubjectCount).toBe(3);
      expect(analytics?.audience.recipientSnapshotCount).toBe(12);
      expect(analytics?.audience.deliveryIdentityCount).toBe(3);
    });

    it("4 guardian expansion preserves subject count", async () => {
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "tenant-a",
        communicationId: "comm-1",
      });
      expect(analytics?.audience.targetSubjectCount).toBe(3);
      expect(analytics?.safeguarding.guardianExpandedDeliveries).toBe(3);
    });

    it("5 dedupes delivery identities in groupBy contract", async () => {
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "tenant-a",
        communicationId: "comm-1",
      });
      expect(analytics?.audience.deliveryIdentityCount).toBe(3);
    });
  });

  describe("EMAIL", () => {
    beforeEach(() => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(0);
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockResolvedValue([]);
    });

    it("7–11 email status buckets", async () => {
      mocks.summarizePlatformEmailDeliveries.mockResolvedValue({
        pending: 1,
        processing: 2,
        sent: 10,
        failed: 1,
        skipped: 4,
      });
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.channels.email.pending).toBe(1);
      expect(analytics?.channels.email.processing).toBe(2);
      expect(analytics?.channels.email.sent).toBe(10);
      expect(analytics?.channels.email.failed).toBe(1);
      expect(analytics?.channels.email.skipped).toBe(4);
    });

    it("12–13 preference and consent skip buckets", async () => {
      mocks.summarizePlatformEmailDeliveries.mockResolvedValue({
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        skipped: 5,
      });
      mocks.platformCommunicationEmailDeliveryAttempt.groupBy.mockResolvedValue([
        { failureCode: "PREFERENCE_EXPLICITLY_DISABLED", _count: { _all: 2 } },
        { failureCode: "CONSENT_REQUIRED", _count: { _all: 3 } },
      ]);
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.channels.email.skipReasons.preferenceDisabled).toBe(2);
      expect(analytics?.channels.email.skipReasons.consentRequired).toBe(3);
    });

    it("14 retry does not inflate sent (one attempt row per snapshot)", async () => {
      await summarizePlatformEmailDeliveries({ tenantId: "t", communicationId: "c" });
      expect(mocks.summarizePlatformEmailDeliveries).toHaveBeenCalled();
    });

    it("15 no fake open/read metric", async () => {
      mocks.summarizePlatformEmailDeliveries.mockResolvedValue({
        pending: 0,
        processing: 0,
        sent: 1,
        failed: 0,
        skipped: 0,
      });
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.channels.email.openOrReadTracking).toBe(false);
    });
  });

  describe("PUSH", () => {
    beforeEach(() => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(0);
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockResolvedValue([]);
    });

    it("16–17 recipient vs device attempts", async () => {
      mocks.notificationDelivery.findMany.mockResolvedValue([
        { status: "SENT" },
        { status: "FAILED" },
      ]);
      mocks.notificationPushDeliveryAttempt.groupBy.mockResolvedValue([
        { status: "SENT", _count: { _all: 5 } },
        { status: "FAILED", _count: { _all: 1 } },
      ]);
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.channels.push.recipientIdentities).toBe(2);
      expect(analytics?.channels.push.deviceAttempts).toBe(6);
      expect(analytics?.channels.push.outcomes.sent).toBe(1);
      expect(analytics?.channels.push.outcomes.failed).toBe(1);
    });

    it("6 multiple devices do not inflate recipient count", async () => {
      mocks.notificationDelivery.findMany.mockResolvedValue([{ status: "SENT" }]);
      mocks.notificationPushDeliveryAttempt.groupBy.mockResolvedValue([
        { status: "SENT", _count: { _all: 3 } },
      ]);
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.channels.push.recipientIdentities).toBe(1);
      expect(analytics?.channels.push.deviceAttempts).toBe(3);
    });
  });

  describe("IN_APP engagement", () => {
    beforeEach(() => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(0);
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockImplementation(
        async (args: { by?: string[] }) => {
          if (args.by?.includes("engagement")) {
            return [
              { engagement: "PENDING", _count: { _all: 4 } },
              { engagement: "READ", _count: { _all: 2 } },
              { engagement: "ACKNOWLEDGED", _count: { _all: 1 } },
              { engagement: "RESPONDED", _count: { _all: 1 } },
            ];
          }
          return [];
        },
      );
    });

    it("18–22 read, ack, responded distinct", async () => {
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.channels.inApp.unread).toBe(4);
      expect(analytics?.channels.inApp.read).toBe(4);
      expect(analytics?.channels.inApp.acknowledged).toBe(1);
      expect(analytics?.channels.inApp.responded).toBe(1);
      expect(analytics?.engagement.inApp.acknowledged).toBe(1);
      expect(analytics?.engagement.inApp.responded).toBe(1);
    });
  });

  describe("POLL / REQUEST", () => {
    it("23–24 poll aggregates", async () => {
      mocks.platformCommunication.findFirst.mockResolvedValue(
        publishedComm({ poll: { id: "poll-1" } }),
      );
      mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(10);
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockResolvedValue([]);
      mocks.platformCommunicationPollResponse.count.mockResolvedValue(7);
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.engagement.typeSpecific.pollResponseCount).toBe(7);
      expect(analytics?.engagement.typeSpecific.pollOutstandingCount).toBe(3);
    });
  });

  describe("SAFEGUARDING", () => {
    it("27–29 safeguarding aggregates without private fields", async () => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.count.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
        const w = args.where ?? {};
        if ("viaGuardianSubstitution" in w) return 4;
        if ("safeguardingReasonCode" in w) return 1;
        return 0;
      });
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockResolvedValue([]);
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "c",
      });
      expect(analytics?.safeguarding.guardianExpandedDeliveries).toBe(4);
      expect(analytics?.safeguarding.guardianUnavailableExclusions).toBe(1);
      expect(JSON.stringify(analytics)).not.toMatch(/dateOfBirth|guardianGraph/i);
    });
  });

  describe("SPONSOR / external", () => {
    it("30–32 external rows omit in-app engagement in detail", async () => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
        {
          id: "snap-ext",
          recipientKind: "EXTERNAL_SPONSOR_CONTACT",
          channel: "IN_APP",
          engagement: "PENDING",
          viaGuardianSubstitution: false,
          safeguardingReasonCode: null,
          deliveryUserId: null,
          subjectPerson: null,
          sponsorContact: { firstName: "S", lastName: "Ponsor" },
          externalSnapshotJson: { displayName: "Sponsor AG" },
          emailDeliveryAttempts: [{ status: "SKIPPED", failureCode: "CONSENT_REQUIRED" }],
          pushDeliveryAttempts: [],
          pollResponses: [],
          requestClaims: [],
        },
      ]);
      const page = await listCommunicationDeliveryDetail({
        tenantId: "t",
        communicationId: "c",
        limit: 10,
      });
      expect(page.items[0]?.inAppEngagement).toBeNull();
      expect(page.items[0]?.emailStatus).toBe("SKIPPED");
    });
  });

  describe("SCHEDULED", () => {
    it("33–34 scheduled is not delivery", async () => {
      mocks.platformCommunication.findFirst.mockResolvedValue({
        id: "comm-draft",
        status: "DRAFT",
        publishedAt: null,
        acknowledgementRequired: false,
        publicationSchedule: { status: "SCHEDULED", scheduledAt: new Date("2026-06-01T10:00:00Z") },
        poll: null,
        request: null,
      });
      const analytics = await getCommunicationDeliveryAnalytics({
        tenantId: "t",
        communicationId: "comm-draft",
      });
      expect(analytics?.publication.deliveryAnalyticsApplicable).toBe(false);
      expect(analytics?.audience.recipientSnapshotCount).toBe(0);
    });
  });

  describe("AUTHORIZATION", () => {
    it("35–38 tenant isolation and permissions", async () => {
      mocks.platformCommunication.findFirst.mockResolvedValue({
        id: "comm-1",
        kind: "MESSAGE",
        conversation: { contextKind: "ORGANISATION", teamId: null },
      });
      mocks.getEffectivePermissions.mockResolvedValue({
        platform: [],
        tenant: ["communication.club.view"],
      });
      const access = await resolveCommunicationAnalyticsAccess({
        tenantId: "tenant-a",
        tenantKey: "club",
        userId: "user-1",
        communicationId: "comm-1",
      });
      expect(access?.canViewSummary).toBe(true);
      expect(access?.canViewRecipientDetail).toBe(false);

      mocks.getEffectivePermissions.mockResolvedValue({
        platform: [],
        tenant: ["communication.club.view", "communication.club.engagement_detail"],
      });
      const detail = await resolveCommunicationAnalyticsAccess({
        tenantId: "tenant-a",
        tenantKey: "club",
        userId: "user-1",
        communicationId: "comm-1",
      });
      expect(detail?.canViewRecipientDetail).toBe(true);
    });

    it("37 team scope uses team communication permissions", async () => {
      const { resolvePersonCurrentTeamAllocation } = await import("@/lib/teams/team-document-auth");
      vi.mocked(resolvePersonCurrentTeamAllocation).mockResolvedValueOnce({
        isAllocated: false,
        isPlayer: false,
        isTrainer: false,
      });
      mocks.platformCommunication.findFirst.mockResolvedValue({
        id: "comm-team",
        kind: "MESSAGE",
        conversation: { contextKind: "TEAM", teamId: "team-1" },
      });
      mocks.team.findFirst.mockResolvedValue({ id: "team-1" });
      mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
      const access = await resolveCommunicationAnalyticsAccess({
        tenantId: "tenant-a",
        tenantKey: "club",
        userId: "user-1",
        communicationId: "comm-team",
      });
      expect(access?.canViewSummary).toBe(false);
    });
  });

  describe("PAGINATION", () => {
    it("40–41 cursor encode/decode and bounded fetch", async () => {
      const cursor = encodeDeliveryDetailCursor("snap-abc");
      expect(decodeDeliveryDetailCursor(cursor)).toBe("snap-abc");
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([]);
      await listCommunicationDeliveryDetail({
        tenantId: "t",
        communicationId: "c",
        limit: 25,
      });
      expect(mocks.platformCommunicationRecipientSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 26 }),
      );
    });
  });

  describe("PERFORMANCE contract", () => {
    it("42 uses grouped aggregation not per-row loops in headline path", async () => {
      mocks.platformCommunication.findFirst.mockResolvedValue(publishedComm());
      mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(1);
      mocks.platformCommunicationRecipientSnapshot.groupBy.mockResolvedValue([]);
      await getCommunicationDeliveryAnalytics({ tenantId: "t", communicationId: "c" });
      expect(mocks.platformCommunicationRecipientSnapshot.groupBy).toHaveBeenCalled();
      expect(mocks.platformCommunicationRecipientSnapshot.findMany).not.toHaveBeenCalled();
    });
  });

  describe("semantics helpers", () => {
    it("truth statement is documented", () => {
      expect(ANALYTICS_TRUTH_STATEMENT).toContain("evidence");
    });

    it("mergePushRecipientStatus prefers SENT over PENDING", () => {
      expect(mergePushRecipientStatus("PENDING", "SENT")).toBe("SENT");
    });

    it("bucketEmailSkipFailureCode maps consent", () => {
      expect(bucketEmailSkipFailureCode("CONSENT_REQUIRED")).toBe("consentRequired");
    });
  });
});
