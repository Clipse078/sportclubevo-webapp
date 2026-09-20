import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  processDeadlines: vi.fn(),
  processDeliveries: vi.fn(),
}));

vi.mock("@/lib/notifications/deadline-processor", () => ({
  processTaskDeadlineNotifications: mocks.processDeadlines,
}));

vi.mock("@/lib/notifications/delivery-processor", () => ({
  processPendingNotificationDeliveries: mocks.processDeliveries,
}));

import { GET } from "../route";

describe("GET /api/cron/task-notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    mocks.processDeadlines.mockResolvedValue({ dueSoonCreated: 0, overdueCreated: 0, tenantsProcessed: 0 });
    mocks.processDeliveries.mockResolvedValue({ examined: 0, sent: 0, failed: 0, skipped: 0, claimed: 0 });
  });

  it("rejects without CRON_SECRET", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/task-notifications"));
    expect(res.status).toBe(401);
  });

  it("accepts bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const res = await GET(
      new NextRequest("http://localhost/api/cron/task-notifications", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.processDeadlines).toHaveBeenCalled();
    expect(mocks.processDeliveries).toHaveBeenCalled();
  });
});
