import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStripeWebhookSecret: vi.fn(),
  getStripeClient: vi.fn(),
  processStripeBillingWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/integrations/stripe/config", () => ({
  getStripeWebhookSecret: mocks.getStripeWebhookSecret,
}));

vi.mock("@/lib/integrations/stripe/client", () => ({
  getStripeClient: mocks.getStripeClient,
}));

vi.mock("@/lib/integrations/stripe/stripe-webhook-processor", () => ({
  processStripeBillingWebhookEvent: mocks.processStripeBillingWebhookEvent,
}));

import { POST } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStripeWebhookSecret.mockReturnValue("whsec_test");
  mocks.getStripeClient.mockReturnValue({
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ id: "evt_1", type: "invoice.paid", data: {} }),
    },
  });
  mocks.processStripeBillingWebhookEvent.mockResolvedValue({ outcome: "processed", handler: "x" });
});

describe("stripe webhook route", () => {
  it("rejects missing signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid signature", async () => {
    mocks.getStripeClient.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error("bad sig");
        }),
      },
    });
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("processes valid events", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.processStripeBillingWebhookEvent).toHaveBeenCalled();
  });
});
