import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveFinanceTimingMovementComposition,
  formatFinanceDirectionalMovementMinor,
  formatFinanceNetMovementMinor,
} from "@/lib/finance/presentation/finance-directional-movement-presentation";
import { FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS } from "@/lib/finance/forecast/finance-forecast-timing-direction-07r3-architecture-contract";
import {
  buildFinanceMonthPickerMonthOptions,
  financeMonthPickerIsoFromValue,
  formatFinanceMonthPickerDisplayValue,
} from "@/lib/finance/forecast/finance-expected-month-picker";
import { buildFinanceForecastTimingMovementChartModel } from "@/lib/finance/forecast/build-forecast-timing-movement-chart-model";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import {
  financeForecastTimingCompactEmptyShowsGlobalCreateCta,
  financeForecastTimingUsesCompactEmptyTimeline,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";

const timingPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingWorkspacePanel.tsx"),
  "utf8",
);
const timeline = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingMovementTimeline.tsx"),
  "utf8",
);
const eventDialog = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceExpectedFinancialEventDialog.tsx"),
  "utf8",
);

describe("FIN-04E-07R3 architecture locks", () => {
  it("exports directional presentation boundaries", () => {
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.SIGNED_AMOUNT_IS_PRESENTATION,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.GROSS_TIMING_COVERAGE_IS_NOT_NET_MOVEMENT,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.NET_MOVEMENT_IS_NOT_LIQUIDITY,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.NET_MOVEMENT_IS_NOT_PNL,
    ).toBe(true);
    expect(FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.INTEGER_MINOR_UNITS).toBe(
      true,
    );
  });
});

