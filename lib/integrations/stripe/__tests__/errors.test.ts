import { describe, expect, it } from "vitest";
import {
  mapStripeSdkError,
  StripeIntegrationError,
  toSafePublicStripeError,
} from "../errors";

describe("mapStripeSdkError", () => {
  it("maps authentication failures safely", () => {
    const mapped = mapStripeSdkError({
      type: "StripeAuthenticationError",
      statusCode: 401,
      message: "Invalid API Key provided: sk_test_redacted",
    });
    expect(mapped.code).toBe("STRIPE_AUTHENTICATION_FAILED");
    expect(mapped.message).not.toContain("sk_test_");
  });

  it("maps rate limits", () => {
    const mapped = mapStripeSdkError({
      type: "StripeRateLimitError",
      statusCode: 429,
      message: "Rate limit",
    });
    expect(mapped.code).toBe("STRIPE_RATE_LIMITED");
  });
});

describe("toSafePublicStripeError", () => {
  it("preserves integration error codes", () => {
    const safe = toSafePublicStripeError(
      new StripeIntegrationError("NO_BILLING_ACCOUNT", "No billing account."),
    );
    expect(safe.code).toBe("NO_BILLING_ACCOUNT");
  });
});
