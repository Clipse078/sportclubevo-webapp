import { describe, expect, it } from "vitest";
import {
  assertValidFinanceYearRange,
  financeYearOverlaps,
  resolveFinanceOverviewState,
} from "@/lib/finance/setup/finance-setup-state";

describe("FIN-01B setup state", () => {
  it("resolves not configured when no configuration exists", () => {
    expect(
      resolveFinanceOverviewState({
        configuration: null,
        financeYearCount: 0,
        enabledCapabilityCount: 0,
      }),
    ).toBe("NOT_CONFIGURED");
  });

  it("requires start before end for finance years", () => {
    expect(() =>
      assertValidFinanceYearRange(new Date("2026-12-31"), new Date("2026-01-01")),
    ).toThrow("FINANCE_INVALID_YEAR");
  });

  it("detects overlapping finance year ranges", () => {
    expect(
      financeYearOverlaps(
        { startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
        { startDate: new Date("2026-06-01"), endDate: new Date("2027-05-31") },
      ),
    ).toBe(true);
  });

  it("reports configured without data when setup complete", () => {
    expect(
      resolveFinanceOverviewState({
        configuration: {
          setupStatus: "CONFIGURED",
          baseCurrency: "EUR",
        } as never,
        financeYearCount: 1,
        enabledCapabilityCount: 0,
      }),
    ).toBe("CONFIGURED_NO_DATA");
  });
});
