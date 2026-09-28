import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/communication/smart-reminders/reminder-schedule-processor", () => ({
  processDueCommunicationReminderSchedules: vi.fn(async () => ({
    processed: 0,
    published: 0,
    skipped: 0,
    failed: 0,
  })),
}));

const { GET } = await import("../route");

describe("cron communication reminders route auth", () => {
  beforeEach(() => {
    delete process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS;
  });

  it("rejects without CRON_SECRET (fail closed)", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("http://localhost/api/cron/communication-reminders") as never);
    expect(response.status).toBe(401);
  });

  it("accepts bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const response = await GET(
      new Request("http://localhost/api/cron/communication-reminders", {
        headers: { authorization: "Bearer cron-secret" },
      }) as never,
    );
    expect(response.status).toBe(200);
  });
});
