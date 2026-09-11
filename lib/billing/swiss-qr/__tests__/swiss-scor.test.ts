import { describe, expect, it } from "vitest";
import { generateScorReference, validateScorReference, SwissScorError } from "../swiss-scor";

describe("swiss SCOR (ISO 11649)", () => {
  it("generates valid RF reference from invoice identity", () => {
    const reference = generateScorReference({
      invoiceId: "inv-test-001",
      invoiceNumber: "2026-000100",
      legalEntityId: "le-test",
    });
    expect(validateScorReference(reference)).toBe(reference);
    expect(reference.startsWith("RF")).toBe(true);
  });

  it("rejects invalid SCOR references", () => {
    expect(() => validateScorReference("RF00INVALID")).toThrow(SwissScorError);
  });
});
