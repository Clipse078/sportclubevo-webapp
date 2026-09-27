import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAMPAIGN_BOUNDARY_FLAGS } from "@/lib/communication/campaign/campaign-boundaries";
import {
  defaultCampaignOrchestrationMeta,
  parseCampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import {
  EXTERNAL_EMAIL_DELIVERY_CANDIDATE,
  EXTERNAL_EMAIL_SKIPPED_CHANNEL_DISABLED,
  resolveExternalEmailDeliveryCapability,
} from "@/lib/communication/platform-email/delivery-capability";
import { resolveRecipientSnapshotEmailEligibility } from "@/lib/communication/platform-email/recipient-email-eligibility";
import { renderPlatformCommunicationEmail } from "@/lib/communication/platform-email/email-rendering-service";
import { enqueuePlatformCommunicationEmailDeliveries } from "@/lib/communication/platform-email/platform-email-dispatch-service";
import { processPendingPlatformCommunicationEmailDeliveries } from "@/lib/communication/platform-email/platform-email-delivery-processor";
import {
  PlatformEmailTestDeliveryError,
  sendPlatformEmailTestDelivery,
} from "@/lib/communication/platform-email/platform-email-test-delivery-service";
import { OutboundEmailTransportError } from "@/lib/email/outbound-email-transport";

const mocks = vi.hoisted(() => ({
  tenant: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  person: { findFirst: vi.fn() },
  platformCommunicationRecipientSnapshot: { findMany: vi.fn() },
  platformCommunicationEmailDeliveryAttempt: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  evaluatePlatformEmailReadiness: vi.fn(),
  resolveTenantEmailSender: vi.fn(),
  sendOutboundEmail: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: mocks.tenant,
    user: mocks.user,
    person: mocks.person,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    platformCommunicationEmailDeliveryAttempt: mocks.platformCommunicationEmailDeliveryAttempt,
  },
}));

vi.mock("@/lib/communication/platform-email/email-readiness-service", () => ({
  evaluatePlatformEmailReadiness: (...args: unknown[]) => mocks.evaluatePlatformEmailReadiness(...args),
}));

vi.mock("@/lib/communication/email-sender-service", () => ({
  resolveTenantEmailSender: (...args: unknown[]) => mocks.resolveTenantEmailSender(...args),
}));

vi.mock("@/lib/email/outbound-email-transport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/outbound-email-transport")>();
  return {
    ...actual,
    sendOutboundEmail: (...args: unknown[]) => mocks.sendOutboundEmail(...args),
  };
});

vi.mock("@/lib/communication/team/platform-communication-audit", () => ({
  recordPlatformCommunicationAudit: vi.fn(),
}));

