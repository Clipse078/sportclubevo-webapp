import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processBillingDunning: vi.fn(),
  isExternalSideEffectConfigured: vi.fn(),
}));

vi.mock("@/lib/billing/platform-dunning-service", () => ({
  processBillingDunning: mocks.processBillingDunning,
}));

vi.mock("@/lib/server/external-side-effect-policy", () => ({
  isExternalSideEffectConfigured: mocks.isExternalSideEffectConfigured,
}));

import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test-secret";
  mocks.isExternalSideEffectConfigured.mockReturnValue(true);
  mocks.processBillingDunning.mockResolvedValue({ evaluated: 0, suspended: 0 });
});

describe("billing-dunning cron route", () => {
  it("requires authorization", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/billing-dunning") as never,
    );
    expect(response.status).toBe(401);
  });

  it("runs dunning processor when authorized", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/billing-dunning", {
        headers: { authorization: "Bearer cron-test-secret" },
      }) as never,
    );
    expect(response.status).toBe(200);
    expect(mocks.processBillingDunning).toHaveBeenCalled();
  });
});
