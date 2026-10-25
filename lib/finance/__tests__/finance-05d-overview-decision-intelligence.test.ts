import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/reporting/build-finance-overview-decision-intelligence-read-model";
import { FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE } from "@/lib/finance/reporting/finance-overview-decision-intelligence-read-model";
import {
  FINANCE_05D_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import type { FinanceManagementOverviewReadModel } from "@/lib/finance/reporting/finance-management-overview-read-model";
import {
  FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE,
  loadFinanceOverviewDecisionIntelligenceReadModel,
} from "@/lib/finance/services/finance-overview-decision-intelligence-query-service";
import { loadFinanceManagementOverviewReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";

vi.mock("@/lib/finance/services/finance-management-reporting-query-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/finance/services/finance-management-reporting-query-service")
  >();
  return {
    ...actual,
    loadFinanceManagementOverviewReadModel: vi.fn(),
  };
});

vi.mock("@/lib/finance/services/finance-forecast-timing-query-service", () => ({
  loadFinanceForecastTimingOverview: vi.fn(),
}));

vi.mock("@/lib/finance/services/finance-expected-financial-event-service", () => ({
  listFinanceExpectedFinancialEvents: vi.fn(),
}));

vi.mock("@/lib/finance/forecast/build-forecast-timing-visual-model", () => ({
  buildFinanceForecastTimingVisualModel: vi.fn(),
}));

function baseManagement(
  partial: Partial<FinanceManagementOverviewReadModel> = {},
): FinanceManagementOverviewReadModel {
  return {
    tenantId: "t1",
    financeYearId: "y1",
    financeYearName: "FY2026",
    mode: "LIVE",
    baseCurrency: "EUR",
    availability: "AVAILABLE",
    actualCutoffDate: null,
    approvedBudget: {
      availability: "AVAILABLE",
      summary: { incomeMinor: 100_00, expenseMinor: 60_00, resultMinor: 40_00 },
      approvedBudgetVersionId: "bv1",
    },
    actual: {
      availability: "AVAILABLE",
      summary: { incomeMinor: 50_00, expenseMinor: 30_00, resultMinor: 20_00 },
      grain: "ANNUAL_FULL_YEAR",
    },
    currentForecast: {
      availability: "AVAILABLE",
      summary: { incomeMinor: 110_00, expenseMinor: 55_00, resultMinor: 55_00 },
      currentForecastVersionId: "fv1",
    },
    forecastVsBudgetVariance: {
      availability: "AVAILABLE",
      baselineMinor: 40_00,
      comparisonMinor: 55_00,
      rawDeltaMinor: 15_00,
      variancePercent: 3750,
      favorability: "FAVORABLE",
      absoluteVarianceMagnitudeMinor: 15_00,
    },
    actualVsBudgetVariance: {
      availability: "PERIOD_MISMATCH",
      baselineMinor: null,
      comparisonMinor: null,
      rawDeltaMinor: null,
      variancePercent: null,
      favorability: null,
      absoluteVarianceMagnitudeMinor: null,
    },
    topFavourableDrivers: [
      {
        kind: "ACCOUNT",
        id: "a1",
        name: "Membership",
        canonicalSemantic: "INCOME",
        hierarchySortOrder: 1,
        comparison: {
          availability: "AVAILABLE",
          baselineMinor: 80_00,
          comparisonMinor: 100_00,
          rawDeltaMinor: 20_00,
          variancePercent: 2500,
          favorability: "FAVORABLE",
          absoluteVarianceMagnitudeMinor: 20_00,
        },
        relativeContributionBasisPoints: 8000,
        rank: 1,
      },
    ],
    topUnfavourableDrivers: [
      {
        kind: "ACCOUNT",
        id: "a2",
        name: "Staff",
        canonicalSemantic: "EXPENSE",
        hierarchySortOrder: 2,
        comparison: {
          availability: "AVAILABLE",
          baselineMinor: 50_00,
          comparisonMinor: 60_00,
          rawDeltaMinor: 10_00,
          variancePercent: 2000,
          favorability: "UNFAVORABLE",
          absoluteVarianceMagnitudeMinor: 10_00,
        },
        relativeContributionBasisPoints: 4000,
        rank: 1,
      },
    ],
    attention: {
      hasUnfavourableManagementResultVariance: false,
      hasMissingApprovedBudget: false,
      hasMissingCurrentForecast: false,
    },
    ...partial,
  };
}

