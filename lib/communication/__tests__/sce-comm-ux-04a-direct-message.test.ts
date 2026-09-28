import { beforeEach, describe, expect, it, vi } from "vitest";
import { explicitPersonAudienceSpec } from "@/lib/communication/direct/direct-audience-spec";
import {
  assertConversationAllowsReplies,
  sendDirectMessage,
} from "@/lib/communication/direct/direct-message-service";
import { replyToSceDirectConversation } from "@/lib/communication/direct/direct-reply-service";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { validateCommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { replyToCommunicationCenterConversation } from "@/lib/communication/inbox/reply-service";

const mocks = vi.hoisted(() => ({
  platformCommunicationConversation: { create: vi.fn() },
  platformCommunication: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  platformCommunicationRecipientSnapshot: { createMany: vi.fn() },
  communicationCenterConversation: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  communicationCenterMessage: { create: vi.fn(), findFirst: vi.fn() },
  communicationCenterConversationParticipant: { findFirst: vi.fn() },
  person: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
  resolveCommunicationRecipientsForDispatch: vi.fn(),
  buildCampaignPublishSnapshotCreateMany: vi.fn(),
  evaluatePlatformEmailReadiness: vi.fn(),
  enqueuePlatformCommunicationEmailDeliveries: vi.fn(),
  resolvePersonIdForUser: vi.fn(),
  recordPlatformCommunicationAudit: vi.fn(),
  createNotificationIdempotent: vi.fn(),
  applyCommunicationPreferencesToNotificationDefaults: vi.fn(),
  resolveSenderCommunicationScope: vi.fn(),
  orgUnitMembership: { findMany: vi.fn() },
  trainerTeamMember: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunicationConversation: mocks.platformCommunicationConversation,
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    communicationCenterConversation: mocks.communicationCenterConversation,
    communicationCenterMessage: mocks.communicationCenterMessage,
    communicationCenterConversationParticipant: mocks.communicationCenterConversationParticipant,
    person: mocks.person,
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipientsForDispatch: mocks.resolveCommunicationRecipientsForDispatch,
}));

vi.mock("@/lib/communication/sponsor/publish-recipient-snapshot-data", () => ({
  buildCampaignPublishSnapshotCreateMany: mocks.buildCampaignPublishSnapshotCreateMany,
}));

vi.mock("@/lib/communication/platform-email/email-readiness-service", () => ({
  evaluatePlatformEmailReadiness: mocks.evaluatePlatformEmailReadiness,
}));

vi.mock("@/lib/communication/platform-email/platform-email-dispatch-service", () => ({
  enqueuePlatformCommunicationEmailDeliveries: mocks.enqueuePlatformCommunicationEmailDeliveries,
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  resolvePersonIdForUser: mocks.resolvePersonIdForUser,
}));

vi.mock("@/lib/communication/team/platform-communication-audit", () => ({
  recordPlatformCommunicationAudit: mocks.recordPlatformCommunicationAudit,
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: mocks.createNotificationIdempotent,
}));

vi.mock("@/lib/communication/preferences/apply-notification-channel-preferences", () => ({
  applyCommunicationPreferencesToNotificationDefaults:
    mocks.applyCommunicationPreferencesToNotificationDefaults,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/sender-communication-scope", () => ({
  resolveSenderCommunicationScope: mocks.resolveSenderCommunicationScope,
}));

describe("SCE-COMM-UX-04A direct message", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSenderCommunicationScope.mockResolvedValue({
      scope: { tenantId: "t1", senderUserId: "u1", allowedSubjectPersonIds: new Set(["p1", "p2"]) },
      previewScopeLimited: false,
    });
    mocks.resolvePersonIdForUser.mockResolvedValue("sender-person");
    mocks.platformCommunicationConversation.create.mockResolvedValue({ id: "pconv-1" });
    mocks.platformCommunication.create.mockResolvedValue({ id: "comm-1" });
    mocks.resolveCommunicationRecipientsForDispatch.mockResolvedValue({
      core: { metadata: { audienceFingerprint: "fp", resolvedAt: new Date().toISOString() } },
      pipeline: { deliveryTargets: [] },
    });
    mocks.buildCampaignPublishSnapshotCreateMany.mockResolvedValue({
      totalCount: 1,
      deliveryUserIds: ["u-recipient"],
      createManyData: [{ subjectPersonId: "p1" }],
    });
    mocks.evaluatePlatformEmailReadiness.mockResolvedValue({ ready: false, reasons: [] });
    mocks.person.findFirst.mockResolvedValue({
      id: "p1",
      firstName: "Max",
      lastName: "Muster",
      displayName: null,
      userId: "u-recipient",
    });
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks));
    mocks.communicationCenterConversation.create.mockResolvedValue({ id: "inbox-conv-1" });
    mocks.communicationCenterMessage.create.mockResolvedValue({ id: "msg-1" });
    mocks.applyCommunicationPreferencesToNotificationDefaults.mockResolvedValue({});
  });

  it("1-8 composer contracts: audience + context validation", () => {
    expect(explicitPersonAudienceSpec(["p1"]).components[0]?.explicit?.includePersonIds).toEqual([
      "p1",
    ]);
    expect(validateCommunicationContextRef("t1", { kind: "DIRECT", tenantId: "t1" })).toBeNull();
    expect(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS.length).toBeGreaterThan(0);
  });

  it("9-13 modes: inform disables replies on send path", async () => {
    await sendDirectMessage({
      tenantId: "t1",
      senderUserId: "u1",
      recipientPersonIds: ["p1"],
      bodyText: "Hallo",
      mode: "INFORM",
    });
    expect(mocks.platformCommunication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ repliesAllowed: false }),
      }),
    );
  });

  it("10 message mode keeps replies allowed", async () => {
    await sendDirectMessage({
      tenantId: "t1",
      senderUserId: "u1",
      recipientPersonIds: ["p1"],
      bodyText: "Hallo",
      mode: "MESSAGE",
    });
    expect(mocks.platformCommunication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ repliesAllowed: true }),
      }),
    );
  });

  it("18-20 multi-recipient fan-out creates one send per person", async () => {
    const result = await sendDirectMessage({
      tenantId: "t1",
      senderUserId: "u1",
      recipientPersonIds: ["p1", "p2"],
      bodyText: "Hallo alle",
      mode: "MESSAGE",
    });
    expect(result.recipientCount).toBe(2);
    expect(mocks.platformCommunication.create).toHaveBeenCalledTimes(2);
  });

  it("7 platform=false inbox=true still rejects replies (canonical platform wins)", async () => {
    mocks.communicationCenterConversation.findFirst.mockResolvedValue({
      repliesAllowed: true,
      channel: "SCE",
      platformCommunicationId: "comm-1",
    });
    mocks.platformCommunication.findFirst.mockResolvedValue({
      repliesAllowed: false,
    });
    const policy = await assertConversationAllowsReplies({
      tenantId: "t1",
      conversationId: "c1",
    });
    expect(policy.repliesAllowed).toBe(false);
  });

  it("8 platform=true inbox=false fail-safe rejects replies", async () => {
    mocks.communicationCenterConversation.findFirst.mockResolvedValue({
      repliesAllowed: false,
      channel: "SCE",
      platformCommunicationId: "comm-1",
    });
    const policy = await assertConversationAllowsReplies({
      tenantId: "t1",
      conversationId: "c1",
    });
    expect(policy.repliesAllowed).toBe(false);
    expect(mocks.platformCommunication.findFirst).not.toHaveBeenCalled();
  });

  it("14-17 locked conversation rejects reply API", async () => {
    mocks.communicationCenterConversation.findFirst.mockResolvedValue({
      repliesAllowed: false,
      channel: "SCE",
      platformCommunicationId: "comm-1",
    });
    const policy = await assertConversationAllowsReplies({
      tenantId: "t1",
      conversationId: "c1",
    });
    expect(policy.repliesAllowed).toBe(false);

    mocks.communicationCenterConversationParticipant.findFirst.mockResolvedValue({ id: "part" });
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      repliesAllowed: false,
      conversationId: "pc1",
      createdByUserId: "u2",
      senderPersonId: "sp1",
      subject: "Test",
      orchestrationMetaJson: null,
    });

    await expect(
      replyToSceDirectConversation({
        tenantId: "t1",
        conversationId: "c1",
        actorUserId: "u2",
        bodyText: "Antwort",
        idempotencyKey: "k1",
      }),
    ).rejects.toMatchObject({ code: "REPLIES_DISABLED" });
  });

  it("15 allowed conversation accepts SCE reply shape", async () => {
    mocks.communicationCenterConversation.findFirst.mockResolvedValue({
      id: "c1",
      repliesAllowed: true,
      channel: "SCE",
      matchedPersonId: "p1",
      platformCommunication: {
        id: "comm-root",
        repliesAllowed: true,
        conversationId: "pc1",
        createdByUserId: "u1",
        senderPersonId: "sp1",
        subject: "Hi",
        orchestrationMetaJson: null,
      },
    });
    mocks.communicationCenterConversationParticipant.findFirst.mockResolvedValue({ id: "part" });
    mocks.communicationCenterMessage.findFirst.mockResolvedValue(null);
    mocks.platformCommunication.create.mockResolvedValue({ id: "comm-reply" });
    mocks.buildCampaignPublishSnapshotCreateMany.mockResolvedValue({
      totalCount: 1,
      deliveryUserIds: ["u2"],
      createManyData: [{}],
    });
    mocks.communicationCenterMessage.create.mockResolvedValue({
      id: "reply-msg",
      status: "SENT",
    });

    const result = await replyToSceDirectConversation({
      tenantId: "t1",
      conversationId: "c1",
      actorUserId: "u1",
      bodyText: "Antwort",
      idempotencyKey: "k2",
    });
    expect(result.messageId).toBe("reply-msg");
  });

  it("39 inbound email reply lock preserved via reply-service guard", async () => {
    mocks.communicationCenterConversation.findFirst
      .mockResolvedValueOnce({
        id: "c-email",
        repliesAllowed: false,
        channel: "EMAIL",
        platformCommunicationId: null,
      })
      .mockResolvedValueOnce({
        id: "c-email",
        repliesAllowed: false,
        channel: "EMAIL",
        platformCommunicationId: null,
        messages: [{ direction: "INBOUND", fromAddress: "a@b.ch" }],
        mailbox: { emailAddress: "club@example.com" },
      });
    await expect(
      replyToCommunicationCenterConversation({
        tenantId: "t1",
        conversationId: "c-email",
        actorUserId: "u1",
        bodyText: "Nope",
        idempotencyKey: "k3",
      }),
    ).rejects.toMatchObject({ code: "REPLIES_DISABLED" });
  });
});
