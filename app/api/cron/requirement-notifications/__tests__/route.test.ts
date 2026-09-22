import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  processRequirements: vi.fn(),
  processDeliveries: vi.fn(),
}));

vi.mock("@/lib/notifications/requirement-deadline-processor", () => ({
  processRequirementDeadlineNotifications: mocks.processRequirements,
}));

vi.mock("@/lib/notifications/delivery-processor", () => ({
  processPendingNotificationDeliveries: mocks.processDeliveries,
}));

import { GET } from "../route";

describe("GET /api/cron/requirement-notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    mocks.processRequirements.mockResolvedValue({
      reminderCreated: 0,
      overdueCreated: 0,
      tenantsProcessed: 0,
    });
    mocks.processDeliveries.mockResolvedValue({
      examined: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      claimed: 0,
    });
  });

  it("N41 — rejects without CRON_SECRET", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/requirement-notifications"));
    expect(res.status).toBe(401);
  });

  it("N41 — accepts bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const res = await GET(
      new NextRequest("http://localhost/api/cron/requirement-notifications", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.processRequirements).toHaveBeenCalled();
    expect(mocks.processDeliveries).toHaveBeenCalled();
  });
});
