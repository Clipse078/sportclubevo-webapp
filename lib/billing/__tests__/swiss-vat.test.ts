import { describe, expect, it } from "vitest";
import {
  calculateLineAmounts,
  calculateVatFromNetMinor,
  sumInvoiceTotals,
  SWISS_VAT_STANDARD_RATE_BPS,
} from "../swiss-vat";

describe("Swiss VAT (SCE-BILLING-SWISS-01C)", () => {
  it("computes CHF 199.00 @ 8.1% as CHF 16.12 VAT and CHF 215.12 gross", () => {
    const netMinor = 19900;
    const vatMinor = calculateVatFromNetMinor(netMinor, SWISS_VAT_STANDARD_RATE_BPS);
    expect(vatMinor).toBe(1612);
    expect(netMinor + vatMinor).toBe(21512);

    const line = calculateLineAmounts(1, 19900, SWISS_VAT_STANDARD_RATE_BPS);
    expect(line.lineNetMinor).toBe(19900);
    expect(line.vatMinor).toBe(1612);
    expect(line.lineGrossMinor).toBe(21512);
  });

  it("rounds edge cases deterministically", () => {
    expect(calculateVatFromNetMinor(100, SWISS_VAT_STANDARD_RATE_BPS)).toBe(8);
    expect(calculateVatFromNetMinor(1, SWISS_VAT_STANDARD_RATE_BPS)).toBe(0);
  });

  it("sums multiple lines", () => {
    const a = calculateLineAmounts(1, 19900, SWISS_VAT_STANDARD_RATE_BPS);
    const b = calculateLineAmounts(2, 5000, SWISS_VAT_STANDARD_RATE_BPS);
    const totals = sumInvoiceTotals([a, b]);
    expect(totals.netTotalMinor).toBe(29900);
    expect(totals.vatTotalMinor).toBe(a.vatMinor + b.vatMinor);
    expect(totals.grossTotalMinor).toBe(totals.netTotalMinor + totals.vatTotalMinor);
  });
});
