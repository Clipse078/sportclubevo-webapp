import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import {
  buildFinanceForecastTimingMovementChartModel,
  computeFinanceForecastMovementChartYTicks,
} from "@/lib/finance/forecast/build-forecast-timing-movement-chart-model";
import { FINANCE_FORECAST_TIMING_MOVEMENT_CHART_04E_07R4_ARCHITECTURE_LOCKS } from "@/lib/finance/forecast/finance-forecast-timing-movement-chart-07r4-architecture-contract";
import { buildFinanceForecastMovementAccessibleTimingPhrase } from "@/lib/finance/forecast/finance-forecast-movement-chart-accessible-label";
import {
  financeForecastTimingShowsUntimedCompanion,
  financeForecastTimingUsesCompactEmptyTimeline,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { FinanceForecastTimingOverviewReadModel } from "@/lib/finance/forecast/finance-forecast-timing-read-model";

const timeline = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingMovementTimeline.tsx"),
  "utf8",
);

function baseOverview(
  partial: Partial<FinanceForecastTimingOverviewReadModel> = {},
): FinanceForecastTimingOverviewReadModel {
  return {
    financeYearId: "fy1",
    actualsThroughDateIso: "2026-10-01",
    referenceDateIso: "2026-10-01",
    currentForecast: {
      kind: "AVAILABLE",
      forecastId: "f1",
      forecastVersionId: "v1",
      versionNumber: 1,
      asOfDateIso: "2026-10-01",
      actualsThroughDateIso: "2026-10-01",
    },
    annual: {
      income: {
        annualForecastMinor: 200_000_00,
        actualThroughCutoffMinor: 50_000_00,
        remainingFutureExpectationMinor: 150_000_00,
        timedFutureExpectationMinor: 105_000_00,
        ambiguousTimingExpectationMinor: 0,
        unscheduledRemainderMinor: 53_794_00,
        overallocatedAmountMinor: 0,
        actualExceedsAnnualForecastAmountMinor: 0,
        futureTimedMovementMinor: 105_000_00,
      },
      expense: {
        annualForecastMinor: 10_000_00,
        actualThroughCutoffMinor: 2_000_00,
        remainingFutureExpectationMinor: 8_000_00,
        timedFutureExpectationMinor: 3_000_00,
        ambiguousTimingExpectationMinor: 0,
        unscheduledRemainderMinor: 2_037_00,
        overallocatedAmountMinor: 0,
        actualExceedsAnnualForecastAmountMinor: 0,
        futureTimedMovementMinor: 3_000_00,
      },
      resultMinor: 190_000_00,
      futureResultContextMinor: 142_000_00,
    },
    timingCoverage: {
      kind: "RATIO",
      remainingFutureExpectationMinor: 158_000_00,
      timedFutureExpectationMinor: 108_000_00,
      timedCoverageBasisPoints: 6835,
      rawTimedCoverageBasisPoints: 6835,
      isOverallocated: false,
    },
    interpretationState: "PARTIALLY_SCHEDULED",
    exceptions: [],
    counts: {
      totalExpectedEventCount: 4,
      futureTimedEventCount: 4,
      ambiguousEventCount: 0,
      accountsWithUnscheduledRemainderCount: 2,
      overallocatedAccountCount: 0,
      accountCount: 4,
    },
    accounts: [
      {
        financialAccountId: "acc-mb",
        name: "Mitgliedsbeiträge",
        accountType: "INCOME",
        lifecycle: "ACTIVE",
        rank: 1,
        reconciliation: {
          annualForecastAmountMinor: 120_000_00,
          forecastLinePresent: true,
          actualThroughCutoffMinor: 30_000_00,
          remainingFutureExpectationMinor: 90_000_00,
          timedFutureExpectationMinor: 90_000_00,
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 0,
          overallocatedAmountMinor: 0,
          actualExceedsAnnualForecastAmountMinor: 0,
          state: "FULLY_SCHEDULED",
        },
        expectedEventCount: 2,
        futureTimedEventCount: 2,
        ambiguousEventCount: 0,
        nextExpectedEventId: "ev1",
      },
      {
        financialAccountId: "acc-weitere",
        name: "Weitere Einnahmen",
        accountType: "INCOME",
        lifecycle: "ACTIVE",
        rank: 2,
        reconciliation: {
          annualForecastAmountMinor: 20_000_00,
          forecastLinePresent: true,
          actualThroughCutoffMinor: 0,
          remainingFutureExpectationMinor: 20_000_00,
          timedFutureExpectationMinor: 15_000_00,
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 5_000_00,
          overallocatedAmountMinor: 0,
          actualExceedsAnnualForecastAmountMinor: 0,
          state: "PARTIALLY_SCHEDULED",
        },
        expectedEventCount: 1,
        futureTimedEventCount: 1,
        ambiguousEventCount: 0,
        nextExpectedEventId: "ev4",
      },
      {
        financialAccountId: "acc-betrieb",
        name: "Betrieb",
        accountType: "EXPENSE",
        lifecycle: "ACTIVE",
        rank: 3,
        reconciliation: {
          annualForecastAmountMinor: 5_000_00,
          forecastLinePresent: true,
          actualThroughCutoffMinor: 1_000_00,
          remainingFutureExpectationMinor: 4_000_00,
          timedFutureExpectationMinor: 3_000_00,
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 1_000_00,
          overallocatedAmountMinor: 0,
          actualExceedsAnnualForecastAmountMinor: 0,
          state: "PARTIALLY_SCHEDULED",
        },
        expectedEventCount: 1,
        futureTimedEventCount: 1,
        ambiguousEventCount: 0,
        nextExpectedEventId: "ev2",
      },
    ],
    upcomingEvents: [],
    ...partial,
  };
}

