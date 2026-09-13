import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  runAutomaticRecurringBillingCron: vi.fn(),
}));

vi.mock("@/lib/billing/recurring/recurring-billing-service", () => ({
  runAutomaticRecurringBillingCron: mocks.runAutomaticRecurringBillingCron,
}));

vi.mock("@/lib/server/external-side-effect-policy", () => ({
  isExternalSideEffectConfigured: vi.fn(() => true),
}));

describe("GET /api/cron/recurring-billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.CRON_SECRET = "test-secret";
    mocks.runAutomaticRecurringBillingCron.mockResolvedValue({
      runKey: "run-1",
      summary: { contractsEvaluated: 1, invoicesCreated: 0 },
    });
  });

  it("rejects unauthenticated requests", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/cron/recurring-billing"));
    expect(res.status).toBe(401);
  });

  it("runs canonical billing service when authorized", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest("http://localhost/api/cron/recurring-billing", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.runAutomaticRecurringBillingCron).toHaveBeenCalledTimes(1);
  });
});
