import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../billing-inbound-mailbox-repository", () => ({
  getBillingInboundMailboxState: vi.fn(),
  countBillingInboundUnresolvedMessages: vi.fn(),
  listBillingInboundUnresolvedMessages: vi.fn(),
}));

vi.mock("../billing-imap-config", () => ({
  getBillingImapConfigReadiness: vi.fn(),
}));

vi.mock("@/lib/server/external-side-effect-policy", () => ({
  isExternalSideEffectConfigured: vi.fn(),
}));

const mailboxRepo = await import("../billing-inbound-mailbox-repository");
const imapConfig = await import("../billing-imap-config");
const sideEffects = await import("@/lib/server/external-side-effect-policy");
const { getBillingCommunicationOperationsSnapshot } = await import(
  "../billing-inbound-operations-service"
);

describe("billing inbound operations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(imapConfig.getBillingImapConfigReadiness).mockReturnValue({
      enabled: true,
      hostConfigured: true,
      portConfigured: true,
      userConfigured: true,
      passwordConfigured: true,
      tlsConfigured: true,
    });
    vi.mocked(sideEffects.isExternalSideEffectConfigured).mockReturnValue(true);
    vi.mocked(mailboxRepo.countBillingInboundUnresolvedMessages).mockResolvedValue(2);
    vi.mocked(mailboxRepo.listBillingInboundUnresolvedMessages).mockResolvedValue([]);
  });

  it("marks cron stale when last sync is older than threshold", async () => {
    vi.mocked(mailboxRepo.getBillingInboundMailboxState).mockResolvedValue({
      id: "s1",
      mailboxKey: "billing@sportclubevo.com",
      uidValidity: 1n,
      lastProcessedUid: 10n,
      lastSyncAt: new Date("2020-01-01T00:00:00.000Z"),
      lastSyncStatus: "OK",
      lastError: null,
    });

    const snapshot = await getBillingCommunicationOperationsSnapshot({
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(snapshot.mailbox.cronHealth).toBe("STALE");
    expect(snapshot.mailbox.unresolvedCount).toBe(2);
  });

  it("reports not configured when inbound imap is disabled", async () => {
    vi.mocked(sideEffects.isExternalSideEffectConfigured).mockReturnValue(false);
    vi.mocked(mailboxRepo.getBillingInboundMailboxState).mockResolvedValue(null);

    const snapshot = await getBillingCommunicationOperationsSnapshot();

    expect(snapshot.mailbox.cronHealth).toBe("NOT_CONFIGURED");
  });
});
