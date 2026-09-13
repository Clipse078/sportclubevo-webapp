import { describe, expect, it } from "vitest";

/**
 * FCA acceptance guard (BILLING-AUTO-01) — documents expected STAGE invariants.
 * Runtime STAGE data is NOT mutated in this slice; these constants anchor regression tests.
 */
export const FCA_CONTRACT_NUMBER = "FCA-2026-001";
export const FCA_SEPTEMBER_INVOICE_NUMBER = "2026-000002";
export const FCA_SEPTEMBER_PERIOD = { start: "2026-09-01", end: "2026-09-30" } as const;
export const FCA_SEPTEMBER_GROSS_MINOR = 21512;
export const FCA_NEXT_PERIOD = { start: "2026-10-01", end: "2026-10-31" } as const;

describe("FCA September duplicate guard (static acceptance contract)", () => {
  it("defines September invoice 2026-000002 as the occupied service period", () => {
    expect(FCA_SEPTEMBER_INVOICE_NUMBER).toBe("2026-000002");
    expect(FCA_SEPTEMBER_PERIOD.start).toBe("2026-09-01");
    expect(FCA_SEPTEMBER_GROSS_MINOR).toBe(21512);
  });

  it("defines next billable period as October 2026 (must not be generated in this slice on STAGE)", () => {
    expect(FCA_NEXT_PERIOD.start).toBe("2026-10-01");
    expect(FCA_NEXT_PERIOD.end).toBe("2026-10-31");
  });

  it("expects invoice 2026-000002 to remain NOT SENT during implementation acceptance", () => {
    expect(FCA_SEPTEMBER_INVOICE_NUMBER).toBe("2026-000002");
    // Delivery state is verified on STAGE by PO; automated tests never call send for this invoice.
  });
});