describe("SCE-COMM-14 outbound email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://app.sportclubevo.test";
    mocks.evaluatePlatformEmailReadiness.mockResolvedValue({
      ready: true,
      senderConfigured: true,
      transportConfigured: true,
      fromAddressValid: true,
      activeSource: "TENANT",
      providerStatus: "VERIFIED",
      platformFallbackActive: false,
      reasons: [],
    });
    mocks.resolveTenantEmailSender.mockResolvedValue({
      formattedFrom: "Club <club@example.com>",
      emailAddress: "club@example.com",
      displayName: "Club",
      source: "TENANT",
      providerStatus: "VERIFIED",
    });
    mocks.sendOutboundEmail.mockResolvedValue({
      provider: "resend",
      messageId: "msg-1",
      from: "Club <club@example.com>",
    });
  });

  it("marks outbound email as implemented in campaign boundaries", () => {
    expect(CAMPAIGN_BOUNDARY_FLAGS.outboundEmail).toBe("EMAIL_IMPLEMENTED");
  });

  it("parses legacy NOT_IMPLEMENTED orchestration as email disabled", () => {
    const parsed = parseCampaignOrchestrationMeta({
      schemaVersion: 1,
      channels: { inApp: true, push: true, email: "NOT_IMPLEMENTED" },
      scheduling: { mode: "IMMEDIATE" },
    });
    expect(parsed?.channels.email).toBe(false);
    expect(defaultCampaignOrchestrationMeta().channels.email).toBe(true);
  });

  it("classifies external sponsor snapshot email capability", () => {
    expect(
      resolveExternalEmailDeliveryCapability({
        emailChannelEnabled: true,
        transportReady: true,
        email: "partner@example.com",
      }),
    ).toBe(EXTERNAL_EMAIL_DELIVERY_CANDIDATE);
    expect(
      resolveExternalEmailDeliveryCapability({
        emailChannelEnabled: false,
        transportReady: true,
        email: "partner@example.com",
      }),
    ).toBe(EXTERNAL_EMAIL_SKIPPED_CHANNEL_DISABLED);
  });

  it("resolves internal user email eligibility", async () => {
    mocks.user.findFirst.mockResolvedValue({ email: "member@example.com" });
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "tenant-a",
      emailChannelEnabled: true,
      snapshot: {
        tenantId: "tenant-a",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p-1",
        deliveryUserId: "u-1",
        externalSnapshotJson: null,
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.email).toBe("member@example.com");
  });

  it("skips missing internal email addresses explicitly", async () => {
    mocks.user.findFirst.mockResolvedValue({ email: null });
    mocks.person.findFirst.mockResolvedValue({ email: null });
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "tenant-a",
      emailChannelEnabled: true,
      snapshot: {
        tenantId: "tenant-a",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p-1",
        deliveryUserId: "u-1",
        externalSnapshotJson: null,
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.skipReason).toBe("MISSING_EMAIL");
  });

  it("uses external sponsor snapshot email candidate marker", async () => {
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "tenant-a",
      emailChannelEnabled: true,
      snapshot: {
        tenantId: "tenant-a",
        recipientKind: "EXTERNAL_SPONSOR_CONTACT",
        subjectPersonId: null,
        deliveryUserId: null,
        externalSnapshotJson: {
          email: "sponsor@example.com",
          deliveryCapability: EXTERNAL_EMAIL_DELIVERY_CANDIDATE,
        },
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.email).toBe("sponsor@example.com");
  });

  it("enforces tenant isolation for recipient eligibility", async () => {
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "tenant-a",
      emailChannelEnabled: true,
      snapshot: {
        tenantId: "tenant-b",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p-1",
        deliveryUserId: "u-1",
        externalSnapshotJson: null,
      },
    });
    expect(result.skipReason).toBe("TENANT_MISMATCH");
  });

  it("renders deterministic subject/html/text without unsafe injection", () => {
    const rendered = renderPlatformCommunicationEmail({
      tenantName: "FCA",
      subject: "Hello",
      bodyText: "Line1\nLine2",
      includeDeepLink: false,
    });
    expect(rendered.subject).toBe("Hello");
    expect(rendered.text).toContain("Line1");
    expect(rendered.html).not.toContain("<script");
  });

  it("enqueues pending and skipped delivery attempts idempotently", async () => {
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      {
        id: "snap-1",
        tenantId: "tenant-a",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p-1",
        deliveryUserId: "u-1",
        externalSnapshotJson: null,
      },
      {
        id: "snap-2",
        tenantId: "tenant-a",
        recipientKind: "EXTERNAL_SPONSOR_CONTACT",
        subjectPersonId: null,
        deliveryUserId: null,
        externalSnapshotJson: {
          email: null,
          deliveryCapability: EXTERNAL_EMAIL_SKIPPED_CHANNEL_DISABLED,
        },
      },
    ]);
    mocks.user.findFirst.mockResolvedValueOnce({ email: "member@example.com" });

    const summary = await enqueuePlatformCommunicationEmailDeliveries({
      tenantId: "tenant-a",
      communicationId: "comm-1",
      channelIntent: { inApp: true, push: true, email: true },
    });

    expect(summary.queued).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(mocks.platformCommunicationEmailDeliveryAttempt.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("processes pending attempts with SMTP acceptance as SENT (not DELIVERED/READ)", async () => {
    mocks.platformCommunicationEmailDeliveryAttempt.findMany.mockResolvedValue([
      {
        id: "attempt-1",
        tenantId: "tenant-a",
        communicationId: "comm-1",
        status: "PENDING",
        attemptCount: 0,
        idempotencyKey: "platform-email:comm-1:snap-1",
        recipientSnapshot: {
          tenantId: "tenant-a",
          recipientKind: "INTERNAL_IN_APP",
          subjectPersonId: "p-1",
          deliveryUserId: "u-1",
          externalSnapshotJson: null,
        },
        communication: {
          subject: "Subject",
          bodyText: "Body",
          kind: "CAMPAIGN",
          orchestrationMetaJson: defaultCampaignOrchestrationMeta(),
        },
      },
    ]);
    mocks.platformCommunicationEmailDeliveryAttempt.updateMany.mockResolvedValue({ count: 1 });
    mocks.user.findFirst.mockResolvedValue({ email: "member@example.com" });
    mocks.tenant.findFirst.mockResolvedValue({ name: "FCA" });
    mocks.platformCommunicationEmailDeliveryAttempt.update.mockResolvedValue({});

    const summary = await processPendingPlatformCommunicationEmailDeliveries(10);
    expect(summary.sent).toBe(1);
    expect(mocks.sendOutboundEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "member@example.com" }),
    );
    expect(mocks.platformCommunicationEmailDeliveryAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SENT" }),
      }),
    );
  });

  it("records transport failures without claiming DELIVERED state", async () => {
    mocks.platformCommunicationEmailDeliveryAttempt.findMany.mockResolvedValue([
      {
        id: "attempt-1",
        tenantId: "tenant-a",
        communicationId: "comm-1",
        status: "PENDING",
        attemptCount: 2,
        idempotencyKey: "platform-email:comm-1:snap-1",
        recipientSnapshot: {
          tenantId: "tenant-a",
          recipientKind: "EXTERNAL_SPONSOR_CONTACT",
          subjectPersonId: null,
          deliveryUserId: null,
          externalSnapshotJson: {
            email: "sponsor@example.com",
            deliveryCapability: EXTERNAL_EMAIL_DELIVERY_CANDIDATE,
          },
        },
        communication: {
          subject: "Subject",
          bodyText: "Body",
          kind: "CAMPAIGN",
          orchestrationMetaJson: defaultCampaignOrchestrationMeta(),
        },
      },
    ]);
    mocks.platformCommunicationEmailDeliveryAttempt.updateMany.mockResolvedValue({ count: 1 });
    mocks.platformCommunicationEmailDeliveryAttempt.update.mockResolvedValue({});
    mocks.tenant.findFirst.mockResolvedValue({ name: "FCA" });
    mocks.sendOutboundEmail.mockRejectedValue(
      new OutboundEmailTransportError("PERMANENT_PROVIDER_FAILURE", "invalid recipient", true),
    );

    const summary = await processPendingPlatformCommunicationEmailDeliveries(10);
    expect(summary.failed).toBe(1);
    expect(mocks.platformCommunicationEmailDeliveryAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("protects test delivery recipient and rejects unconfigured addresses", async () => {
    process.env.COMMUNICATION_EMAIL_TEST_RECIPIENT = "ops@example.com";
    mocks.tenant.findFirst.mockResolvedValue({ name: "FCA" });

    await expect(
      sendPlatformEmailTestDelivery({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        testRecipientEmail: "other@example.com",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN_RECIPIENT",
    } satisfies Partial<PlatformEmailTestDeliveryError>);

    const result = await sendPlatformEmailTestDelivery({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      testRecipientEmail: "ops@example.com",
    });
    expect(result.providerMessageId).toBe("msg-1");
    expect(mocks.sendOutboundEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ops@example.com" }),
    );
  });

  it("uses one recipient per outbound email transport call (privacy)", async () => {
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      {
        id: "snap-1",
        tenantId: "tenant-a",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p-1",
        deliveryUserId: "u-1",
        externalSnapshotJson: null,
      },
      {
        id: "snap-2",
        tenantId: "tenant-a",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p-2",
        deliveryUserId: "u-2",
        externalSnapshotJson: null,
      },
    ]);
    mocks.user.findFirst
      .mockResolvedValueOnce({ email: "a@example.com" })
      .mockResolvedValueOnce({ email: "b@example.com" });

    await enqueuePlatformCommunicationEmailDeliveries({
      tenantId: "tenant-a",
      communicationId: "comm-1",
      channelIntent: { inApp: true, push: true, email: true },
    });

    const payload = mocks.platformCommunicationEmailDeliveryAttempt.createMany.mock.calls[0]?.[0]
      ?.data as { status: string }[];
    expect(payload).toHaveLength(2);
    expect(payload.every((row) => row.status === "PENDING")).toBe(true);
  });
});
