import { describe, expect, it } from "vitest";
import { formatInvoiceNumber } from "../invoice-numbering";

describe("invoice numbering", () => {
  it("formats year and padded sequence", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("2026-000001");
    expect(formatInvoiceNumber(2026, 42)).toBe("2026-000042");
  });
});
