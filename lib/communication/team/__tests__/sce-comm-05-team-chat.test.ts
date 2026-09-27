import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeTeamChatCursor,
  encodeTeamChatCursor,
} from "@/lib/communication/team/team-chat-cursor";
import { isTeamChatReactionKey } from "@/lib/communication/team/team-chat-reactions";
import {
  getTeamChatUnreadCount,
  listTeamChatMessages,
  markTeamChatConversationRead,
  sendTeamChatMessage,
  setTeamChatReaction,
} from "@/lib/communication/team/team-chat-service";

const mocks = vi.hoisted(() => ({
  platformCommunicationConversation: { findFirst: vi.fn(), upsert: vi.fn() },
  platformCommunication: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    createMany: vi.fn(),
  },
  platformCommunicationReaction: { upsert: vi.fn(), deleteMany: vi.fn() },
  platformCommunicationMention: { createMany: vi.fn() },
  platformCommunicationAttachment: { findMany: vi.fn() },
  notification: { updateMany: vi.fn() },
  person: { findMany: vi.fn(), findFirst: vi.fn() },
  teamSeason: { findFirst: vi.fn() },
  $transaction: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  attachSelectionToPlatformCommunication: vi.fn(),
  resolvePersonIdForUser: vi.fn(),
  createNotificationIdempotent: vi.fn(),
  listTeamChatMentionCandidates: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunicationConversation: mocks.platformCommunicationConversation,
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    platformCommunicationReaction: mocks.platformCommunicationReaction,
    platformCommunicationMention: mocks.platformCommunicationMention,
    platformCommunicationAttachment: mocks.platformCommunicationAttachment,
    notification: mocks.notification,
    person: mocks.person,
    teamSeason: mocks.teamSeason,
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
  MAX_TEAM_COMMUNICATION_BODY_LENGTH: 8000,
}));

vi.mock("@/lib/communication/attachment-service", () => ({
  attachSelectionToPlatformCommunication: (...args: unknown[]) =>
    mocks.attachSelectionToPlatformCommunication(...args),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  resolvePersonIdForUser: (...args: unknown[]) => mocks.resolvePersonIdForUser(...args),
}));

vi.mock("@/lib/communication/team/team-chat-mention-candidates", () => ({
  assertTeamMentionPersonIdsAllowed: vi.fn(),
  listTeamChatMentionCandidates: (...args: unknown[]) =>
    mocks.listTeamChatMentionCandidates(...args),
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: (...args: unknown[]) => mocks.createNotificationIdempotent(...args),
}));

vi.mock("@/lib/communication/team/team-communication-context", () => ({
  getOrCreateTeamCommunicationConversation: vi.fn(async () => ({
    id: "conv-1",
    tenantId: "tenant-a",
    teamId: "team-1",
  })),
}));

