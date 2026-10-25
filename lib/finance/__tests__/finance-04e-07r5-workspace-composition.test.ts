import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import { FINANCE_FORECAST_TIMING_WORKSPACE_04E_07R5_ARCHITECTURE_LOCKS } from "@/lib/finance/forecast/finance-forecast-timing-workspace-07r5-architecture-contract";
import {
  financeForecastTimingShowsCompactUntimedOrientation,
  financeForecastTimingShowsFullTimingCompletion,
  financeForecastTimingShowsOpenPlanningSection,
  financeForecastTimingShowsZeroTimingInterpretation,
  financeForecastTimingSummaryShowsGlobalCreateCta,
  financeForecastTimingWorkspaceMountsMovementChart,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { FinanceForecastTimingOverviewReadModel } from "@/lib/finance/forecast/finance-forecast-timing-read-model";

const timingPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingWorkspacePanel.tsx"),
  "utf8",
);
const orientation = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingWorkspaceOrientation.tsx"),
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
        timedFutureExpectationMinor: 50_000_00,
        ambiguousTimingExpectationMinor: 0,
        unscheduledRemainderMinor: 30_000_00,
        overallocatedAmountMinor: 0,
        actualExceedsAnnualForecastAmountMinor: 0,
        futureTimedMovementMinor: 50_000_00,
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
      timedFutureExpectationMinor: 50_000_00,
      timedCoverageBasisPoints: 6250,
      rawTimedCoverageBasisPoints: null,
      isOverallocated: false,
    },
    interpretationState: "PARTIALLY_SCHEDULED",
    exceptions: [],
    counts: {
      totalExpectedEventCount: 1,
      futureTimedEventCount: 1,
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
          timedFutureExpectationMinor: 50_000_00,
          ambiguousTimingExpectationMinor: 0,
          unscheduledRemainderMinor: 30_000_00,
          overallocatedAmountMinor: 0,
          actualExceedsAnnualForecastAmountMinor: 0,
          state: "PARTIALLY_SCHEDULED",
        },
        expectedEventCount: 1,
        futureTimedEventCount: 1,
        ambiguousEventCount: 0,
        nextExpectedEventId: "ev1",
      },
    ],
    upcomingEvents: [
      {
        eventId: "ev1",
        financialAccountId: "acc-income",
        accountName: "Membership",
        accountType: "INCOME",
        expectedAmountMinor: 50_000_00,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-09-01",
        expectedMonthStartIso: null,
        rangeStartDateIso: null,
        rangeEndDateIso: null,
        description: null,
      },
    ],
    ...partial,
  };
}

