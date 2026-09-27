import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/communication/inbox/sync-service", () => ({
  runCommunicationCenterInboundSync: vi.fn(async () => ({
    mailboxes: 0,
    summaries: [],
  })),
}));

const { GET } = await import("../route");

describe("cron communication inbox sync route auth", () => {
  beforeEach(() => {
    delete process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS;
  });

  it("rejects without CRON_SECRET (fail closed)", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("http://localhost/api/cron/communication-inbox-sync") as never);
    expect(response.status).toBe(401);
  });

  it("accepts bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const response = await GET(
      new Request("http://localhost/api/cron/communication-inbox-sync", {
        headers: { authorization: "Bearer cron-secret" },
      }) as never,
    );
    expect(response.status).toBe(200);
  });
});
