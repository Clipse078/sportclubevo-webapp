import { afterEach, describe, expect, it, vi } from "vitest";

describe("billing delivery transport mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses dry-run on Vercel preview by default", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BILLING_DELIVERY_LIVE", "");
    const { shouldUseBillingDeliveryDryRunTransport } = await import(
      "../invoice-delivery/billing-delivery-transport-mode"
    );
    expect(shouldUseBillingDeliveryDryRunTransport()).toBe(true);
  });

  it("allows simulated failure only in dry-run mode", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    const { isBillingDeliveryAcceptanceSimulateFailureAllowed } = await import(
      "../invoice-delivery/billing-delivery-transport-mode"
    );
    expect(isBillingDeliveryAcceptanceSimulateFailureAllowed()).toBe(true);
  });
});
