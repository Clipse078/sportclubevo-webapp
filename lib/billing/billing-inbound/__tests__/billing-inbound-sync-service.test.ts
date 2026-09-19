import { beforeEach, describe, expect, it, vi } from "vitest";

const mailboxMocks = vi.hoisted(() => ({
  getBillingInboundMailboxState: vi.fn(),
  upsertBillingInboundMailboxState: vi.fn(),
}));

const ingestMocks = vi.hoisted(() => ({
  ingestBillingInboundImapMessage: vi.fn(),
}));

const imapMocks = vi.hoisted(() => ({
  fetchNewInboxMessages: vi.fn(),
}));

vi.mock("../billing-inbound-mailbox-repository", () => ({
  getBillingInboundMailboxState: mailboxMocks.getBillingInboundMailboxState,
  upsertBillingInboundMailboxState: mailboxMocks.upsertBillingInboundMailboxState,
}));

vi.mock("../billing-inbound-ingestion-service", () => ({
  ingestBillingInboundImapMessage: ingestMocks.ingestBillingInboundImapMessage,
}));

vi.mock("../billing-imap-client", () => ({
  createBillingImapClient: async () => ({
    fetchNewInboxMessages: imapMocks.fetchNewInboxMessages,
  }),
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-attachment-cleanup-service", () => ({
  runStaleStagedBillingCommunicationAttachmentCleanup: vi.fn().mockResolvedValue({
    attempted: 0,
    removed: 0,
    storageFailures: 0,
    dbFailures: 0,
    skippedNotStaged: 0,
  }),
}));

const { runBillingInboundImapSync } = await import("../billing-inbound-sync-service");

describe("billing inbound sync cursor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BILLING_INBOUND_ENABLED = "1";
    process.env.BILLING_IMAP_HOST = "mail.infomaniak.com";
    process.env.BILLING_IMAP_PORT = "993";
    process.env.BILLING_IMAP_USER = "billing@sportclubevo.com";
    process.env.BILLING_IMAP_PASSWORD = "secret";
    process.env.BILLING_IMAP_TLS = "1";
    delete process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS;

    mailboxMocks.getBillingInboundMailboxState.mockResolvedValue({
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 100n,
      lastProcessedUid: 5n,
    });
    imapMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 100,
      highestUid: 7,
      messages: [
        {
          uid: 6,
          uidValidity: 100,
          providerMessageId: "100:6",
          rawSource: Buffer.from("raw"),
        },
        {
          uid: 7,
          uidValidity: 100,
          providerMessageId: "100:7",
          rawSource: Buffer.from("raw"),
        },
      ],
    });
    ingestMocks.ingestBillingInboundImapMessage.mockResolvedValue({ kind: "INGESTED", communicationId: "c1", tenantId: "t1" });
  });

  it("advances cursor only for processed messages", async () => {
    await runBillingInboundImapSync();
    expect(imapMocks.fetchNewInboxMessages).toHaveBeenCalledWith(
      expect.objectContaining({ lastProcessedUid: 5n }),
    );
    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({ lastProcessedUid: 7n }),
    );
  });

  it("B — one new message advances cursor to UID 3", async () => {
    mailboxMocks.getBillingInboundMailboxState.mockResolvedValue({
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 100n,
      lastProcessedUid: 2n,
    });
    imapMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 100,
      highestUid: 3,
      messages: [
        {
          uid: 3,
          uidValidity: 100,
          providerMessageId: "100:3",
          rawSource: Buffer.from("raw"),
        },
      ],
    });

    await runBillingInboundImapSync();

    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({ lastProcessedUid: 3n, lastSyncStatus: "OK" }),
    );
  });

  it("C — several new messages advance cursor to highest UID", async () => {
    mailboxMocks.getBillingInboundMailboxState.mockResolvedValue({
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 100n,
      lastProcessedUid: 2n,
    });
    imapMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 100,
      highestUid: 5,
      messages: [3, 4, 5].map((uid) => ({
        uid,
        uidValidity: 100,
        providerMessageId: `100:${uid}`,
        rawSource: Buffer.from("raw"),
      })),
    });
    ingestMocks.ingestBillingInboundImapMessage.mockResolvedValue({
      kind: "INGESTED",
      communicationId: "c1",
      tenantId: "t1",
    });

    await runBillingInboundImapSync();

    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({ lastProcessedUid: 5n, lastSyncStatus: "OK" }),
    );
  });

  it("A — caught up mailbox keeps cursor and records OK", async () => {
    mailboxMocks.getBillingInboundMailboxState.mockResolvedValue({
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 1789372833n,
      lastProcessedUid: 2n,
    });
    imapMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 1789372833,
      highestUid: null,
      messages: [],
    });

    const summary = await runBillingInboundImapSync();

    expect(summary.fetched).toBe(0);
    expect(summary.ingested).toBe(0);
    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({
        lastProcessedUid: 2n,
        lastSyncStatus: "OK",
        lastError: null,
      }),
    );
  });

  it("F — UIDVALIDITY reset preserves existing semantics", async () => {
    imapMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 999,
      highestUid: null,
      messages: [],
    });

    const summary = await runBillingInboundImapSync();

    expect(summary.fetched).toBe(0);
    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({
        uidValidity: 999n,
        lastProcessedUid: null,
        lastSyncStatus: "UIDVALIDITY_RESET",
        lastError: null,
      }),
    );
  });

  it("G — unexpected IMAP error keeps cursor and records ERROR", async () => {
    mailboxMocks.getBillingInboundMailboxState.mockResolvedValue({
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 100n,
      lastProcessedUid: 2n,
    });
    imapMocks.fetchNewInboxMessages.mockRejectedValue(
      Object.assign(new Error("Command failed"), {
        responseStatus: "NO",
        responseText: "Invalid messageset",
        command: "UID FETCH",
      }),
    );

    await expect(runBillingInboundImapSync()).rejects.toThrow("Command failed");
    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({
        lastProcessedUid: 2n,
        lastSyncStatus: "ERROR",
        lastError: "IMAP UID FETCH failed: NO Invalid messageset",
      }),
    );
  });

  it("H — duplicate message keeps sync successful and advances cursor", async () => {
    mailboxMocks.getBillingInboundMailboxState.mockResolvedValue({
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 100n,
      lastProcessedUid: 2n,
    });
    imapMocks.fetchNewInboxMessages.mockResolvedValue({
      uidValidity: 100,
      highestUid: 3,
      messages: [
        {
          uid: 3,
          uidValidity: 100,
          providerMessageId: "100:3",
          rawSource: Buffer.from("raw"),
        },
      ],
    });
    ingestMocks.ingestBillingInboundImapMessage.mockResolvedValue({
      kind: "DUPLICATE",
      communicationId: "c-existing",
      tenantId: "t1",
    });

    const summary = await runBillingInboundImapSync();

    expect(summary.duplicate).toBe(1);
    expect(mailboxMocks.upsertBillingInboundMailboxState).toHaveBeenCalledWith(
      expect.objectContaining({
        lastProcessedUid: 3n,
        lastSyncStatus: "OK",
      }),
    );
  });

  it("skips when inbound is not configured", async () => {
    delete process.env.BILLING_INBOUND_ENABLED;
    const summary = await runBillingInboundImapSync();
    expect(summary.skipped).toBe(true);
    expect(imapMocks.fetchNewInboxMessages).not.toHaveBeenCalled();
  });
});
