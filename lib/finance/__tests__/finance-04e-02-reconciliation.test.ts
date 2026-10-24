import { describe, expect, it } from "vitest";
import { classifyExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import { reconcileExpectedFinancialTiming } from "@/lib/finance/forecast/reconcile-expected-financial-timing";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";

const cutoff = "2026-06-30";

function reconcile(
  annual: number | null,
  actual: number,
  events: ExpectedFinancialEventForReconciliation[],
) {
  return reconcileExpectedFinancialTiming({
    annualForecastAmountMinor: annual,
    actualThroughCutoffMinor: actual,
    actualsThroughDateIso: cutoff,
    expectedEvents: events,
  });
}

describe("FIN-04E-02 temporal classification", () => {
  it("classifies EXACT_DATE relative to cutoff without timezone day shift", () => {
    expect(
      classifyExpectedEventTemporalPosition(cutoff, {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 1,
        expectedDateIso: "2026-07-01",
      }),
    ).toBe("FUTURE_TIMED");
    expect(
      classifyExpectedEventTemporalPosition(cutoff, {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 1,
        expectedDateIso: "2026-06-30",
      }),
    ).toBe("NOT_FUTURE");
  });

  it("classifies MONTH without inventing a day within the month", () => {
    expect(
      classifyExpectedEventTemporalPosition(cutoff, {
        timingPrecision: "MONTH",
        expectedAmountMinor: 1,
        expectedMonthStartIso: "2026-07-01",
      }),
    ).toBe("FUTURE_TIMED");
    expect(
      classifyExpectedEventTemporalPosition(cutoff, {
        timingPrecision: "MONTH",
        expectedAmountMinor: 1,
        expectedMonthStartIso: "2026-06-01",
      }),
    ).toBe("AMBIGUOUS_AT_CUTOFF");
  });

  it("classifies DATE_RANGE overlap as ambiguous at cutoff", () => {
    expect(
      classifyExpectedEventTemporalPosition(cutoff, {
        timingPrecision: "DATE_RANGE",
        expectedAmountMinor: 1,
        rangeStartDateIso: "2026-06-01",
        rangeEndDateIso: "2026-07-15",
      }),
    ).toBe("AMBIGUOUS_AT_CUTOFF");
    expect(
      classifyExpectedEventTemporalPosition(cutoff, {
        timingPrecision: "DATE_RANGE",
        expectedAmountMinor: 1,
        rangeStartDateIso: "2026-07-01",
        rangeEndDateIso: "2026-07-31",
      }),
    ).toBe("FUTURE_TIMED");
  });
});

describe("FIN-04E-02 reconciliation — INCOME account magnitude semantics", () => {
  it("is balanced when timed future matches remaining expectation", () => {
    const result = reconcile(100_000, 30_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 70_000,
        expectedDateIso: "2026-09-01",
      },
    ]);
    expect(result.remainingFutureExpectationMinor).toBe(70_000);
    expect(result.timedFutureExpectationMinor).toBe(70_000);
    expect(result.unscheduledRemainderMinor).toBe(0);
    expect(result.state).toBe("BALANCED");
  });

  it("surfaces unscheduled remainder without synthetic events", () => {
    const result = reconcile(100_000, 30_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 40_000,
        expectedDateIso: "2026-08-01",
      },
    ]);
    expect(result.state).toBe("UNSCHEDULED_REMAINDER");
    expect(result.unscheduledRemainderMinor).toBe(30_000);
  });

  it("surfaces over-allocation without mutating forecast", () => {
    const result = reconcile(100_000, 30_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 80_000,
        expectedDateIso: "2026-08-01",
      },
    ]);
    expect(result.state).toBe("OVERALLOCATED");
    expect(result.overallocatedAmountMinor).toBe(10_000);
    expect(result.annualForecastAmountMinor).toBe(100_000);
  });
});

describe("FIN-04E-02 reconciliation — EXPENSE account (same magnitude convention)", () => {
  it("mirrors balanced / unscheduled / overallocated states for expense amounts", () => {
    expect(reconcile(50_000, 10_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 40_000,
        expectedDateIso: "2026-10-01",
      },
    ]).state).toBe("BALANCED");

    expect(reconcile(50_000, 10_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 20_000,
        expectedDateIso: "2026-10-01",
      },
    ]).state).toBe("UNSCHEDULED_REMAINDER");

    expect(reconcile(50_000, 10_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 45_000,
        expectedDateIso: "2026-10-01",
      },
    ]).state).toBe("OVERALLOCATED");
  });
});

describe("FIN-04E-02 reconciliation edge cases", () => {
  it("distinguishes absent forecast line from zero forecast", () => {
    const absent = reconcile(null, 0, []);
    expect(absent.state).toBe("FORECAST_LINE_ABSENT");
    expect(absent.remainingFutureExpectationMinor).toBeNull();

    const zeroForecast = reconcile(0, 0, []);
    expect(zeroForecast.remainingFutureExpectationMinor).toBe(0);
    expect(zeroForecast.state).toBe("BALANCED");
  });

  it("handles actual exceeding annual forecast without negative remainder", () => {
    const result = reconcile(80_000, 95_000, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 5_000,
        expectedDateIso: "2026-12-01",
      },
    ]);
    expect(result.remainingFutureExpectationMinor).toBe(0);
    expect(result.actualExceedsAnnualForecastAmountMinor).toBe(15_000);
    expect(result.state).toBe("OVERALLOCATED");
  });

  it("aggregates multiple events and is order-independent", () => {
    const a = reconcile(100_000, 0, [
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 30_000,
        expectedDateIso: "2026-08-01",
      },
      {
        timingPrecision: "MONTH",
        expectedAmountMinor: 20_000,
        expectedMonthStartIso: "2026-09-01",
      },
    ]);
    const b = reconcile(100_000, 0, [
      {
        timingPrecision: "MONTH",
        expectedAmountMinor: 20_000,
        expectedMonthStartIso: "2026-09-01",
      },
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 30_000,
        expectedDateIso: "2026-08-01",
      },
    ]);
    expect(a.timedFutureExpectationMinor).toBe(50_000);
    expect(b.timedFutureExpectationMinor).toBe(50_000);
  });

  it("exposes ambiguous timing separately from timed and unscheduled remainder", () => {
    const result = reconcile(100_000, 40_000, [
      {
        timingPrecision: "MONTH",
        expectedAmountMinor: 25_000,
        expectedMonthStartIso: "2026-06-01",
      },
      {
        timingPrecision: "EXACT_DATE",
        expectedAmountMinor: 20_000,
        expectedDateIso: "2026-08-01",
      },
    ]);
    expect(result.ambiguousTimingExpectationMinor).toBe(25_000);
    expect(result.timedFutureExpectationMinor).toBe(20_000);
    expect(result.unscheduledRemainderMinor).toBe(15_000);
    expect(result.state).toBe("UNSCHEDULED_REMAINDER");
  });

  it("uses integer minor units only — no /12 proration path", () => {
    const result = reconcile(120_000, 0, []);
    expect(result.unscheduledRemainderMinor).toBe(120_000);
    expect(Number.isInteger(result.unscheduledRemainderMinor)).toBe(true);
  });
});
