import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommunicationCenterContactMatchStatus,
  CommunicationCenterConversationStatus,
  CommunicationCenterImapSecurity,
  CommunicationCenterMailboxStatus,
  CommunicationCenterMessageDirection,
  CommunicationCenterMessageStatus,
} from "@prisma/client";
import {
  COMMUNICATION_SECRET_CRYPTO_TEST_KEY_BASE64,
  CommunicationSecretCryptoError,
  decryptCommunicationSecret,
  encryptCommunicationSecret,
  resolveCommunicationEncryptionKey,
} from "@/lib/communication/inbox/communication-secret-crypto";
import { blockRemoteImages, sanitizeInboundEmailHtml } from "@/lib/communication/inbox/html-sanitizer";
import {
  normalizeSubjectForThreadFallback,
  resolveThreadRootMessageId,
  shouldUseSubjectFallbackThreading,
} from "@/lib/communication/inbox/threading-service";
import { pickInboundImapCandidateUids } from "@/lib/communication/inbox/connector/imap/imap-candidate-uids";
import { buildCommunicationCenterAufgabeSeamReference } from "@/lib/communication/inbox/aufgabe-seam";
import { OutboundEmailTransportError } from "@/lib/email/outbound-email-transport";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  INBOX_MANAGE_PERMISSIONS,
  INBOX_REPLY_PERMISSIONS,
  INBOX_SETTINGS_PERMISSIONS,
  INBOX_VIEW_PERMISSIONS,
} from "@/lib/communication/inbox/authorization";

const prismaMocks = vi.hoisted(() => ({
  communicationCenterMailbox: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  communicationCenterMailboxFolder: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  communicationCenterConversation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  communicationCenterMessage: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  communicationCenterConversationReadState: { upsert: vi.fn() },
  communicationAttachment: { create: vi.fn() },
  communicationCenterMessageAttachment: { create: vi.fn() },
  tenantMembership: { findFirst: vi.fn() },
  person: { findMany: vi.fn() },
  sponsorContact: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

const connectorMocks = vi.hoisted(() => ({
  testConnection: vi.fn(),
  fetchNewInboxMessages: vi.fn(),
}));

const transportMocks = vi.hoisted(() => ({
  sendOutboundEmail: vi.fn(),
  evaluatePlatformEmailReadiness: vi.fn(),
  resolveTenantEmailSender: vi.fn(),
  parseInboundCenterEmailSource: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    ...prismaMocks,
    $transaction: (fn: (tx: typeof prismaMocks) => unknown) => fn(prismaMocks),
  },
}));

vi.mock("@/lib/communication/inbox/connector/imap/imap-connector", () => ({
  createInboundCommunicationConnector: () => ({
    testConnection: connectorMocks.testConnection,
    fetchNewInboxMessages: connectorMocks.fetchNewInboxMessages,
  }),
  setInboundCommunicationConnectorFactory: vi.fn(),
}));

vi.mock("@/lib/email/outbound-email-transport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/outbound-email-transport")>();
  return {
    ...actual,
    sendOutboundEmail: (...args: unknown[]) => transportMocks.sendOutboundEmail(...args),
  };
});

vi.mock("@/lib/communication/platform-email/email-readiness-service", () => ({
  evaluatePlatformEmailReadiness: (...args: unknown[]) =>
    transportMocks.evaluatePlatformEmailReadiness(...args),
}));

vi.mock("@/lib/communication/email-sender-service", () => ({
  resolveTenantEmailSender: (...args: unknown[]) => transportMocks.resolveTenantEmailSender(...args),
}));

