import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/communication/scheduling/publication-schedule-processor", () => ({
  processDuePlatformCommunicationPublicationSchedules: vi.fn(async () => ({
    claimed: 0,
    published: 0,
    failed: 0,
    skipped: 0,
  })),
}));

const { GET } = await import("../route");

describe("cron communication scheduler route auth", () => {
  beforeEach(() => {
    delete process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS;
  });

  it("rejects without CRON_SECRET (fail closed)", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("http://localhost/api/cron/communication-scheduler") as never);
    expect(response.status).toBe(401);
  });

  it("accepts bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const response = await GET(
      new Request("http://localhost/api/cron/communication-scheduler", {
        headers: { authorization: "Bearer cron-secret" },
      }) as never,
    );
    expect(response.status).toBe(200);
  });
});