function event(partial: Partial<ExpectedFinancialEventRecord>): ExpectedFinancialEventRecord {
  return {
    id: partial.id ?? "ev1",
    tenantId: "t1",
    financeYearId: "fy1",
    financialAccountId: partial.financialAccountId ?? "acc-income",
    expectedAmountMinor: partial.expectedAmountMinor ?? 50_000_00,
    timingPrecision: partial.timingPrecision ?? "EXACT_DATE",
    expectedDateIso: partial.expectedDateIso ?? "2026-09-01",
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

describe("FIN-04E-07R5 architecture locks", () => {
  it("documents workspace separation and preserved chart capability", () => {
    expect(FINANCE_FORECAST_TIMING_WORKSPACE_04E_07R5_ARCHITECTURE_LOCKS.ZEITPLANUNG_HAS_NO_PRIMARY_ANALYTICAL_CHART).toBe(true);
    expect(FINANCE_FORECAST_TIMING_WORKSPACE_04E_07R5_ARCHITECTURE_LOCKS.MOVEMENT_CHART_REUSABLE).toBe(true);
    expect(FINANCE_FORECAST_TIMING_WORKSPACE_04E_07R5_ARCHITECTURE_LOCKS.GLOBAL_CREATE_DEFERRED_TO_ACCOUNT_ROWS).toBe(true);
  });
});

describe("FIN-04E-07R5 PARTIAL_TIMING workspace composition", () => {
  it("presentation guards exclude chart mount and global create", () => {
    expect(financeForecastTimingWorkspaceMountsMovementChart("PARTIAL_TIMING")).toBe(false);
    expect(
      financeForecastTimingSummaryShowsGlobalCreateCta({
        presentationState: "PARTIAL_TIMING",
        canMutate: true,
        remainingMinor: 80_000_00,
      }),
    ).toBe(false);
    expect(
      financeForecastTimingShowsCompactUntimedOrientation({
        presentationState: "PARTIAL_TIMING",
        untimedTotalMinor: 30_000_00,
      }),
    ).toBe(true);
  });

  it("panel places open planning before upcoming and omits movement timeline", () => {
    expect(timingPanel).not.toContain("FinanceForecastTimingMovementTimeline");
    expect(timingPanel).toContain("data-finance-timing-movement-chart-mounted");
    expect(timingPanel).toContain("financeForecastTimingWorkspaceMountsMovementChart");
    expect(timingPanel).toContain("financeForecastTimingShowsOpenPlanningSection");
    expect(orientation).toContain("data-finance-timing-untimed-orientation");
    expect(timingPanel).toContain("financeForecastTimingShowsCompactUntimedOrientation");
    expect(timingPanel).toContain("data-finance-timing-attention");
    expect(timingPanel).toContain("data-finance-timing-upcoming");
    const summaryIdx = timingPanel.indexOf("data-finance-timing-summary");
    const attentionIdx = timingPanel.indexOf("data-finance-timing-attention");
    const upcomingIdx = timingPanel.indexOf("data-finance-timing-upcoming");
    expect(attentionIdx).toBeGreaterThan(summaryIdx);
    expect(upcomingIdx).toBeGreaterThan(attentionIdx);
  });

  it("preserves signed account row breakdown and upcoming movements", () => {
    expect(timingPanel).toContain('data-finance-timing-account-row="partial-timed"');
    expect(timingPanel).toContain("accountRowPartialBreakdown");
    expect(timingPanel).toContain("data-finance-timing-upcoming-row");
    expect(timingPanel).toContain("formatMovementAmount");
  });

  it("partial visual model stays PARTIAL_TIMING with plottable markers for reusable chart", () => {
    const visual = buildFinanceForecastTimingVisualModel({
      overview: baseOverview(),
      events: [event({})],
      accountNameById: new Map([["acc-income", "Membership"]]),
      financeYearStartDateIso: "2026-01-01",
      financeYearEndDateIso: "2026-12-31",
    });
    expect(visual.workspacePresentationState).toBe("PARTIAL_TIMING");
    expect(visual.markers.length).toBeGreaterThan(0);
  });
});

describe("FIN-04E-07R5 ZERO_TIMING", () => {
  it("shows compact interpretation in workspace orientation, not chart", () => {
    expect(financeForecastTimingShowsZeroTimingInterpretation("ZERO_TIMING")).toBe(true);
    expect(orientation).toContain("data-finance-timing-compact-empty");
    expect(timingPanel).toContain("FinanceForecastTimingWorkspaceOrientation");
    expect(
      financeForecastTimingSummaryShowsGlobalCreateCta({
        presentationState: "ZERO_TIMING",
        canMutate: true,
        remainingMinor: 80_000_00,
      }),
    ).toBe(false);
  });
});

describe("FIN-04E-07R5 FULL_TIMING", () => {
  it("shows completion interpretation and hides empty open planning", () => {
    expect(financeForecastTimingShowsFullTimingCompletion("FULL_TIMING")).toBe(true);
    expect(
      financeForecastTimingShowsOpenPlanningSection({
        presentationState: "FULL_TIMING",
        attentionAccountCount: 0,
      }),
    ).toBe(false);
    expect(orientation).toContain("data-finance-timing-full-completion");
    expect(
      financeForecastTimingShowsCompactUntimedOrientation({
        presentationState: "FULL_TIMING",
        untimedTotalMinor: 0,
      }),
    ).toBe(false);
  });
});

describe("FIN-04E-07R5 exceptions and disclosures", () => {
  it("surfaces exception copy without chart dependency", () => {
    expect(timingPanel).toContain("data-finance-timing-overallocated");
    expect(timingPanel).toContain("data-finance-timing-ambiguous");
    expect(timingPanel).toContain("data-finance-timing-account-issue");
    expect(timingPanel).toContain("accountIssueKey");
    expect(timingPanel).toContain("missingForecast");
    expect(timingPanel).toContain("actualExceeds");
    expect(timingPanel).toContain('data-finance-disclosure="timing-all-events"');
  });
});

describe("FIN-04E-07R5 movement chart capability preserved", () => {
  it("retains reusable renderer and chart semantics", () => {
    expect(timeline).toContain("buildFinanceForecastTimingMovementChartModel");
    expect(timeline).toContain("data-finance-movement-zero-baseline-chart");
    expect(timeline).toContain("Übersicht");
  });
});
