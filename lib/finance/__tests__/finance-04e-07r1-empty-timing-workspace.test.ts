import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import {
  deriveFinanceForecastTimingWorkspacePresentationState,
  financeForecastTimingAccountRowDensity,
  financeForecastTimingShowsAllEventsDisclosure,
  financeForecastTimingShowsUntimedCompanion,
  financeForecastTimingShowsUpcomingMovements,
  financeForecastTimingUsesCompactEmptyTimeline,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
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

describe("FIN-04E-07R1 presentation states", () => {
  it("ZERO_TIMING when nothing is timed and no plottable markers", () => {
    const overview = baseOverview();
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("ZERO_TIMING");
    expect(financeForecastTimingUsesCompactEmptyTimeline(visual.workspacePresentationState)).toBe(true);
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(false);
  });

  it("PARTIAL_TIMING with untimed companion eligibility", () => {
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
      counts: {
        ...baseOverview().counts,
        futureTimedEventCount: 1,
        totalExpectedEventCount: 1,
      },
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [event({ expectedAmountMinor: 50_000_00 })],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("PARTIAL_TIMING");
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(true);
  });

  it("FULL_TIMING when no untimed remainder remains", () => {
    const overview = baseOverview({
      interpretationState: "FULLY_SCHEDULED",
      annual: {
        ...baseOverview().annual,
        income: {
          ...baseOverview().annual.income,
          timedFutureExpectationMinor: 80_000_00,
          unscheduledRemainderMinor: 0,
        },
      },
      timingCoverage: {
        kind: "RATIO",
        remainingFutureExpectationMinor: 80_000_00,
        timedFutureExpectationMinor: 80_000_00,
        timedCoverageBasisPoints: 10_000,
        rawTimedCoverageBasisPoints: null,
        isOverallocated: false,
      },
      counts: {
        ...baseOverview().counts,
        futureTimedEventCount: 2,
        totalExpectedEventCount: 2,
      },
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [
        event({ id: "ev1", expectedAmountMinor: 40_000_00 }),
        event({ id: "ev2", expectedAmountMinor: 40_000_00, expectedDateIso: "2027-09-01" }),
      ],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("FULL_TIMING");
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(false);
  });
});

describe("FIN-04E-07R1 ZERO_TIMING UX guards", () => {
  it("hides upcoming movements and empty event disclosure for zero events", () => {
    expect(
      financeForecastTimingShowsUpcomingMovements({
        presentationState: "ZERO_TIMING",
        upcomingEventCount: 0,
        futureTimedEventCount: 0,
      }),
    ).toBe(false);
    expect(financeForecastTimingShowsAllEventsDisclosure(0)).toBe(false);
  });

  it("uses compact interpretation and full timeline branches in UI source", () => {
    expect(timeline).toContain("data-finance-timing-compact-empty");
    expect(timeline).toContain("data-finance-timing-compact-interpretation");
    expect(timeline).toContain("data-finance-timing-full-timeline");
    expect(timeline).toContain("financeForecastTimingShowsUntimedCompanion");
    expect(timeline).toContain("CompactEmptyTimingVisual");
  });

  it("gates upcoming section and balanced-account disclosure label in panel", () => {
    expect(timingPanel).toContain("financeForecastTimingShowsUpcomingMovements");
    expect(timingPanel).toContain("balancedAccountsTitle");
    expect(timingPanel).toContain("financeForecastTimingShowsAllEventsDisclosure");
    expect(timingPanel).toContain("data-finance-timing-account-row=\"zero-timed\"");
    expect(timingPanel).not.toContain("emptyProfileBody");
  });

  it("progressive open-planning row density", () => {
    expect(
      financeForecastTimingAccountRowDensity({
        timedFutureExpectationMinor: 0,
        unscheduledRemainderMinor: 100,
      }),
    ).toBe("ZERO_TIMED");
    expect(
      financeForecastTimingAccountRowDensity({
        timedFutureExpectationMinor: 75_000_00,
        unscheduledRemainderMinor: 34_294_00,
      }),
    ).toBe("PARTIAL_TIMED");
  });
});

describe("FIN-04E-07R1 deriveFinanceForecastTimingWorkspacePresentationState", () => {
  it("matches explicit state model", () => {
    expect(
      deriveFinanceForecastTimingWorkspacePresentationState({
        hasRemainingExpectation: false,
        timedFutureExpectationMinor: 0,
        untimedTotalMinor: 0,
        plottableMarkerCount: 0,
      }),
    ).toBe("NO_REMAINING");
    expect(
      deriveFinanceForecastTimingWorkspacePresentationState({
        hasRemainingExpectation: true,
        timedFutureExpectationMinor: 0,
        untimedTotalMinor: 80_000_00,
        plottableMarkerCount: 0,
      }),
    ).toBe("ZERO_TIMING");
  });
});
