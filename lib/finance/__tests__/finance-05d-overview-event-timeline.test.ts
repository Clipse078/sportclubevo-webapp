import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFinanceOverviewEventTimelineModel } from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import {
  SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE,
  SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";

function marker(
  partial: Partial<FinanceForecastTimingVisualModel["markers"][number]> &
    Pick<FinanceForecastTimingVisualModel["markers"][number], "eventId" | "interval">,
): FinanceForecastTimingVisualModel["markers"][number] {
  return {
    financialAccountId: "acc1",
    accountName: partial.accountName ?? "Account",
    accountType: partial.accountType ?? "INCOME",
    expectedAmountMinor: partial.expectedAmountMinor ?? 10_000_00,
    timingPrecision: partial.timingPrecision ?? "EXACT_DATE",
    temporalPositionAtCutoff: "FUTURE",
    isAfterFinanceYearEnd: false,
    materialityFraction: 0.5,
    description: null,
    isManual: false,
    ...partial,
  };
}

function baseVisual(
  markers: FinanceForecastTimingVisualModel["markers"],
): FinanceForecastTimingVisualModel {
  return {
    window: {
      startDateIso: "2026-11-01",
      endDateIso: "2027-03-31",
      financeYearStartDateIso: "2026-07-01",
      financeYearEndDateIso: "2027-06-30",
      actualsThroughDateIso: "2026-10-24",
    },
    markers,
    untimed: { incomeMinor: 0, expenseMinor: 0, totalMinor: 0 },
    timingCoverage: {
      kind: "RATIO",
      remainingFutureExpectationMinor: 100_000_00,
      timedFutureExpectationMinor: 50_000_00,
      timedCoverageBasisPoints: 5000,
      rawTimedCoverageBasisPoints: 5000,
      isOverallocated: false,
    },
    interpretationState: "PARTIALLY_SCHEDULED",
    remainingFutureExpectationMinor: 100_000_00,
    timedFutureExpectationMinor: 50_000_00,
    isOverallocated: false,
    hasRemainingExpectation: true,
    workspacePresentationState: "PARTIAL_TIMING",
    structuredSummary: {
      futureTimedEventCount: markers.length,
      ambiguousEventCount: 0,
      incomeTimedMinor: 0,
      expenseTimedMinor: 0,
      untimedTotalMinor: 0,
      isOverallocated: false,
    },
    overviewAnnual: {} as FinanceForecastTimingVisualModel["overviewAnnual"],
  };
}

describe("FIN-05D-R1 event timeline model", () => {
  it("orders entries chronologically and preserves precision kinds", () => {
    const visual = baseVisual([
      marker({
        eventId: "e2",
        accountName: "March",
        interval: {
          kind: "MONTH",
          startDateIso: "2027-03-01",
          endDateIso: "2027-03-31",
          plotAnchorDateIso: "2027-03-15",
        },
        timingPrecision: "MONTH",
      }),
      marker({
        eventId: "e1",
        accountName: "November",
        interval: {
          kind: "EXACT_DATE",
          startDateIso: "2026-11-15",
          endDateIso: "2026-11-15",
          plotAnchorDateIso: "2026-11-15",
        },
      }),
      marker({
        eventId: "e3",
        accountName: "Range",
        interval: {
          kind: "DATE_RANGE",
          startDateIso: "2027-01-01",
          endDateIso: "2027-01-31",
          plotAnchorDateIso: "2027-01-15",
        },
        timingPrecision: "DATE_RANGE",
      }),
    ]);

    const model = buildFinanceOverviewEventTimelineModel(visual);
    expect(model.entries.map((e) => e.eventId)).toEqual(["e1", "e3", "e2"]);
    expect(model.entries[0]?.visualKind).toBe("EXACT_DATE");
    expect(model.entries[1]?.visualKind).toBe("DATE_RANGE");
    expect(model.entries[2]?.visualKind).toBe("MONTH");
    expect(model.entries[0]?.startDateIso).toBe("2026-11-15");
  });

  it("does not encode amount as interval width inflation beyond real dates", () => {
    const small = baseVisual([
      marker({
        eventId: "small",
        expectedAmountMinor: 1_000_00,
        interval: {
          kind: "EXACT_DATE",
          startDateIso: "2026-12-01",
          endDateIso: "2026-12-01",
          plotAnchorDateIso: "2026-12-01",
        },
      }),
    ]);
    const large = baseVisual([
      marker({
        eventId: "large",
        expectedAmountMinor: 600_000_00,
        interval: {
          kind: "EXACT_DATE",
          startDateIso: "2026-12-01",
          endDateIso: "2026-12-01",
          plotAnchorDateIso: "2026-12-01",
        },
      }),
    ]);
    const smallModel = buildFinanceOverviewEventTimelineModel(small);
    const largeModel = buildFinanceOverviewEventTimelineModel(large);
    expect(smallModel.entries[0]?.xStartFraction).toBe(largeModel.entries[0]?.xStartFraction);
    expect(smallModel.entries[0]?.xEndFraction).toBe(largeModel.entries[0]?.xEndFraction);
  });
});

describe("FIN-05D-R1 attention and architecture", () => {
  it("does not apply a universal 30% untimed materiality threshold", () => {
    const overviewPanel = readFileSync(
      join(process.cwd(), "lib/finance/reporting/build-finance-overview-decision-intelligence-read-model.ts"),
      "utf8",
    );
    expect(overviewPanel).not.toContain("3_000");
    expect(overviewPanel).not.toContain("10_000 >= remaining");
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.noUniversalUntimedPercentMaterialityRule).toBe(
      true,
    );
  });

  it("documents FIN-09 liquidity line without implementing it", () => {
    expect(SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE.implementedInFin05d).toBe(false);
    expect(SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE.expectedEventTimelineIsNotLiquidity).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.lineChartReservedForContinuousBalanceFin09).toBe(
      true,
    );
  });
});

describe("FIN-05D-R1 translation surface", () => {
  it("resolves favourability via actuals keys on the finance overview page", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/finance/page.tsx"),
      "utf8",
    );
    expect(page).toContain('t("actuals.favorabilityFavorable")');
    expect(page).not.toContain('t("reporting.pnl.favorabilityFavorable")');
  });

  it("does not render raw Finance.reporting translation key paths in overview panel", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
      "utf8",
    );
    expect(panel).not.toContain("Finance.reporting");
    expect(panel).not.toMatch(/Finance\.reporting\.pnl/);
  });
});