describe("SCE-COMM-05 team chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePersonIdForUser.mockResolvedValue("person-viewer");
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([]);
    mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(2);
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({ notification: mocks.notification }),
    );
  });

  it("encodes and decodes chat cursors deterministically", () => {
    const cursor = encodeTeamChatCursor({
      publishedAt: "2026-01-01T10:00:00.000Z",
      id: "comm-1",
    });
    expect(decodeTeamChatCursor(cursor)).toEqual({
      publishedAt: "2026-01-01T10:00:00.000Z",
      id: "comm-1",
    });
  });

  it("validates reaction keys", () => {
    expect(isTeamChatReactionKey("THUMBS_UP")).toBe(true);
    expect(isTeamChatReactionKey("INVALID")).toBe(false);
  });

  it("lists latest messages in chronological order", async () => {
    mocks.platformCommunication.findMany.mockResolvedValue([
      {
        id: "comm-2",
        bodyText: "Second",
        subject: null,
        acknowledgementRequired: false,
        kind: "MESSAGE",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-02T10:00:00Z"),
        createdAt: new Date("2026-01-02T09:00:00Z"),
        senderPerson: { id: "p1", firstName: "A", lastName: "B" },
        replyTo: null,
        reactions: [],
        mentions: [],
        attachmentLinks: [],
      },
      {
        id: "comm-1",
        bodyText: "First",
        subject: null,
        acknowledgementRequired: false,
        kind: "MESSAGE",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-01T10:00:00Z"),
        createdAt: new Date("2026-01-01T09:00:00Z"),
        senderPerson: { id: "p1", firstName: "A", lastName: "B" },
        replyTo: null,
        reactions: [],
        mentions: [],
        attachmentLinks: [],
      },
    ]);

    const page = await listTeamChatMessages({
      tenantId: "tenant-a",
      teamId: "team-1",
      viewerUserId: "user-1",
    });

    expect(page.messages.map((m) => m.id)).toEqual(["comm-1", "comm-2"]);
    expect(page.hasMoreOlder).toBe(false);
  });

  it("rejects empty chat send without attachments", async () => {
    await expect(
      sendTeamChatMessage({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        bodyText: "   ",
      }),
    ).rejects.toThrow(/body is required/);
  });

  it("sendTeamChatMessage orchestrates draft + publish", async () => {
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-new" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-new", recipientCount: 3 });

    const result = await sendTeamChatMessage({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      bodyText: "Hello team",
    });

    expect(result.recipientCount).toBe(3);
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
    expect(mocks.publishTeamCommunication).toHaveBeenCalled();
  });

  it("rejects nested reply parents", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "parent-1",
      replyToCommunicationId: "older",
      conversation: { teamId: "team-1" },
    });

    await expect(
      sendTeamChatMessage({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        bodyText: "reply",
        replyToCommunicationId: "parent-1",
      }),
    ).rejects.toThrow(/nested replies/);
  });

  it("rejects cross-team reply parent", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "parent-1",
      replyToCommunicationId: null,
      conversation: { teamId: "team-other" },
    });

    await expect(
      sendTeamChatMessage({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        bodyText: "reply",
        replyToCommunicationId: "parent-1",
      }),
    ).rejects.toThrow();
  });

  it("adds and removes reactions with authorization on published messages", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      status: "PUBLISHED",
      conversation: { teamId: "team-1" },
    });
    mocks.platformCommunicationReaction.upsert.mockResolvedValue({ id: "r1" });

    await setTeamChatReaction({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-1",
      actorUserId: "user-1",
      reactionKey: "HEART",
      active: true,
    });

    expect(mocks.platformCommunicationReaction.upsert).toHaveBeenCalled();

    await setTeamChatReaction({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-1",
      actorUserId: "user-1",
      reactionKey: "HEART",
      active: false,
    });
    expect(mocks.platformCommunicationReaction.deleteMany).toHaveBeenCalled();
  });

  it("returns unread count excluding own sender snapshots", async () => {
    mocks.platformCommunicationConversation.findFirst.mockResolvedValue({ id: "conv-1" });
    mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(4);

    const count = await getTeamChatUnreadCount({
      tenantId: "tenant-a",
      teamId: "team-1",
      viewerUserId: "user-1",
    });

    expect(count).toBe(4);
    expect(mocks.platformCommunicationRecipientSnapshot.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deliveryUserId: "user-1",
          engagement: expect.objectContaining({ notIn: expect.arrayContaining(["READ"]) }),
        }),
      }),
    );
  });

  it("marks conversation read using snapshot engagement READ", async () => {
    mocks.platformCommunicationConversation.findFirst.mockResolvedValue({ id: "conv-1" });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      { id: "snap-1", engagement: "PENDING" },
      { id: "snap-2", engagement: "ACKNOWLEDGED" },
    ]);
    mocks.platformCommunicationRecipientSnapshot.update.mockResolvedValue({});
    mocks.notification.updateMany.mockResolvedValue({ count: 1 });

    const updated = await markTeamChatConversationRead({
      tenantId: "tenant-a",
      teamId: "team-1",
      viewerUserId: "user-1",
    });

    expect(updated).toBe(1);
    expect(mocks.platformCommunicationRecipientSnapshot.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ engagement: "READ" }) }),
    );
  });
});