vi.mock("@/lib/communication/inbox/mail-parser", () => ({
  parseInboundCenterEmailSource: (...args: unknown[]) =>
    transportMocks.parseInboundCenterEmailSource(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: (...args: unknown[]) => transportMocks.logAction(...args),
}));

const {
  createCommunicationCenterMailbox,
  listCommunicationCenterMailboxes,
  testCommunicationCenterMailboxConnection,
} = await import("@/lib/communication/inbox/mailbox-service");
const { ingestCommunicationCenterImapMessage } = await import("@/lib/communication/inbox/ingestion-service");
const { syncCommunicationCenterMailbox } = await import("@/lib/communication/inbox/sync-service");
const { matchInboundSenderContact } = await import("@/lib/communication/inbox/contact-matching-service");
const { replyToCommunicationCenterConversation } = await import("@/lib/communication/inbox/reply-service");
const {
  assignCommunicationCenterConversation,
  markCommunicationCenterConversationRead,
  setCommunicationCenterConversationStatus,
} = await import("@/lib/communication/inbox/conversation-service");

describe("SCE-COMM-15 Communication Center inbound email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCE_COMMUNICATION_ENCRYPTION_KEY = COMMUNICATION_SECRET_CRYPTO_TEST_KEY_BASE64;
  });

  it("defines inbox permissions", () => {
    expect(PERMISSIONS.COMMUNICATION_INBOX_VIEW).toBe("communication.inbox.view");
    expect(INBOX_VIEW_PERMISSIONS).toContain("communication.inbox.view");
    expect(INBOX_MANAGE_PERMISSIONS).toContain("communication.inbox.manage");
    expect(INBOX_REPLY_PERMISSIONS).toContain("communication.inbox.reply");
    expect(INBOX_SETTINGS_PERMISSIONS).toContain("communication.inbox.settings");
  });

  it("encrypts mailbox credentials without exposing plaintext", () => {
    const encrypted = encryptCommunicationSecret("app-password-secret");
    expect(encrypted).not.toContain("app-password-secret");
    expect(decryptCommunicationSecret(encrypted)).toBe("app-password-secret");
  });

  it("fails closed on production encryption key misconfiguration", () => {
    const prodEnv = { ...process.env, NODE_ENV: "production", APP_ENV: "prod" };
    delete prodEnv.SCE_COMMUNICATION_ENCRYPTION_KEY;
    expect(() => resolveCommunicationEncryptionKey(prodEnv)).toThrow(CommunicationSecretCryptoError);
    expect(() =>
      encryptCommunicationSecret("secret", { ...prodEnv, SCE_COMMUNICATION_ENCRYPTION_KEY: "too-short" }),
    ).toThrow(CommunicationSecretCryptoError);

    const prodEnvWithKey = {
      ...prodEnv,
      SCE_COMMUNICATION_ENCRYPTION_KEY: COMMUNICATION_SECRET_CRYPTO_TEST_KEY_BASE64,
    };
    const encrypted = encryptCommunicationSecret("rotate-me", prodEnvWithKey);
    expect(() =>
      decryptCommunicationSecret(encrypted, {
        ...prodEnvWithKey,
        SCE_COMMUNICATION_ENCRYPTION_KEY:
          "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=",
      }),
    ).toThrow(CommunicationSecretCryptoError);
  });

  it("allows test-only encryption key fallback in NODE_ENV=test", () => {
    const testEnv = { ...process.env, NODE_ENV: "test" };
    delete testEnv.SCE_COMMUNICATION_ENCRYPTION_KEY;
    expect(() => resolveCommunicationEncryptionKey(testEnv)).not.toThrow();
  });

  it("returns public mailbox without credential field", async () => {
    prismaMocks.communicationCenterMailbox.findMany.mockResolvedValue([
      {
        id: "mb-1",
        tenantId: "tenant-a",
        displayName: "IT",
        emailAddress: "it@example.com",
        connectorType: "IMAP",
        status: CommunicationCenterMailboxStatus.ACTIVE,
        imapHost: "imap.example.com",
        imapPort: 993,
        imapSecurity: CommunicationCenterImapSecurity.TLS,
        imapUsername: "it@example.com",
        credentialEncrypted: encryptCommunicationSecret("secret"),
        lastSyncAttemptAt: null,
        lastSyncSuccessAt: null,
        lastSyncErrorCode: null,
        lastSyncErrorMessage: null,
      },
    ]);
    const mailboxes = await listCommunicationCenterMailboxes("tenant-a");
    expect(mailboxes[0].hasCredential).toBe(true);
    expect(mailboxes[0]).not.toHaveProperty("credentialEncrypted");
  });

  it("connection test returns safe auth failure", async () => {
    prismaMocks.communicationCenterMailbox.findFirst.mockResolvedValue({
      id: "mb-1",
      tenantId: "tenant-a",
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "it@example.com",
      credentialEncrypted: encryptCommunicationSecret("bad"),
    });
    connectorMocks.testConnection.mockResolvedValue({
      ok: false,
      code: "AUTH_FAILED",
      message: "Authentication failed",
    });
    const result = await testCommunicationCenterMailboxConnection({
      tenantId: "tenant-a",
      mailboxId: "mb-1",
    });
    expect(result).toEqual({
      ok: false,
      code: "AUTH_FAILED",
      message: "Authentication failed",
    });
  });

  it("connection test succeeds without importing messages", async () => {
    prismaMocks.communicationCenterMailbox.findFirst.mockResolvedValue({
      id: "mb-1",
      tenantId: "tenant-a",
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "it@example.com",
      credentialEncrypted: encryptCommunicationSecret("good"),
    });
    connectorMocks.testConnection.mockResolvedValue({ ok: true });
    await expect(
      testCommunicationCenterMailboxConnection({ tenantId: "tenant-a", mailboxId: "mb-1" }),
    ).resolves.toEqual({ ok: true });
    expect(connectorMocks.fetchNewInboxMessages).not.toHaveBeenCalled();
  });

  it("sanitizes inbound HTML and blocks remote images", () => {
    const sanitized = sanitizeInboundEmailHtml(
      '<p>Hello</p><script>alert(1)</script><img src="https://tracker.example/pixel.png" />',
    );
    expect(sanitized).not.toMatch(/script/i);
    expect(blockRemoteImages('<img src="https://x.example/a.png">')).toContain("data-blocked-remote-src");
  });

  it("threads by Message-ID and avoids unrelated subject merge by default", () => {
    const root = resolveThreadRootMessageId({
      messageIdHeader: "<a@example.com>",
      inReplyTo: null,
      references: [],
      subject: "Hello",
    });
    expect(root).toBe("<a@example.com>");
    expect(
      shouldUseSubjectFallbackThreading({
        messageIdHeader: "<a@example.com>",
        inReplyTo: null,
        references: [],
      }),
    ).toBe(false);
    expect(normalizeSubjectForThreadFallback("Re: Hello")).toBe("hello");
  });

  it("prevents duplicate import by UID and Message-ID", async () => {
    prismaMocks.communicationCenterMessage.findFirst.mockResolvedValueOnce({
      id: "msg-1",
      conversationId: "conv-1",
    });
    const byUid = await ingestCommunicationCenterImapMessage({
      tenantId: "tenant-a",
      mailboxId: "mb-1",
      folderId: "folder-1",
      fetched: {
        uid: 10,
        uidValidity: 100,
        providerMessageKey: "100:10",
        rawSource: Buffer.from("raw"),
      },
    });
    expect(byUid.kind).toBe("DUPLICATE");

    prismaMocks.communicationCenterMessage.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "msg-2", conversationId: "conv-2" });
    transportMocks.parseInboundCenterEmailSource.mockResolvedValueOnce({
      messageIdHeader: "<dup@example.com>",
      inReplyTo: null,
      references: [],
      fromAddress: "sender@example.com",
      fromDisplayName: null,
      toAddresses: [],
      ccAddresses: [],
      subject: "Test",
      bodyText: "Body",
      bodyHtmlSanitized: null,
      receivedAt: new Date(),
      attachments: [],
    });
    const byMessageId = await ingestCommunicationCenterImapMessage({
      tenantId: "tenant-a",
      mailboxId: "mb-1",
      folderId: "folder-1",
      fetched: {
        uid: 11,
        uidValidity: 100,
        providerMessageKey: "100:11",
        rawSource: Buffer.from("raw"),
      },
    });
    expect(byMessageId.kind).toBe("DUPLICATE");
  });

  it("does not advance sync cursor past a retryable ingest failure", async () => {
    prismaMocks.communicationCenterMailbox.updateMany.mockResolvedValue({ count: 1 });
    prismaMocks.communicationCenterMailboxFolder.findFirst.mockResolvedValue({
      id: "folder-1",
      uidValidity: 100n,
      lastProcessedUid: 5n,
    });
    connectorMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 100,
      highestUid: 7,
      messages: [
        { uid: 6, uidValidity: 100, providerMessageKey: "100:6", rawSource: Buffer.from("a") },
        { uid: 7, uidValidity: 100, providerMessageKey: "100:7", rawSource: Buffer.from("b") },
      ],
    });
    transportMocks.parseInboundCenterEmailSource
      .mockResolvedValueOnce({
        messageIdHeader: "<ok@example.com>",
        inReplyTo: null,
        references: [],
        fromAddress: "sender@example.com",
        fromDisplayName: null,
        toAddresses: [],
        ccAddresses: [],
        subject: "Test",
        bodyText: "Body",
        bodyHtmlSanitized: null,
        receivedAt: new Date(),
        attachments: [],
      })
      .mockRejectedValueOnce(new Error("parse failed"));

    prismaMocks.communicationCenterMessage.findFirst.mockResolvedValue(null);
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue(null);
    prismaMocks.communicationCenterConversation.create.mockResolvedValue({ id: "conv-1" });
    prismaMocks.communicationCenterConversation.update.mockResolvedValue({ id: "conv-1" });
    prismaMocks.communicationCenterMessage.create.mockResolvedValue({ id: "msg-1" });
    prismaMocks.person.findMany.mockResolvedValue([]);
    prismaMocks.sponsorContact.findMany.mockResolvedValue([]);

    await syncCommunicationCenterMailbox({
      id: "mb-1",
      tenantId: "tenant-a",
      status: CommunicationCenterMailboxStatus.ACTIVE,
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "it@example.com",
      credentialEncrypted: encryptCommunicationSecret("secret"),
    } as never);

    expect(prismaMocks.communicationCenterMailboxFolder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastProcessedUid: 6n }) }),
    );
  });

  it("increments IMAP sync cursor and respects UID batching", async () => {
    expect(pickInboundImapCandidateUids([1, 2, 3, 4], 1, 2)).toEqual([2, 3]);
    prismaMocks.communicationCenterMailbox.updateMany.mockResolvedValue({ count: 1 });
    prismaMocks.communicationCenterMailboxFolder.findFirst.mockResolvedValue({
      id: "folder-1",
      uidValidity: 100n,
      lastProcessedUid: 5n,
    });
    connectorMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 100,
      highestUid: 7,
      messages: [
        { uid: 6, uidValidity: 100, providerMessageKey: "100:6", rawSource: Buffer.from("a") },
        { uid: 7, uidValidity: 100, providerMessageKey: "100:7", rawSource: Buffer.from("b") },
      ],
    });
    transportMocks.parseInboundCenterEmailSource.mockResolvedValue({
      messageIdHeader: "<m@example.com>",
      inReplyTo: null,
      references: [],
      fromAddress: "sender@example.com",
      fromDisplayName: null,
      toAddresses: [],
      ccAddresses: [],
      subject: "Test",
      bodyText: "Body",
      bodyHtmlSanitized: null,
      receivedAt: new Date(),
      attachments: [],
    });
    prismaMocks.communicationCenterMessage.findFirst.mockResolvedValue(null);
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue(null);
    prismaMocks.communicationCenterConversation.create.mockResolvedValue({ id: "conv-1" });
    prismaMocks.communicationCenterConversation.update.mockResolvedValue({ id: "conv-1" });
    prismaMocks.communicationCenterMessage.create.mockResolvedValue({ id: "msg-1" });
    prismaMocks.person.findMany.mockResolvedValue([]);
    prismaMocks.sponsorContact.findMany.mockResolvedValue([]);

    const summary = await syncCommunicationCenterMailbox({
      id: "mb-1",
      tenantId: "tenant-a",
      status: CommunicationCenterMailboxStatus.ACTIVE,
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "it@example.com",
      credentialEncrypted: encryptCommunicationSecret("secret"),
    } as never);

    expect(summary.fetched).toBe(2);
    expect(prismaMocks.communicationCenterMailboxFolder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastProcessedUid: 7n }) }),
    );
  });

  it("matches person and ambiguous contacts tenant-scoped", async () => {
    prismaMocks.person.findMany.mockResolvedValueOnce([{ id: "person-1" }]);
    prismaMocks.sponsorContact.findMany.mockResolvedValueOnce([]);
    await expect(matchInboundSenderContact("tenant-a", "member@example.com")).resolves.toEqual({
      status: CommunicationCenterContactMatchStatus.MATCHED,
      matchedPersonId: "person-1",
      matchedSponsorContactId: null,
    });

    prismaMocks.person.findMany.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);
    prismaMocks.sponsorContact.findMany.mockResolvedValueOnce([]);
    await expect(matchInboundSenderContact("tenant-a", "x@example.com")).resolves.toEqual({
      status: CommunicationCenterContactMatchStatus.AMBIGUOUS,
      matchedPersonId: null,
      matchedSponsorContactId: null,
    });
  });

  it("supports per-user read state and assignment within tenant", async () => {
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue({ id: "conv-1" });
    prismaMocks.tenantMembership.findFirst.mockResolvedValue({ id: "tm-1" });
    await assignCommunicationCenterConversation({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-admin",
      assignedToUserId: "user-2",
    });
    expect(prismaMocks.communicationCenterConversation.update).toHaveBeenCalled();

    await markCommunicationCenterConversationRead({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      userId: "user-1",
    });
    expect(prismaMocks.communicationCenterConversationReadState.upsert).toHaveBeenCalled();

    await setCommunicationCenterConversationStatus({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-admin",
      status: CommunicationCenterConversationStatus.RESOLVED,
    });
    expect(prismaMocks.communicationCenterConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: CommunicationCenterConversationStatus.RESOLVED },
      }),
    );
  });

  it("replies through COMM-14 transport with idempotency and failure state", async () => {
    prismaMocks.communicationCenterMessage.findFirst.mockResolvedValueOnce(null);
    prismaMocks.communicationCenterConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      subject: "Hello",
      mailboxId: "mb-1",
      threadRootMessageId: "<root@example.com>",
      mailbox: { emailAddress: "it@example.com" },
      messages: [
        {
          direction: CommunicationCenterMessageDirection.INBOUND,
          fromAddress: "customer@example.com",
          messageIdHeader: "<in@example.com>",
          references: [],
        },
      ],
    });
    transportMocks.evaluatePlatformEmailReadiness.mockResolvedValue({ ready: true, reasons: [] });
    transportMocks.resolveTenantEmailSender.mockResolvedValue({
      formattedFrom: "Club <it@example.com>",
      emailAddress: "it@example.com",
      displayName: "Club",
    });
    transportMocks.sendOutboundEmail.mockRejectedValue(
      new OutboundEmailTransportError("TRANSIENT_PROVIDER_FAILURE", "provider down", false),
    );
    prismaMocks.communicationCenterMessage.create.mockResolvedValue({ id: "out-1" });
    prismaMocks.communicationCenterMessage.update.mockResolvedValue({
      id: "out-1",
      status: CommunicationCenterMessageStatus.FAILED,
      providerMessageId: null,
      deliveryError: "provider down",
    });

    const failed = await replyToCommunicationCenterConversation({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-1",
      bodyText: "Thanks",
      idempotencyKey: "idem-1",
    });
    expect(transportMocks.sendOutboundEmail).toHaveBeenCalled();
    expect(failed.status).toBe(CommunicationCenterMessageStatus.FAILED);

    prismaMocks.communicationCenterMessage.findFirst.mockResolvedValueOnce({
      id: "out-1",
      status: CommunicationCenterMessageStatus.FAILED,
      providerMessageId: null,
      deliveryError: "provider down",
    });
    const duplicate = await replyToCommunicationCenterConversation({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      actorUserId: "user-1",
      bodyText: "Thanks",
      idempotencyKey: "idem-1",
    });
    expect(duplicate.messageId).toBe("out-1");
    expect(transportMocks.sendOutboundEmail).toHaveBeenCalledTimes(1);
  });

  it("creates mailbox with encrypted credential and default INBOX folder", async () => {
    prismaMocks.communicationCenterMailbox.create.mockResolvedValue({
      id: "mb-new",
      tenantId: "tenant-a",
      displayName: "Support",
      emailAddress: "support@example.com",
      connectorType: "IMAP",
      status: CommunicationCenterMailboxStatus.ACTIVE,
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "support@example.com",
      credentialEncrypted: "v1:abc",
      lastSyncAttemptAt: null,
      lastSyncSuccessAt: null,
      lastSyncErrorCode: null,
      lastSyncErrorMessage: null,
    });
    prismaMocks.communicationCenterMailboxFolder.create.mockResolvedValue({ id: "folder-1" });

    await createCommunicationCenterMailbox({
      tenantId: "tenant-a",
      actorUserId: "admin-1",
      displayName: "Support",
      emailAddress: "support@example.com",
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "support@example.com",
      credential: "secret-value",
    });

    expect(prismaMocks.communicationCenterMailbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          credentialEncrypted: expect.not.stringContaining("secret-value"),
        }),
      }),
    );
    expect(prismaMocks.communicationCenterMailboxFolder.create).toHaveBeenCalled();
  });

  it("exposes Aufgabe seam without parallel task model", () => {
    expect(buildCommunicationCenterAufgabeSeamReference({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      messageId: "msg-1",
    })).toEqual({
      tenantId: "tenant-a",
      conversationId: "conv-1",
      messageId: "msg-1",
      sourceLabel: "COMMUNICATION_CENTER_INBOX",
    });
  });

  it("enforces tenant isolation at service lookup boundaries", async () => {
    prismaMocks.communicationCenterMailbox.findFirst.mockResolvedValue(null);
    await expect(
      testCommunicationCenterMailboxConnection({ tenantId: "tenant-a", mailboxId: "mb-other-tenant" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