describe("FIN-04E-07R3 directional formatter", () => {
  it("prefixes income with + and expense with −", () => {
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 60_000_00,
        direction: "INCOME",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toMatch(/^\+60[\u2019']000/);
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 3_000_00,
        direction: "EXPENSE",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toMatch(/^−3[\u2019']000/);
  });

  it("respects tenant currency and locale", () => {
    const formatted = formatFinanceDirectionalMovementMinor({
      amountMinor: 1_000_00,
      direction: "INCOME",
      currency: "EUR",
      formattingLocale: "de-DE",
    });
    expect(formatted).toContain("EUR");
    expect(formatted.startsWith("+")).toBe(true);
  });

  it("defines zero as unsigned magnitude", () => {
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 0,
        direction: "EXPENSE",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toMatch(/^0/);
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 0,
        direction: "EXPENSE",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).not.toMatch(/^[+−]/);
  });

  it("rejects non-integer and negative magnitudes", () => {
    expect(() =>
      formatFinanceDirectionalMovementMinor({
        amountMinor: 1.5,
        direction: "INCOME",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toThrow(/INTEGER_MINOR/);
    expect(() =>
      formatFinanceDirectionalMovementMinor({
        amountMinor: -100,
        direction: "INCOME",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toThrow(/NON_NEGATIVE/);
  });
});

describe("FIN-04E-07R3 summary composition", () => {
  it("keeps gross timed magnitude and derives net without conflating coverage", () => {
    const composition = deriveFinanceTimingMovementComposition({
      incomeMagnitudeMinor: 105_000_00,
      expenseMagnitudeMinor: 3_000_00,
    });
    expect(composition.grossMinor).toBe(108_000_00);
    expect(composition.netMovementMinor).toBe(102_000_00);
    expect(formatFinanceNetMovementMinor({
      netMovementMinor: composition.netMovementMinor,
      currency: "CHF",
      formattingLocale: "de-CH",
    })).toMatch(/^\+102/);
  });

  it("derives untimed net composition for UAT example magnitudes", () => {
    const composition = deriveFinanceTimingMovementComposition({
      incomeMagnitudeMinor: 53_794_00,
      expenseMagnitudeMinor: 2_037_00,
    });
    expect(composition.grossMinor).toBe(55_831_00);
    expect(composition.netMovementMinor).toBe(51_757_00);
  });
});

describe("FIN-04E-07R3 workspace wiring", () => {
  it("uses canonical directional formatter in panel and timeline", () => {
    expect(timingPanel).toContain("formatFinanceDirectionalMovementMinor");
    expect(timeline).toContain("formatFinanceDirectionalMovementMinor");
    expect(timingPanel).toContain("data-finance-timing-composition-net");
    expect(timeline).toContain("data-finance-movement-zero-baseline");
  });

  it("shows signed amounts in upcoming and events table", () => {
    expect(timingPanel).toContain("formatMovementAmount");
    expect(timingPanel).toContain("data-finance-timing-upcoming-row");
  });

  it("removes redundant unscheduled issue copy for partial rows", () => {
    expect(timingPanel).toContain('rowDensity === "PARTIAL_TIMED"');
    expect(timingPanel).toContain('issue === "unscheduled"');
  });
});

describe("FIN-04E-07R3 timeline materiality", () => {
  it("encodes materiality via shared signed Y axis rather than bubble radius", () => {
    expect(timeline).not.toContain("timelineMarkerRadius");
    const visual = buildFinanceForecastTimingVisualModel({
      overview: {
        financeYearId: "fy1",
        actualsThroughDateIso: "2026-06-30",
        referenceDateIso: "2026-06-30",
        currentForecast: {
          kind: "AVAILABLE",
          forecastId: "f1",
          forecastVersionId: "v1",
          versionNumber: 1,
          asOfDateIso: "2026-06-30",
          actualsThroughDateIso: "2026-06-30",
        },
        annual: {
          income: {
            annualForecastMinor: 100_000_00,
            actualThroughCutoffMinor: 0,
            remainingFutureExpectationMinor: 100_000_00,
            timedFutureExpectationMinor: 90_000_00,
            ambiguousTimingExpectationMinor: 0,
            unscheduledRemainderMinor: 10_000_00,
            overallocatedAmountMinor: 0,
            actualExceedsAnnualForecastAmountMinor: 0,
            futureTimedMovementMinor: 90_000_00,
          },
          expense: {
            annualForecastMinor: 0,
            actualThroughCutoffMinor: 0,
            remainingFutureExpectationMinor: 0,
            timedFutureExpectationMinor: 0,
            ambiguousTimingExpectationMinor: 0,
            unscheduledRemainderMinor: 0,
            overallocatedAmountMinor: 0,
            actualExceedsAnnualForecastAmountMinor: 0,
            futureTimedMovementMinor: 0,
          },
          resultMinor: 100_000_00,
          futureResultContextMinor: 100_000_00,
        },
        timingCoverage: {
          kind: "RATIO",
          remainingFutureExpectationMinor: 100_000_00,
          timedFutureExpectationMinor: 90_000_00,
          timedCoverageBasisPoints: 9000,
          rawTimedCoverageBasisPoints: 9000,
          isOverallocated: false,
        },
        interpretationState: "PARTIALLY_SCHEDULED",
        exceptions: [],
        counts: {
          totalExpectedEventCount: 2,
          futureTimedEventCount: 2,
          ambiguousEventCount: 0,
          accountsWithUnscheduledRemainderCount: 1,
          overallocatedAccountCount: 0,
          accountCount: 1,
        },
        accounts: [],
        upcomingEvents: [],
      },
      events: [
        {
          id: "large",
          tenantId: "t1",
          financeYearId: "fy1",
          financialAccountId: "acc-income",
          expectedAmountMinor: 60_000_00,
          timingPrecision: "EXACT_DATE",
          expectedDateIso: "2026-11-15",
          expectedMonthStartIso: null,
          rangeStartDateIso: null,
          rangeEndDateIso: null,
          sourceKind: "MANUAL",
          sourceRefType: null,
          sourceRefId: null,
          description: null,
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "small",
          tenantId: "t1",
          financeYearId: "fy1",
          financialAccountId: "acc-income",
          expectedAmountMinor: 30_000_00,
          timingPrecision: "EXACT_DATE",
          expectedDateIso: "2026-12-01",
          expectedMonthStartIso: null,
          rangeStartDateIso: null,
          rangeEndDateIso: null,
          sourceKind: "MANUAL",
          sourceRefType: null,
          sourceRefId: null,
          description: null,
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      accountNameById: new Map([["acc-income", "Income"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    const chart = buildFinanceForecastTimingMovementChartModel(visual);
    const large = chart.movements.find((m) => m.eventId === "large")!;
    const small = chart.movements.find((m) => m.eventId === "small")!;
    expect(Math.abs(large.yValue - chart.domain.zeroY)).toBeGreaterThan(
      Math.abs(small.yValue - chart.domain.zeroY),
    );
  });
});

describe("FIN-04E-07R3 month picker", () => {
  it("outputs YYYY-MM-01 and locale month labels without day precision", () => {
    expect(financeMonthPickerIsoFromValue("2027-01")).toBe("2027-01-01");
    const options = buildFinanceMonthPickerMonthOptions({
      year: 2027,
      formattingLocale: "de-CH",
    });
    expect(options).toHaveLength(12);
    expect(options[0]?.value).toBe("2027-01");
    expect(formatFinanceMonthPickerDisplayValue({
      monthValue: "2027-03",
      formattingLocale: "de-CH",
    })).toMatch(/2027/);
  });

  it("replaces native month input in event dialog", () => {
    expect(eventDialog).toContain("FinanceExpectedMonthPicker");
    expect(eventDialog).not.toContain('type="month"');
  });
});

describe("FIN-04E-07R3 zero state regression", () => {
  it("preserves ZERO_TIMING compact guards", () => {
    expect(financeForecastTimingUsesCompactEmptyTimeline("ZERO_TIMING")).toBe(true);
    expect(financeForecastTimingCompactEmptyShowsGlobalCreateCta("ZERO_TIMING")).toBe(false);
    expect(timingPanel).toContain("financeForecastTimingSummaryShowsGlobalCreateCta");
  });
});
