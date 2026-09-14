import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/billing/billing-inbound/billing-inbound-sync-service", () => ({
  runBillingInboundImapSync: vi.fn(async () => ({
    mailboxKey: "billing@sportclubevo.com",
    fetched: 0,
    ingested: 0,
    duplicate: 0,
    unresolved: 0,
    failed: 0,
    skipped: true,
  })),
}));

const { GET } = await import("../route");

describe("cron billing inbound sync route auth", () => {
  beforeEach(() => {
    delete process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS;
  });

  it("rejects unauthorized callers", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("http://localhost/api/cron/billing-inbound-sync") as never);
    expect(response.status).toBe(401);
  });

  it("accepts bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const response = await GET(
      new Request("http://localhost/api/cron/billing-inbound-sync", {
        headers: { authorization: "Bearer cron-secret" },
      }) as never,
    );
    expect(response.status).toBe(200);
  });
});
