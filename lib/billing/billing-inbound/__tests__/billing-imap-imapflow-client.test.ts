import { beforeEach, describe, expect, it, vi } from "vitest";

const imapMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  mailboxOpen: vi.fn(),
  search: vi.fn(),
  fetch: vi.fn(),
  logout: vi.fn(),
  ImapFlow: vi.fn(),
}));

vi.mock("imapflow", () => {
  imapMocks.ImapFlow.mockImplementation(function MockImapFlow(this: Record<string, unknown>) {
    this.connect = imapMocks.connect;
    this.mailboxOpen = imapMocks.mailboxOpen;
    this.search = imapMocks.search;
    this.fetch = imapMocks.fetch;
    this.logout = imapMocks.logout;
  });
  return { ImapFlow: imapMocks.ImapFlow };
});

const { ImapFlowBillingImapClient } = await import("../billing-imap-imapflow-client");

function config() {
  return {
    host: "mail.example.com",
    port: 993,
    tls: true,
    user: "billing@example.com",
    password: "secret",
  };
}

async function* fetchGenerator(items: Array<{ uid: number; source: Buffer }>) {
  for (const item of items) {
    yield item;
  }
}

describe("ImapFlowBillingImapClient fetchNewInboxMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imapMocks.connect.mockResolvedValue(undefined);
    imapMocks.logout.mockResolvedValue(undefined);
  });

  it("A — caught up: UID SEARCH empty, no FETCH, empty batch", async () => {
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 1789372833n });
    imapMocks.search.mockResolvedValue([]);

    const client = new ImapFlowBillingImapClient();
    const batch = await client.fetchNewInboxMessages({
      config: config(),
      uidValidity: 1789372833n,
      lastProcessedUid: 2n,
      batchSize: 25,
    });

    expect(imapMocks.search).toHaveBeenCalledWith({ uid: "3:*" }, { uid: true });
    expect(imapMocks.fetch).not.toHaveBeenCalled();
    expect(batch.messages).toEqual([]);
    expect(batch.highestUid).toBeNull();
  });

  it("B — one new message: searches then UID FETCHes UID 3", async () => {
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 100n });
    imapMocks.search.mockResolvedValue([3]);
    imapMocks.fetch.mockReturnValue(
      fetchGenerator([{ uid: 3, source: Buffer.from("raw-3") }]),
    );

    const client = new ImapFlowBillingImapClient();
    const batch = await client.fetchNewInboxMessages({
      config: config(),
      uidValidity: 100n,
      lastProcessedUid: 2n,
      batchSize: 25,
    });

    expect(imapMocks.fetch).toHaveBeenCalledWith(
      [3],
      { uid: true, source: true },
      { uid: true },
    );
    expect(batch.messages.map((message) => message.uid)).toEqual([3]);
  });

  it("C — several new messages: deterministic UID order", async () => {
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 100n });
    imapMocks.search.mockResolvedValue([3, 4, 5]);
    imapMocks.fetch.mockReturnValue(
      fetchGenerator([
        { uid: 4, source: Buffer.from("raw-4") },
        { uid: 3, source: Buffer.from("raw-3") },
        { uid: 5, source: Buffer.from("raw-5") },
      ]),
    );

    const client = new ImapFlowBillingImapClient();
    const batch = await client.fetchNewInboxMessages({
      config: config(),
      uidValidity: 100n,
      lastProcessedUid: 2n,
      batchSize: 25,
    });

    expect(imapMocks.fetch).toHaveBeenCalledWith(
      [3, 4, 5],
      { uid: true, source: true },
      { uid: true },
    );
    expect(batch.messages.map((message) => message.uid)).toEqual([3, 4, 5]);
  });

  it("D — more than batch limit: fetches only first 25 UIDs", async () => {
    const searchUids = Array.from({ length: 30 }, (_, index) => index + 3);
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 100n });
    imapMocks.search.mockResolvedValue(searchUids);
    imapMocks.fetch.mockReturnValue(fetchGenerator([]));

    const client = new ImapFlowBillingImapClient();
    await client.fetchNewInboxMessages({
      config: config(),
      uidValidity: 100n,
      lastProcessedUid: 2n,
      batchSize: 25,
    });

    expect(imapMocks.fetch).toHaveBeenCalledWith(
      searchUids.slice(0, 25),
      { uid: true, source: true },
      { uid: true },
    );
  });

  it("E — UIDVALIDITY unchanged: searches with UID semantics", async () => {
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 100n });
    imapMocks.search.mockResolvedValue([]);

    const client = new ImapFlowBillingImapClient();
    const batch = await client.fetchNewInboxMessages({
      config: config(),
      uidValidity: 100n,
      lastProcessedUid: 2n,
      batchSize: 25,
    });

    expect(imapMocks.search).toHaveBeenCalledWith({ uid: "3:*" }, { uid: true });
    expect(batch.uidValidity).toBe(100);
  });

  it("F — UIDVALIDITY changed: returns empty batch without SEARCH/FETCH", async () => {
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 200n });

    const client = new ImapFlowBillingImapClient();
    const batch = await client.fetchNewInboxMessages({
      config: config(),
      uidValidity: 100n,
      lastProcessedUid: 2n,
      batchSize: 25,
    });

    expect(imapMocks.search).not.toHaveBeenCalled();
    expect(imapMocks.fetch).not.toHaveBeenCalled();
    expect(batch).toEqual({ uidValidity: 200, messages: [], highestUid: null });
  });

  it("G — UID SEARCH failure is not treated as empty mailbox", async () => {
    imapMocks.mailboxOpen.mockResolvedValue({ uidValidity: 100n });
    imapMocks.search.mockResolvedValue(false);

    const client = new ImapFlowBillingImapClient();
    await expect(
      client.fetchNewInboxMessages({
        config: config(),
        uidValidity: 100n,
        lastProcessedUid: 2n,
        batchSize: 25,
      }),
    ).rejects.toThrow("IMAP UID SEARCH failed");
    expect(imapMocks.fetch).not.toHaveBeenCalled();
  });
});
