import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import { buildScenarioAssumptionTemporalVisualModel } from "@/lib/finance/forecast/build-scenario-assumption-temporal-visual-model";
import { FINANCE_FORECAST_TIMING_VISUAL_04E_07_ARCHITECTURE_LOCKS } from "@/lib/finance/forecast/finance-forecast-timing-visual-architecture-contract";
import { buildForecastTimingIntelligence } from "@/lib/finance/forecast/build-forecast-timing-intelligence";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { FinanceForecastTimingOverviewReadModel } from "@/lib/finance/forecast/finance-forecast-timing-read-model";

const timingPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingWorkspacePanel.tsx"),
  "utf8",
);
const timeline = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingMovementTimeline.tsx"),
  "utf8",
);

function baseOverview(partial: Partial<FinanceForecastTimingOverviewReadModel> = {}): FinanceForecastTimingOverviewReadModel {
  return {
    financeYearId: "fy1",
    actualsThroughDateIso: "2026-06-30",
    referenceDateIso: "2026-06-30",
    currentForecast: { kind: "AVAILABLE", forecastId: "f1", forecastVersionId: "v1", versionNumber: 1, asOfDateIso: "2026-06-30", actualsThroughDateIso: "2026-06-30" },
    annual: {
      income: {
        annualForecastMinor: 100_000_00,
        actualThroughCutoffMinor: 20_000_00,
        remainingFutureExpectationMinor: 80_000_00,
        timedFutureExpectationMinor: 0,
        ambiguousTimingExpectationMinor: 0,
        unscheduledRemainderMinor: 80_000_00,
        overallocatedAmountMinor: 0,
        actualExceedsAnnualForecastAmountMinor: 0,
        futureTimedMovementMinor: 0,
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
      futureResultContextMinor: 80_000_00,
    },
    timingCoverage: {
      kind: "RATIO",
      remainingFutureExpectationMinor: 80_000_00,
      timedFutureExpectationMinor: 0,
      timedCoverageBasisPoints: 0,
      rawTimedCoverageBasisPoints: null,
      isOverallocated: false,
    },
    interpretationState: "PARTIALLY_SCHEDULED",
    exceptions: [],
    counts: {
      totalExpectedEventCount: 0,
      futureTimedEventCount: 0,
      ambiguousEventCount: 0,
      accountsWithUnscheduledRemainderCount: 1,
      overallocatedAccountCount: 0,
      accountCount: 1,
    },
    accounts: [
      {
        financialAccountId: "acc-income",
        name: "Membership",
        accountType: "INCOME",
        lifecycle: "ACTIVE",
        rank: 1,
        reconciliation: {
          annualForecastAmountMinor: 100_000_00,
          forecastLinePresent: true,
          actualThroughCutoffMinor: 20_000_00,
          remainingFutureExpectationMinor: 80_000_00,
          timedFutureExpectationMinor: 0,
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 80_000_00,
          overallocatedAmountMinor: 0,
          actualExceedsAnnualForecastAmountMinor: 0,
          state: "PARTIALLY_SCHEDULED",
        },
        expectedEventCount: 0,
        futureTimedEventCount: 0,
        ambiguousEventCount: 0,
        nextExpectedEventId: null,
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
    financialAccountId: partial.financialAccountId ?? "acc-income",
    expectedAmountMinor: partial.expectedAmountMinor ?? 10_000_00,
    timingPrecision: partial.timingPrecision ?? "EXACT_DATE",
    expectedDateIso: partial.expectedDateIso ?? "2027-06-30",
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

describe("FIN-04E-07 architecture locks", () => {
  it("exports visual timing locks", () => {
    expect(FINANCE_FORECAST_TIMING_VISUAL_04E_07_ARCHITECTURE_LOCKS.VISUALS_USE_EVIDENCE_BACKED_TIMING).toBe(true);
    expect(FINANCE_FORECAST_TIMING_VISUAL_04E_07_ARCHITECTURE_LOCKS.NO_ANNUAL_DIVIDE_BY_12).toBe(true);
    expect(FINANCE_FORECAST_TIMING_VISUAL_04E_07_ARCHITECTURE_LOCKS.EXPECTED_TIMING_IS_NOT_LIQUIDITY).toBe(true);
  });
});

describe("FIN-04E-07 empty timing visual model", () => {
  it("exposes untimed remainder without fake timeline markers", () => {
    const overview = baseOverview();
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.markers).toHaveLength(0);
    expect(visual.untimed.totalMinor).toBe(80_000_00);
    expect(visual.timedFutureExpectationMinor).toBe(0);
    expect(visual.workspacePresentationState).toBe("ZERO_TIMING");
  });
});

describe("FIN-04E-07 partial timing", () => {
  it("keeps timed and untimed explicit", () => {
    const overview = baseOverview({
      annual: {
        ...baseOverview().annual,
        income: {
          ...baseOverview().annual.income,
          timedFutureExpectationMinor: 50_000_00,
          unscheduledRemainderMinor: 30_000_00,
        },
      },
      timingCoverage: {
        kind: "RATIO",
        remainingFutureExpectationMinor: 80_000_00,
        timedFutureExpectationMinor: 50_000_00,
        timedCoverageBasisPoints: 6250,
        rawTimedCoverageBasisPoints: null,
        isOverallocated: false,
      },
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [event({ expectedAmountMinor: 50_000_00 })],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.timedFutureExpectationMinor).toBe(50_000_00);
    expect(visual.untimed.totalMinor).toBe(30_000_00);
    expect(visual.markers.reduce((s, m) => s + m.expectedAmountMinor, 0)).toBe(50_000_00);
  });
});

describe("FIN-04E-07 timing precision", () => {
  it("preserves exact business date", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview({
        annual: {
          ...baseOverview().annual,
          income: {
            ...baseOverview().annual.income,
            timedFutureExpectationMinor: 10_000_00,
            unscheduledRemainderMinor: 70_000_00,
          },
        },
      }),
      events: [event({ expectedDateIso: "2027-06-30", timingPrecision: "EXACT_DATE" })],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.markers[0]?.interval.kind).toBe("EXACT_DATE");
    expect(visual.markers[0]?.interval.startDateIso).toBe("2027-06-30");
    expect(visual.markers[0]?.interval.plotAnchorDateIso).toBe("2027-06-30");
  });

  it("keeps MONTH precision and does not expose day-1 as business truth in interval", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview({
        annual: {
          ...baseOverview().annual,
          income: {
            ...baseOverview().annual.income,
            timedFutureExpectationMinor: 10_000_00,
            unscheduledRemainderMinor: 70_000_00,
          },
        },
      }),
      events: [
        event({
          timingPrecision: "MONTH",
          expectedDateIso: null,
          expectedMonthStartIso: "2027-06-01",
        }),
      ],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    const marker = visual.markers[0]!;
    expect(marker.interval.kind).toBe("MONTH");
    expect(marker.interval.endDateIso).toBe("2027-06-30");
    expect(marker.interval.plotAnchorDateIso).not.toBe(marker.interval.startDateIso);
  });

  it("preserves DATE_RANGE without day proration", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview({
        annual: {
          ...baseOverview().annual,
          income: {
            ...baseOverview().annual.income,
            timedFutureExpectationMinor: 10_000_00,
            unscheduledRemainderMinor: 70_000_00,
          },
        },
      }),
      events: [
        event({
          timingPrecision: "DATE_RANGE",
          expectedDateIso: null,
          rangeStartDateIso: "2027-06-01",
          rangeEndDateIso: "2027-06-15",
          expectedAmountMinor: 10_000_00,
        }),
      ],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.markers[0]?.interval.startDateIso).toBe("2027-06-01");
    expect(visual.markers[0]?.interval.endDateIso).toBe("2027-06-15");
    expect(visual.markers).toHaveLength(1);
  });
});