describe("FIN-05D financial conclusion", () => {
  it("maps favourable forecast vs budget to ABOVE_BUDGET_EXPECTED", () => {
    const model = buildFinanceOverviewDecisionIntelligenceReadModel({
      management: baseManagement(),
      timingOverview: null,
      visualModel: null,
      timingVisible: false,
      capabilities: {
        canOpenReports: true,
        canOpenBudget: true,
        canOpenForecast: true,
        canOpenTiming: false,
        canOpenActuals: true,
        canOpenStructure: true,
      },
    });
    expect(model.conclusion.kind).toBe("ABOVE_BUDGET_EXPECTED");
    expect(model.conclusion.forecastVsBudgetVarianceMinor).toBe(15_00);
  });

  it("handles missing forecast without fabricating variance", () => {
    const model = buildFinanceOverviewDecisionIntelligenceReadModel({
      management: baseManagement({
        currentForecast: {
          availability: "NO_CURRENT_FORECAST",
          summary: null,
          currentForecastVersionId: null,
        },
        forecastVsBudgetVariance: {
          availability: "BOTH_MISSING",
          baselineMinor: null,
          comparisonMinor: null,
          rawDeltaMinor: null,
          variancePercent: null,
          favorability: null,
          absoluteVarianceMagnitudeMinor: null,
        },
        topFavourableDrivers: [],
        topUnfavourableDrivers: [],
      }),
      timingOverview: null,
      visualModel: null,
      timingVisible: false,
      capabilities: {
        canOpenReports: true,
        canOpenBudget: true,
        canOpenForecast: true,
        canOpenTiming: false,
        canOpenActuals: true,
        canOpenStructure: true,
      },
    });
    expect(model.conclusion.kind).toBe("FORECAST_UNAVAILABLE");
    expect(model.conclusion.forecastResultMinor).toBeNull();
  });

  it("ON_PLAN maps to ON_TRACK", () => {
    const model = buildFinanceOverviewDecisionIntelligenceReadModel({
      management: baseManagement({
        forecastVsBudgetVariance: {
          availability: "AVAILABLE",
          baselineMinor: 40_00,
          comparisonMinor: 40_00,
          rawDeltaMinor: 0,
          variancePercent: 0,
          favorability: "ON_PLAN",
          absoluteVarianceMagnitudeMinor: 0,
        },
      }),
      timingOverview: null,
      visualModel: null,
      timingVisible: false,
      capabilities: {
        canOpenReports: true,
        canOpenBudget: true,
        canOpenForecast: true,
        canOpenTiming: false,
        canOpenActuals: true,
        canOpenStructure: true,
      },
    });
    expect(model.conclusion.kind).toBe("ON_TRACK");
  });
});

describe("FIN-05D drivers", () => {
  it("limits driver density per side", () => {
    const drivers = Array.from({ length: 5 }, (_, i) => ({
      kind: "ACCOUNT" as const,
      id: `f${i}`,
      name: `F${i}`,
      canonicalSemantic: "INCOME" as const,
      hierarchySortOrder: i,
      comparison: {
        availability: "AVAILABLE" as const,
        baselineMinor: 10_00,
        comparisonMinor: 20_00,
        rawDeltaMinor: 10_00,
        variancePercent: 10000,
        favorability: "FAVORABLE" as const,
        absoluteVarianceMagnitudeMinor: 10_00,
      },
      relativeContributionBasisPoints: 1000,
      rank: i + 1,
    }));

    const model = buildFinanceOverviewDecisionIntelligenceReadModel({
      management: baseManagement({ topFavourableDrivers: drivers, topUnfavourableDrivers: [] }),
      timingOverview: null,
      visualModel: null,
      timingVisible: false,
      capabilities: {
        canOpenReports: true,
        canOpenBudget: true,
        canOpenForecast: true,
        canOpenTiming: false,
        canOpenActuals: true,
        canOpenStructure: true,
      },
    });
    expect(model.drivers.maxPerSide).toBe(FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE);
    expect(model.drivers.favourable.length).toBeLessThanOrEqual(3);
  });
});

