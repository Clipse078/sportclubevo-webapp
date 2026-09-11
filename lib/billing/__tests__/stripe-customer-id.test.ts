import { describe, it, expect } from "vitest";
import {
  assertValidStripeCustomerId,
  isValidStripeCustomerId,
  BillingValidationError,
} from "../stripe-customer-id";

describe("stripe customer id validation", () => {
  it("accepts a well-formed cus_ id", () => {
    expect(isValidStripeCustomerId("cus_abc123XYZ")).toBe(true);
    expect(assertValidStripeCustomerId("  cus_test123  ")).toBe("cus_test123");
  });

  it("rejects malformed ids", () => {
    expect(isValidStripeCustomerId("")).toBe(false);
    expect(isValidStripeCustomerId("cus_")).toBe(false);
    expect(isValidStripeCustomerId("sub_123")).toBe(false);
    expect(isValidStripeCustomerId("customer_123")).toBe(false);
    expect(() => assertValidStripeCustomerId("bad")).toThrow(BillingValidationError);
  });
});
