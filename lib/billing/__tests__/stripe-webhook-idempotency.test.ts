import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    stripeWebhookProcessedEvent: {
      create: mocks.create,
    },
  },
}));

import { claimStripeWebhookEvent } from "../stripe-webhook-idempotency";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("stripe webhook idempotency", () => {
  it("claims new events", async () => {
    mocks.create.mockResolvedValue({});
    await expect(
      claimStripeWebhookEvent({ stripeEventId: "evt_1", eventType: "invoice.payment_failed" }),
    ).resolves.toBe("claimed");
  });

  it("detects duplicates", async () => {
    mocks.create.mockRejectedValue({ code: "P2002" });
    await expect(
      claimStripeWebhookEvent({ stripeEventId: "evt_1", eventType: "invoice.payment_failed" }),
    ).resolves.toBe("duplicate");
  });
});
