import { describe, expect, it } from "vitest";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";
import {
  assertNoHeaderInjection,
  normalizeRecipientInput,
  validateBillingCommunicationRecipients,
} from "../billing-communication-recipients";

describe("billing-communication-recipients", () => {
  it("requires at least one to recipient", () => {
    expect(() => validateBillingCommunicationRecipients({ to: [], cc: [] })).toThrow(
      NativeBillingValidationError,
    );
  });

  it("deduplicates and normalizes addresses", () => {
    const result = validateBillingCommunicationRecipients({
      to: ["Finanzen <a@test.com>", "a@test.com", "b@test.com"],
      cc: ["c@test.com", "c@test.com"],
    });
    expect(result.to).toEqual(["a@test.com", "b@test.com"]);
    expect(result.cc).toEqual(["c@test.com"]);
  });

  it("rejects header injection in subject fields", () => {
    expect(assertNoHeaderInjection("ok", "Betreff")).toBe("ok");
    expect(() => assertNoHeaderInjection("bad\nbcc", "Betreff")).toThrow(
      NativeBillingValidationError,
    );
  });

  it("rejects newline injection in recipient input", () => {
    expect(() => normalizeRecipientInput(["evil@test.com\nBcc: x@test.com"])).toThrow(
      NativeBillingValidationError,
    );
  });
});
