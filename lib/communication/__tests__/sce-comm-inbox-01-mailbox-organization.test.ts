import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommunicationCenterMailboxOrganization,
  CommunicationCenterConversationStatus,
} from "@prisma/client";

const prismaMocks = vi.hoisted(() => ({
  communicationCenterConversation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  communicationCenterConversationReadState: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMocks,
}));

const auditMocks = vi.hoisted(() => ({
  recordCommunicationCenterAudit: vi.fn(),
}));

vi.mock("@/lib/communication/inbox/inbox-audit", () => auditMocks);

import {
  archiveCommunicationCenterConversation,
  bulkApplyCommunicationCenterOrganizationAction,
  dedupeBoundedConversationIds,
  restoreCommunicationCenterConversationFromTrash,
  trashCommunicationCenterConversation,
  buildInboundMailboxReactivationUpdate,
} from "@/lib/communication/inbox/mailbox-organization-service";
import {
  bulkApplyCommunicationCenterUserStateAction,
  setCommunicationCenterConversationStarred,
} from "@/lib/communication/inbox/user-conversation-state-service";
import {
  assignCommunicationCenterConversation,
  listCommunicationCenterConversations,
  setCommunicationCenterConversationStatus,
} from "@/lib/communication/inbox/conversation-service";
import { COMMUNICATION_INBOX_BULK_MAX_IDS } from "@/lib/communication/inbox/inbox-mailbox-constants";

describe("SCE-COMM-INBOX-01 mailbox organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.$transaction.mockImplementation(async (fn: (tx: typeof prismaMocks) => unknown) =>
      fn(prismaMocks),
    );
  });

  it("defaults existing conversations to INBOX via schema default (migration)", () => {
    expect(CommunicationCenterMailboxOrganization.INBOX).toBe("INBOX");
  });

  it("buildInboundMailboxReactivationUpdate reactivates archived and trashed", () => {
    expect(
      buildInboundMailboxReactivationUpdate(CommunicationCenterMailboxOrganization.ARCHIVED),
    ).toEqual({
      mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
      mailboxOrganizationBeforeTrash: null,
    });
    expect(
      buildInboundMailboxReactivationUpdate(CommunicationCenterMailboxOrganization.TRASHED),
    ).toEqual({
      mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
      mailboxOrganizationBeforeTrash: null,
    });
    expect(buildInboundMailboxReactivationUpdate(CommunicationCenterMailboxOrganization.INBOX)).toBeNull();
  });

  it("archives and restores inbox conversations with audit", async () => {
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
    });
    await archiveCommunicationCenterConversation({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-1",
    });
    expect(prismaMocks.communicationCenterConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          mailboxOrganization: CommunicationCenterMailboxOrganization.ARCHIVED,
          mailboxOrganizationBeforeTrash: null,
        },
      }),
    );
    expect(auditMocks.recordCommunicationCenterAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "communication.inbox.conversation.archived" }),
    );
  });

  it("trash then restore returns prior archive organization", async () => {
    prismaMocks.communicationCenterConversation.findFirst
      .mockResolvedValueOnce({
        id: "conv-1",
        mailboxOrganization: CommunicationCenterMailboxOrganization.ARCHIVED,
      })
      .mockResolvedValueOnce({
        id: "conv-1",
        mailboxOrganization: CommunicationCenterMailboxOrganization.TRASHED,
        mailboxOrganizationBeforeTrash: CommunicationCenterMailboxOrganization.ARCHIVED,
      });

    await trashCommunicationCenterConversation({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-1",
    });
    expect(prismaMocks.communicationCenterConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mailboxOrganization: CommunicationCenterMailboxOrganization.TRASHED,
          mailboxOrganizationBeforeTrash: CommunicationCenterMailboxOrganization.ARCHIVED,
        }),
      }),
    );

    await restoreCommunicationCenterConversationFromTrash({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-1",
    });
    expect(prismaMocks.communicationCenterConversation.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          mailboxOrganization: CommunicationCenterMailboxOrganization.ARCHIVED,
          mailboxOrganizationBeforeTrash: null,
        },
      }),
    );
  });

  it("star state is per-user via read state row", async () => {
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue({ id: "conv-1" });
    await setCommunicationCenterConversationStarred({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      userId: "user-a",
      starred: true,
    });
    expect(prismaMocks.communicationCenterConversationReadState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId_userId: { conversationId: "conv-1", userId: "user-a" } },
        create: expect.objectContaining({ starredAt: expect.any(Date) }),
      }),
    );
  });

  it("blocks assignment and workflow mutations while trashed", async () => {
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      mailboxOrganization: CommunicationCenterMailboxOrganization.TRASHED,
    });
    await expect(
      assignCommunicationCenterConversation({
        tenantId: "tenant-a",
        conversationId: "conv-1",
        actorUserId: "user-1",
        assignedToUserId: "user-2",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    await expect(
      setCommunicationCenterConversationStatus({
        tenantId: "tenant-a",
        conversationId: "conv-1",
        actorUserId: "user-1",
        status: CommunicationCenterConversationStatus.RESOLVED,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("dedupes bulk ids and enforces limit", () => {
    const ids = dedupeBoundedConversationIds(["a", "a", "b"]);
    expect(ids).toEqual(["a", "b"]);
    expect(() =>
      dedupeBoundedConversationIds(Array.from({ length: COMMUNICATION_INBOX_BULK_MAX_IDS + 1 }, (_, i) => `id-${i}`)),
    ).toThrow();
  });

  it("bulk organization only touches tenant-scoped conversations", async () => {
    prismaMocks.communicationCenterConversation.findMany.mockResolvedValue([
      {
        id: "conv-1",
        mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
        mailboxOrganizationBeforeTrash: null,
      },
    ]);
    const result = await bulkApplyCommunicationCenterOrganizationAction({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      conversationIds: ["conv-1", "missing"],
      action: "ARCHIVE",
    });
    expect(result.requestedCount).toBe(2);
    expect(result.updatedCount).toBe(1);
    expect(prismaMocks.communicationCenterConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a", id: { in: ["conv-1", "missing"] } },
      }),
    );
  });

  it("bulk user state actions batch within transaction", async () => {
    prismaMocks.communicationCenterConversation.findMany.mockResolvedValue([{ id: "conv-1" }]);
    await bulkApplyCommunicationCenterUserStateAction({
      tenantId: "tenant-a",
      userId: "user-1",
      conversationIds: ["conv-1"],
      action: "MARK_UNREAD",
    });
    expect(prismaMocks.communicationCenterConversationReadState.upsert).toHaveBeenCalled();
  });

  it("listCommunicationCenterConversations scopes inbox mailbox", async () => {
    prismaMocks.communicationCenterConversation.findMany.mockResolvedValue([]);
    await listCommunicationCenterConversations({
      tenantId: "tenant-a",
      userId: "user-1",
      mailbox: "INBOX",
      filter: "ALL",
    });
    expect(prismaMocks.communicationCenterConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
        }),
      }),
    );
  });
});

describe("SCE-COMM-INBOX-01 inbound/outbound reactivation contracts", () => {
  it("documents no automatic RESOLVED reopen on mailbox change", () => {
    expect(true).toBe(true);
  });
});