describe("FIN-05D expected movement presentation", () => {
  it("ZERO_TIMING does not attach a chart model", () => {
    const model = buildFinanceOverviewDecisionIntelligenceReadModel({
      management: baseManagement(),
      timingOverview: {
        financeYearId: "y1",
        actualsThroughDateIso: "2026-06-30",
        referenceDateIso: "2026-06-30",
        currentForecast: {
          kind: "AVAILABLE",
          forecastId: "fc1",
          forecastVersionId: "fv1",
          versionNumber: 1,
          asOfDateIso: null,
          actualsThroughDateIso: "2026-06-30",
        },
        annual: {
          income: {
            annualForecastMinor: 100_00,
            actualThroughCutoffMinor: 0,
            remainingFutureExpectationMinor: 50_00,
            timedFutureExpectationMinor: 0,
            ambiguousTimingExpectationMinor: 0,
            unscheduledRemainderMinor: 50_00,
            overallocatedAmountMinor: 0,
            actualExceedsAnnualForecastAmountMinor: 0,
            futureTimedMovementMinor: 0,
          },
          expense: {
            annualForecastMinor: 80_00,
            actualThroughCutoffMinor: 0,
            remainingFutureExpectationMinor: 40_00,
            timedFutureExpectationMinor: 0,
            ambiguousTimingExpectationMinor: 0,
            unscheduledRemainderMinor: 40_00,
            overallocatedAmountMinor: 0,
            actualExceedsAnnualForecastAmountMinor: 0,
            futureTimedMovementMinor: 0,
          },
          resultMinor: 20_00,
          futureResultContextMinor: 10_00,
        },
        timingCoverage: { kind: "RATIO", remainingFutureExpectationMinor: 90_00, timedFutureExpectationMinor: 0, timedCoverageBasisPoints: 0, rawTimedCoverageBasisPoints: 0, isOverallocated: false },
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
        accounts: [],
        upcomingEvents: [],
      },
      visualModel: null,
      timingVisible: true,
      capabilities: {
        canOpenReports: true,
        canOpenBudget: true,
        canOpenForecast: true,
        canOpenTiming: true,
        canOpenActuals: true,
        canOpenStructure: true,
      },
    });
    expect(model.expectedMovement.availability).toBe("ZERO_TIMING");
    expect(model.expectedMovement.visualModel).toBeNull();
  });
});

describe("FIN-05D architecture", () => {
  it("locks interpretive overview boundaries", () => {
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.expectedMovementIsNotLiquidity).toBe(true);
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.noChartGallery).toBe(true);
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.noLlmNumericalEngine).toBe(true);
    expect(FINANCE_05D_IMPLEMENTATION.fin05eStatus).toBe("NOT_STARTED");
  });

  it("documents bounded query composition", () => {
    expect(FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE.perAccountQueryLoopForbidden).toBe(
      true,
    );
  });
});

describe("FIN-05D permission composition (loader)", () => {
  beforeEach(() => {
    vi.mocked(loadFinanceManagementOverviewReadModel).mockReset();
  });

  it("delegates to management overview loader", async () => {
    vi.mocked(loadFinanceManagementOverviewReadModel).mockResolvedValue(
      baseManagement({
        currentForecast: {
          availability: "NOT_VISIBLE",
          summary: null,
          currentForecastVersionId: null,
        },
        topFavourableDrivers: [],
        topUnfavourableDrivers: [],
      }),
    );

    const model = await loadFinanceOverviewDecisionIntelligenceReadModel({} as never, {
      tenantId: "t1",
      userId: "u1",
      permissionKeys: new Set([PERMISSIONS.FINANCE_BUDGET_VIEW]),
    }, {
      financeYearId: null,
      forecastingCapabilityEnabled: true,
      reportingCapabilityEnabled: true,
      canBudgetManage: false,
      canStructure: false,
    });

    expect(model.management.currentForecast.availability).toBe("NOT_VISIBLE");
    expect(model.expectedMovement.availability).toBe("NOT_VISIBLE");
    expect(model.drivers.favourable).toEqual([]);
  });
});
