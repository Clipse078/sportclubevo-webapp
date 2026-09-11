import { describe, expect, it } from "vitest";
import { generateQrrReference, buildQrrPayload26, SwissQrrError } from "../swiss-qrr";

const baseIdentity = {
  invoiceId: "inv-cuid-abc123",
  legalEntityId: "le-cuid-xyz",
  invoiceNumber: "2026-000042",
};

describe("swiss QRR generator", () => {
  it("produces numeric 27-digit reference", () => {
    const qrr = generateQrrReference(baseIdentity);
    expect(qrr).toMatch(/^\d{27}$/);
  });

  it("is deterministic for the same invoice", () => {
    expect(generateQrrReference(baseIdentity)).toBe(generateQrrReference(baseIdentity));
  });

  it("differs for different invoices", () => {
    const other = generateQrrReference({
      ...baseIdentity,
      invoiceId: "inv-other",
      invoiceNumber: "2026-000043",
    });
    expect(other).not.toBe(generateQrrReference(baseIdentity));
  });

  it("supports optional numeric prefix", () => {
    const withPrefix = generateQrrReference(baseIdentity, "210000");
    const without = generateQrrReference(baseIdentity);
    expect(withPrefix).not.toBe(without);
    expect(withPrefix.startsWith("210000")).toBe(true);
  });

  it("rejects prefix overflow", () => {
    expect(() => generateQrrReference(baseIdentity, "1".repeat(26))).toThrow(SwissQrrError);
  });

  it("rejects malformed prefix", () => {
    expect(() => buildQrrPayload26(baseIdentity, "12A")).toThrow(SwissQrrError);
  });

  it("rejects invalid invoice identity", () => {
    expect(() =>
      generateQrrReference({ ...baseIdentity, invoiceNumber: "bad-number" }),
    ).toThrow(SwissQrrError);
  });
});
