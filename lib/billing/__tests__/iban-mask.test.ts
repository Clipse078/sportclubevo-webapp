import { describe, expect, it } from "vitest";
import { maskIban, redactIbanInText } from "../iban-mask";

describe("iban-mask", () => {
  it("masks IBAN keeping last four characters", () => {
    expect(maskIban("CH93 0076 2011 6238 5295 7")).toBe("****2957");
  });

  it("never returns full IBAN in redacted log text", () => {
    const raw = "Configured CH9300762011623852957 for payout";
    const redacted = redactIbanInText(raw);
    expect(redacted).not.toContain("CH9300762011623852957");
    expect(redacted).toContain("****");
  });
});
