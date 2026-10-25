import { describe, expect, it } from "vitest";
import {
  expectedMonthStartIsoFromMonthInput,
  formatExpectedFinancialEventTimingLabel,
  financeForecastTimingAccountNeedsAttention,
} from "@/lib/finance/forecast/expected-financial-event-timing-presentation";

describe("FIN-04E-05 timing presentation", () => {
  it("shows exact date for EXACT_DATE", () => {
    const label = formatExpectedFinancialEventTimingLabel(
      {
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2027-06-30",
        expectedMonthStartIso: null,
        rangeStartDateIso: null,
        rangeEndDateIso: null,
      },
      "de-CH",
    );
    expect(label).toContain("2027");
    expect(label).toContain("30");
    expect(label).not.toBe("01.06.2027");
  });

  it("shows month/year for MONTH without day 01 leakage", () => {
    const label = formatExpectedFinancialEventTimingLabel(
      {
        timingPrecision: "MONTH",
        expectedDateIso: null,
        expectedMonthStartIso: "2027-06-01",
        rangeStartDateIso: null,
        rangeEndDateIso: null,
      },
      "de-CH",
    );
    expect(label.toLowerCase()).toContain("juni");
    expect(label).toContain("2027");
    expect(label).not.toMatch(/\.01\./);
  });

  it("shows range for DATE_RANGE", () => {
    const label = formatExpectedFinancialEventTimingLabel(
      {
        timingPrecision: "DATE_RANGE",
        expectedDateIso: null,
        expectedMonthStartIso: null,
        rangeStartDateIso: "2027-06-15",
        rangeEndDateIso: "2027-06-30",
      },
      "de-CH",
    );
    expect(label).toContain("–");
    expect(label).toContain("15");
    expect(label).toContain("30");
  });

  it("maps month input to canonical month start iso", () => {
    expect(expectedMonthStartIsoFromMonthInput("2027-06")).toBe("2027-06-01");
  });

  it("flags attention accounts for unscheduled and overallocated", () => {
    expect(
      financeForecastTimingAccountNeedsAttention({
        reconciliation: {
          state: "UNSCHEDULED_REMAINDER",
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 100,
          overallocatedAmountMinor: null,
          actualExceedsAnnualForecastAmountMinor: null,
        },
        expectedEventCount: 0,
      }),
    ).toBe(true);
    expect(
      financeForecastTimingAccountNeedsAttention({
        reconciliation: {
          state: "BALANCED",
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 0,
          overallocatedAmountMinor: null,
          actualExceedsAnnualForecastAmountMinor: null,
        },
        expectedEventCount: 1,
      }),
    ).toBe(false);
  });
});