describe("FIN-04E-07 income and expense semantics", () => {
  it("keeps account type on markers", () => {
    const overview = baseOverview({
      accounts: [
        ...baseOverview().accounts,
        {
          financialAccountId: "acc-expense",
          name: "Rent",
          accountType: "EXPENSE",
          lifecycle: "ACTIVE",
          rank: 2,
          reconciliation: {
            annualForecastAmountMinor: 40_000_00,
            forecastLinePresent: true,
            actualThroughCutoffMinor: 0,
            remainingFutureExpectationMinor: 40_000_00,
            timedFutureExpectationMinor: 5_000_00,
            ambiguousTimingExpectationMinor: 0,
            unscheduledRemainderMinor: 35_000_00,
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
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [
        event({ id: "ev1", financialAccountId: "acc-income" }),
        event({ id: "ev2", financialAccountId: "acc-expense", expectedDateIso: "2027-08-01" }),
      ],
      accountNameById: new Map([
        ["acc-income", "Membership"],
        ["acc-expense", "Rent"],
      ]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.markers.find((m) => m.eventId === "ev1")?.accountType).toBe("INCOME");
    expect(visual.markers.find((m) => m.eventId === "ev2")?.accountType).toBe("EXPENSE");
  });
});

describe("FIN-04E-07 cross finance year", () => {
  it("includes events after finance year end with boundary flag", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview({
        annual: {
          ...baseOverview().annual,
          income: {
            ...baseOverview().annual.income,
            timedFutureExpectationMinor: 10_000_00,
            unscheduledRemainderMinor: 70_000_00,
          },
        },
      }),
      events: [event({ expectedDateIso: "2027-03-01" })],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.markers[0]?.isAfterFinanceYearEnd).toBe(true);
  });
});

describe("FIN-04E-07 over-allocation", () => {
  it("does not drop markers when timed exceeds remaining", () => {
    const overview = baseOverview({
      timingCoverage: {
        kind: "RATIO",
        remainingFutureExpectationMinor: 80_000_00,
        timedFutureExpectationMinor: 95_000_00,
        timedCoverageBasisPoints: 10_000,
        rawTimedCoverageBasisPoints: 11_875,
        isOverallocated: true,
      },
      interpretationState: "OVERALLOCATED",
      annual: {
        ...baseOverview().annual,
        income: {
          ...baseOverview().annual.income,
          timedFutureExpectationMinor: 95_000_00,
          unscheduledRemainderMinor: 0,
          overallocatedAmountMinor: 15_000_00,
        },
      },
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [
        event({ id: "ev1", expectedAmountMinor: 50_000_00 }),
        event({ id: "ev2", expectedAmountMinor: 45_000_00, expectedDateIso: "2027-09-01" }),
      ],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.isOverallocated).toBe(true);
    expect(visual.markers).toHaveLength(2);
    expect(visual.markers.reduce((s, m) => s + m.expectedAmountMinor, 0)).toBe(95_000_00);
  });
});

describe("FIN-04E-07 ambiguity at cutoff", () => {
  it("retains ambiguous temporal position on markers", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview({
        counts: { ...baseOverview().counts, ambiguousEventCount: 1 },
        annual: {
          ...baseOverview().annual,
          income: {
            ...baseOverview().annual.income,
            timedFutureExpectationMinor: 0,
            ambiguousTimingExpectationMinor: 10_000_00,
            unscheduledRemainderMinor: 70_000_00,
          },
        },
      }),
      events: [
        event({
          timingPrecision: "MONTH",
          expectedMonthStartIso: "2026-06-01",
          expectedDateIso: null,
        }),
      ],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.markers[0]?.temporalPositionAtCutoff).toBe("AMBIGUOUS_AT_CUTOFF");
  });
});

describe("FIN-04E-07 scenario effective-date visual", () => {
  it("separates known impact from undetermined base without synthetic events", () => {
    const model = buildScenarioAssumptionTemporalVisualModel({
      assumptionId: "a1",
      financialAccountId: "acc1",
      effectiveFromDateIso: "2027-07-01",
      temporal: {
        financialAccountId: "acc1",
        effectiveFromDateIso: "2027-07-01",
        temporalCoverageState: "PARTIAL",
        eligibleTimedBaseAmountMinor: 7_000_00,
        unaffectedTimedBaseAmountMinor: 3_000_00,
        ambiguousBaseAmountMinor: 1_000_00,
        unscheduledBaseAmountMinor: 20_000_00,
        knownScenarioImpactMinor: -3_000_00,
        undeterminedBaseAmountMinor: 20_000_00,
        temporalStale: false,
        adoptionEligible: false,
        temporalSupportState: "EFFECTIVE_DATED",
      },
    });
    expect(model.knownScenarioImpactMinor).toBe(-3_000_00);
    expect(model.undeterminedBaseAmountMinor).toBe(20_000_00);
    expect(model.segments.find((s) => s.key === "UNSCHEDULED")?.amountMinor).toBe(20_000_00);
  });
});

describe("FIN-04E-07 UX guards", () => {
  it("places timeline between summary and upcoming list", () => {
    const summaryIdx = timingPanel.indexOf("data-finance-timing-summary");
    const visualIdx = timingPanel.indexOf("<FinanceForecastTimingMovementTimeline");
    const upcomingIdx = timingPanel.indexOf("data-finance-timing-upcoming");
    expect(visualIdx).toBeGreaterThan(summaryIdx);
    expect(upcomingIdx).toBeGreaterThan(visualIdx);
  });

  it("does not introduce liquidity curve or monthly phasing", () => {
    expect(timeline).not.toContain("/ 12");
    expect(timeline).not.toContain("liquidity");
    expect(timeline).not.toContain("runway");
    expect(timeline).toContain("data-finance-timing-untimed-companion");
    expect(timeline).toContain("financeForecastTimingShowsUntimedCompanion");
    expect(timeline).toContain("data-finance-timing-compact-empty");
  });

  it("gates mutation from timeline via canMutate prop wiring", () => {
    expect(timingPanel).toContain("onSelectManualEvent");
    expect(timingPanel).toContain("canMutate");
  });

  it("binary control compliance — no new checkboxes in timeline", () => {
    expect(timeline).not.toMatch(/type="checkbox"/);
  });
});

describe("FIN-04E-07 integration with 04E-04 intelligence", () => {
  it("uses overview totals without React-side reconciliation", () => {
    const intelligence = buildForecastTimingIntelligence({
      financeYearId: "fy1",
      actualsThroughDateIso: "2026-06-30",
      currentForecast: {
        kind: "AVAILABLE",
        forecastId: "f1",
        forecastVersionId: "v1",
        versionNumber: 1,
        asOfDateIso: "2026-06-30",
        actualsThroughDateIso: "2026-06-30",
      },
      planningAccounts: [
        { id: "acc-income", name: "Membership", accountType: "INCOME", lifecycle: "ACTIVE" },
      ],
      forecastAmountByAccountId: new Map([["acc-income", 100_000_00]]),
      actualThroughCutoffByAccountId: new Map([["acc-income", 20_000_00]]),
      events: [event({ expectedAmountMinor: 50_000_00 })],
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview: intelligence,
      events: [event({ expectedAmountMinor: 50_000_00 })],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.remainingFutureExpectationMinor).toBe(intelligence.annual.income.remainingFutureExpectationMinor);
  });
});
