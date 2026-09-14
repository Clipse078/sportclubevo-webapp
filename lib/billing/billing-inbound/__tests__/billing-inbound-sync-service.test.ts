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

  it("skips when inbound is not configured", async () => {
    delete process.env.BILLING_INBOUND_ENABLED;
    const summary = await runBillingInboundImapSync();
    expect(summary.skipped).toBe(true);
    expect(imapMocks.fetchNewInboxMessages).not.toHaveBeenCalled();
  });
});
