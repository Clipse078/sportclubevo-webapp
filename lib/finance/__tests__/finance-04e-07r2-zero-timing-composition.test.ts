import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import {
  financeForecastTimingCompactEmptyShowsGlobalCreateCta,
  financeForecastTimingCompactEmptyShowsPlottingSkeleton,
  financeForecastTimingShowsAllEventsDisclosure,
  financeForecastTimingShowsUntimedCompanion,
  financeForecastTimingShowsUpcomingMovements,
  financeForecastTimingSummaryShowsGlobalCreateCta,
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

function compactEmptySource(): string {
  const start = timeline.indexOf("function CompactEmptyTimingVisual");
  const end = timeline.indexOf("export function FinanceForecastTimingMovementTimeline");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return timeline.slice(start, end);
}

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

describe("FIN-04E-07R2 ZERO_TIMING composition", () => {
  it("uses interpretation surface guards in presentation layer", () => {
    expect(financeForecastTimingUsesCompactEmptyTimeline("ZERO_TIMING")).toBe(true);
    expect(financeForecastTimingCompactEmptyShowsPlottingSkeleton("ZERO_TIMING")).toBe(false);
    expect(financeForecastTimingCompactEmptyShowsGlobalCreateCta("ZERO_TIMING")).toBe(false);
    expect(
      financeForecastTimingSummaryShowsGlobalCreateCta({
        presentationState: "ZERO_TIMING",
        canMutate: true,
        remainingMinor: 80_000_00,
      }),
    ).toBe(false);
    expect(
      financeForecastTimingSummaryShowsGlobalCreateCta({
        presentationState: "PARTIAL_TIMING",
        canMutate: true,
        remainingMinor: 80_000_00,
      }),
    ).toBe(true);
  });

  it("ZERO_TIMING visual model has no plottable markers", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview(),
      events: [],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("ZERO_TIMING");
    expect(visual.markers).toHaveLength(0);
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(false);
    expect(
      financeForecastTimingShowsUpcomingMovements({
        presentationState: "ZERO_TIMING",
        upcomingEventCount: 0,
        futureTimedEventCount: 0,
      }),
    ).toBe(false);
    expect(financeForecastTimingShowsAllEventsDisclosure(0)).toBe(false);
  });

  it("compact interpretation source avoids chart skeleton and global create CTA", () => {
    const compact = compactEmptySource();
    expect(compact).toContain("data-finance-timing-compact-empty");
    expect(compact).toContain("data-finance-timing-compact-empty-amount");
    expect(compact).toContain("compactEmptyStatement");
    expect(compact).not.toContain("laneIncome");
    expect(compact).not.toContain("laneExpense");
    expect(compact).not.toContain("compactEmptyCta");
    expect(compact).not.toContain("<Button");
    expect(compact).not.toMatch(/max-h-\[/);
    expect(compact).not.toMatch(/\babsolute\b/);
    expect(compact).not.toMatch(/-m[tbrlxy]-/);
  });

  it("full timeline retains zero-baseline chart for partial timing", () => {
    expect(timeline).toContain("data-finance-timing-full-timeline");
    expect(timeline).toContain("data-finance-movement-zero-baseline-chart");
    expect(timeline).toContain("financeForecastTimingShowsUntimedCompanion");
  });

  it("panel keeps open planning as action surface with account create wiring", () => {
    expect(timingPanel).toContain("attentionTitle");
    expect(timingPanel).toContain("addForAccount");
    expect(timingPanel).toContain("financeForecastTimingSummaryShowsGlobalCreateCta");
    expect(timingPanel).not.toContain("onAddTiming");
    expect(timingPanel).toContain("balancedAccountsTitle");
    expect(timingPanel).toMatch(/canMutate[\s\S]*addForAccount/);
  });

  it("responsive open-planning rows use canonical wrap/stack patterns", () => {
    expect(timingPanel).toContain("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between");
    expect(timingPanel).toContain("flex shrink-0 gap-2");
    expect(timingPanel).not.toMatch(/data-finance-timing-attention[\s\S]*overflow-x-hidden/);
  });
});

describe("FIN-04E-07R2 PARTIAL and FULL regression", () => {
  it("PARTIAL_TIMING keeps untimed companion eligibility", () => {
    const overview = baseOverview({
      annual: {
        ...baseOverview().annual,
        income: {
          ...baseOverview().annual.income,
          timedFutureExpectationMinor: 50_000_00,
          unscheduledRemainderMinor: 30_000_00,
        },
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
    expect(visual.markers.length).toBeGreaterThan(0);
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(true);
    expect(financeForecastTimingCompactEmptyShowsPlottingSkeleton(visual.workspacePresentationState)).toBe(true);
  });

  it("FULL_TIMING hides zero interpretation and untimed companion", () => {
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
      counts: {
        ...baseOverview().counts,
        futureTimedEventCount: 1,
        totalExpectedEventCount: 1,
      },
    });
    const visual = buildFinanceForecastTimingVisualModel({
      overview,
      events: [event({ expectedAmountMinor: 80_000_00 })],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("FULL_TIMING");
    expect(financeForecastTimingUsesCompactEmptyTimeline(visual.workspacePresentationState)).toBe(false);
    expect(financeForecastTimingShowsUntimedCompanion(visual.workspacePresentationState)).toBe(false);
  });
});