function event(partial: Partial<ExpectedFinancialEventRecord>): ExpectedFinancialEventRecord {
  return {
    id: partial.id ?? "ev1",
    tenantId: "t1",
    financeYearId: "fy1",
    financialAccountId: partial.financialAccountId ?? "acc-mb",
    expectedAmountMinor: partial.expectedAmountMinor ?? 10_000_00,
    timingPrecision: partial.timingPrecision ?? "EXACT_DATE",
    expectedDateIso: partial.expectedDateIso ?? "2026-11-15",
    expectedMonthStartIso: partial.expectedMonthStartIso ?? null,
    rangeStartDateIso: partial.rangeStartDateIso ?? null,
    rangeEndDateIso: partial.rangeEndDateIso ?? null,
    sourceKind: partial.sourceKind ?? "MANUAL",
    sourceRefType: null,
    sourceRefId: null,
    description: partial.description ?? null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function uatVisualModel() {
  const overview = baseOverview();
  const events = [
    event({ id: "ev1", expectedAmountMinor: 60_000_00, expectedDateIso: "2026-11-15" }),
    event({
      id: "ev2",
      financialAccountId: "acc-betrieb",
      expectedAmountMinor: 3_000_00,
      expectedDateIso: "2026-12-31",
      timingPrecision: "EXACT_DATE",
    }),
    event({
      id: "ev3",
      expectedAmountMinor: 30_000_00,
      timingPrecision: "MONTH",
      expectedDateIso: null,
      expectedMonthStartIso: "2027-01-01",
    }),
    event({
      id: "ev4",
      financialAccountId: "acc-weitere",
      expectedAmountMinor: 15_000_00,
      timingPrecision: "DATE_RANGE",
      expectedDateIso: null,
      rangeStartDateIso: "2027-03-01",
      rangeEndDateIso: "2027-03-31",
    }),
  ];
  return buildFinanceForecastTimingVisualModel({
    overview,
    events,
    accountNameById: new Map([
      ["acc-mb", "Mitgliedsbeiträge"],
      ["acc-betrieb", "Betrieb"],
      ["acc-weitere", "Weitere Einnahmen"],
    ]),
    financeYearStartDateIso: "2026-01-01",
    financeYearEndDateIso: "2026-12-31",
  });
}

describe("FIN-04E-07R4 architecture locks", () => {
  it("exports zero-baseline movement chart boundaries", () => {
    expect(
      FINANCE_FORECAST_TIMING_MOVEMENT_CHART_04E_07R4_ARCHITECTURE_LOCKS.ZERO_BASELINE_REPRESENTS_MOVEMENT_DIRECTION,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_MOVEMENT_CHART_04E_07R4_ARCHITECTURE_LOCKS.NO_BUBBLE_RADIUS_MATERIALITY,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_MOVEMENT_CHART_04E_07R4_ARCHITECTURE_LOCKS.UNSCHEDULED_HAS_NO_TIME_COORDINATE,
    ).toBe(true);
  });
});

describe("FIN-04E-07R4 signed Y positions and materiality", () => {
  it("places income above zero and expense below on a common scale", () => {
    const visual = uatVisualModel();
    const chart = buildFinanceForecastTimingMovementChartModel(visual);
    const income60 = chart.movements.find((m) => m.eventId === "ev1")!;
    const expense3 = chart.movements.find((m) => m.eventId === "ev2")!;
    expect(income60.yValue).toBeLessThan(chart.domain.zeroY);
    expect(expense3.yValue).toBeGreaterThan(chart.domain.zeroY);
    expect(Math.abs(income60.yValue - chart.domain.zeroY)).toBeGreaterThan(
      Math.abs(expense3.yValue - chart.domain.zeroY),
    );
  });

  it("preserves relative magnitudes on the shared axis", () => {
    const chart = buildFinanceForecastTimingMovementChartModel(uatVisualModel());
    const h60 = Math.abs(
      chart.movements.find((m) => m.eventId === "ev1")!.yValue - chart.domain.zeroY,
    );
    const h30 = Math.abs(
      chart.movements.find((m) => m.eventId === "ev3")!.yValue - chart.domain.zeroY,
    );
    const h15 = Math.abs(
      chart.movements.find((m) => m.eventId === "ev4")!.yValue - chart.domain.zeroY,
    );
    expect(h60).toBeGreaterThan(h30);
    expect(h30).toBeGreaterThan(h15);
  });

  it("includes zero in y tick domain", () => {
    const ticks = computeFinanceForecastMovementChartYTicks({
      minSignedAmountMinor: -5_000_00,
      maxSignedAmountMinor: 70_000_00,
    });
    expect(ticks).toContain(0);
  });
});

describe("FIN-04E-07R4 temporal X semantics", () => {
  it("orders movements chronologically on the axis", () => {
    const chart = buildFinanceForecastTimingMovementChartModel(uatVisualModel());
    const ordered = [...chart.movements].sort((a, b) => a.xStart - b.xStart);
    expect(ordered.map((m) => m.eventId)).toEqual(["ev1", "ev2", "ev3", "ev4"]);
  });

  it("uses month interval span, not day-one point", () => {
    const visual = uatVisualModel();
    const month = buildFinanceForecastTimingMovementChartModel(visual).movements.find(
      (m) => m.eventId === "ev3",
    )!;
    expect(month.xEndFraction - month.xStartFraction).toBeGreaterThan(0.02);
    expect(month.visualKind).toBe("MONTH");
    expect(month.startDateIso).toBe("2027-01-01");
    expect(month.endDateIso).toBe("2027-01-31");
  });

  it("spans date range without proration", () => {
    const movement = buildFinanceForecastTimingMovementChartModel(uatVisualModel()).movements.find(
      (m) => m.eventId === "ev4",
    )!;
    expect(movement.visualKind).toBe("DATE_RANGE");
    expect(movement.signedAmountMinor).toBe(15_000_00);
    expect(movement.xEndFraction).toBeGreaterThan(movement.xStartFraction);
  });

  it("positions finance year boundary within plot when visible", () => {
    const chart = buildFinanceForecastTimingMovementChartModel(uatVisualModel());
    expect(chart.financeYearBoundary).not.toBeNull();
    expect(chart.financeYearBoundary!.x).toBeGreaterThan(chart.domain.plotLeft);
    expect(chart.financeYearBoundary!.x).toBeLessThan(chart.domain.plotRight);
  });
});

describe("FIN-04E-07R4 presentation states", () => {
  it("keeps zero timing compact without chart markers", () => {
    const base = baseOverview();
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview({
        annual: {
          ...base.annual,
          income: {
            ...base.annual.income,
            timedFutureExpectationMinor: 0,
            unscheduledRemainderMinor: 80_000_00,
            remainingFutureExpectationMinor: 80_000_00,
          },
          expense: {
            ...base.annual.expense,
            timedFutureExpectationMinor: 0,
            unscheduledRemainderMinor: 0,
            remainingFutureExpectationMinor: 0,
          },
        },
        timingCoverage: {
          kind: "RATIO",
          remainingFutureExpectationMinor: 80_000_00,
          timedFutureExpectationMinor: 0,
          timedCoverageBasisPoints: 0,
          rawTimedCoverageBasisPoints: null,
          isOverallocated: false,
        },
      }),
      events: [],
      accountNameById: new Map(),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("ZERO_TIMING");
    expect(financeForecastTimingUsesCompactEmptyTimeline(visual.workspacePresentationState)).toBe(
      true,
    );
    const chart = buildFinanceForecastTimingMovementChartModel(visual);
    expect(chart.movements).toHaveLength(0);
  });

  it("shows untimed companion for partial timing only", () => {
    const visual = uatVisualModel();
    expect(visual.workspacePresentationState).toBe("PARTIAL_TIMING");
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(true);
    expect(visual.untimed.totalMinor).toBe(55_831_00);
  });
});

describe("FIN-04E-07R4 overlap and density", () => {
  it("assigns deterministic lanes for same-day movements", () => {
    const overview = baseOverview();
    const events = [
      event({ id: "a", expectedAmountMinor: 10_000_00, expectedDateIso: "2026-11-15" }),
      event({ id: "b", expectedAmountMinor: 5_000_00, expectedDateIso: "2026-11-15" }),
    ];
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events,
      accountNameById: new Map([["acc-mb", "Mitgliedsbeiträge"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    const chart = buildFinanceForecastTimingMovementChartModel(visual);
    expect(chart.movements).toHaveLength(2);
    expect(chart.movements[0]!.overlapLaneCount).toBe(2);
    expect(chart.movements[0]!.xStart).not.toBe(chart.movements[1]!.xStart);
  });

  it("renders twenty distinct movements without id collisions", () => {
    const overview = baseOverview();
    const events = Array.from({ length: 20 }, (_, i) =>
      event({
        id: `ev-${i}`,
        expectedDateIso: `2026-11-${String(10 + i).padStart(2, "0")}`,
        expectedAmountMinor: (i + 1) * 1_000_00,
      }),
    );
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events,
      accountNameById: new Map([["acc-mb", "Mitgliedsbeiträge"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    const chart = buildFinanceForecastTimingMovementChartModel(visual);
    expect(chart.movements).toHaveLength(20);
    expect(new Set(chart.movements.map((m) => m.eventId)).size).toBe(20);
  });
});

describe("FIN-04E-07R4 accessibility copy", () => {
  it("builds locale-aware timing phrases without enum names", () => {
    const visual = uatVisualModel();
    const monthMarker = visual.markers.find((m) => m.eventId === "ev3")!;
    const phrase = buildFinanceForecastMovementAccessibleTimingPhrase({
      marker: monthMarker,
      locale: "de-CH",
      exactTemplate: (d) => `am ${d}`,
      monthTemplate: (m) => `im ${m}`,
      rangeTemplate: (s, e) => `zwischen ${s} und ${e}`,
    });
    expect(phrase).toMatch(/im .*2027/);
    expect(phrase).not.toContain("MONTH");
  });
});

describe("FIN-04E-07R4 visual structure", () => {
  it("removes bubble lane grammar from populated timeline", () => {
    expect(timeline).not.toContain("timelineMarkerRadius");
    expect(timeline).not.toContain("LANE_MID_INCOME");
    expect(timeline).not.toContain("<circle");
    expect(timeline).toContain("data-finance-movement-zero-baseline-chart");
    expect(timeline).toContain("data-finance-movement-zero-baseline");
    expect(timeline).toContain("data-finance-timing-untimed-companion");
  });
});
