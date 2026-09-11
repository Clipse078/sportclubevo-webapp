import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStripeClient, resetStripeClientForTests, STRIPE_API_VERSION } from "../client";
import { StripeConfigurationError } from "../errors";

const TEST_KEY = "sk_test_" + "01234567890123456789012345678901";

beforeEach(() => {
  resetStripeClientForTests();
  process.env.APP_ENV = "local";
  process.env.NODE_ENV = "test";
  process.env.STRIPE_SECRET_KEY = TEST_KEY;
});

afterEach(() => {
  resetStripeClientForTests();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.APP_ENV;
});

describe("getStripeClient", () => {
  it("initializes a server-side Stripe client with pinned API version", () => {
    const client = getStripeClient();
    expect(client).toBeDefined();
    expect(STRIPE_API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(getStripeClient()).toBe(client);
  });

  it("fails closed when configuration is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripeClient()).toThrow(StripeConfigurationError);
  });
});
