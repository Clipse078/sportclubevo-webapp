import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assignFinanceOverviewEventTimelineLanes,
  FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES,
} from "@/lib/finance/presentation/assign-finance-overview-event-timeline-lanes";
import { buildFinanceOverviewEventTimelineAxis } from "@/lib/finance/presentation/finance-overview-event-timeline-axis";
import { buildFinanceOverviewEventTimelineModel } from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";
import { formatFinanceOverviewEventTimelineWhenLabel } from "@/lib/finance/presentation/format-finance-overview-event-timeline-labels";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import {
  SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE,
  SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import { FINANCE_OVERVIEW_EVENT_TIMELINE_CANVAS_HEIGHT_PX } from "@/components/admin/finance/overview/FinanceOverviewExpectedEventTimeline";

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
  windowPartial?: Partial<FinanceForecastTimingVisualModel["window"]>,
): FinanceForecastTimingVisualModel {
  return {
    window: {
      startDateIso: "2026-11-01",
      endDateIso: "2027-03-31",
      financeYearStartDateIso: "2026-07-01",
      financeYearEndDateIso: "2027-06-30",
      actualsThroughDateIso: "2026-10-24",
      ...windowPartial,
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

describe("FIN-05D-R2 event timeline model", () => {
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

describe("FIN-05D-R2 axis", () => {
  it("edge-aligns first and last ticks and avoids per-month year noise", () => {
    const axis = buildFinanceOverviewEventTimelineAxis({
      windowStartDateIso: "2026-11-01",
      windowEndDateIso: "2027-03-31",
      financeYearStartDateIso: "2026-07-01",
      financeYearEndDateIso: "2027-06-30",
    });
    expect(axis.ticks.length).toBeGreaterThanOrEqual(4);
    expect(axis.ticks[0]?.alignment).toBe("start");
    expect(axis.ticks[axis.ticks.length - 1]?.alignment).toBe("end");
    expect(axis.ticks.every((t) => t.xFraction >= 0 && t.xFraction <= 1)).toBe(true);
    expect(axis.yearBands.map((b) => b.label)).toEqual(["2026", "2027"]);
  });

  it("respects configured fiscal boundary inside the window", () => {
    const axis = buildFinanceOverviewEventTimelineAxis({
      windowStartDateIso: "2027-04-01",
      windowEndDateIso: "2027-08-31",
      financeYearStartDateIso: "2026-07-01",
      financeYearEndDateIso: "2027-06-30",
    });
    expect(axis.financeYearEndFraction).not.toBeNull();
    expect(axis.yearBands.length).toBe(2);
  });
});

describe("FIN-05D-R2 collision layout", () => {
  function assertNoLaneOverlap(
    layout: ReturnType<typeof assignFinanceOverviewEventTimelineLanes>,
  ) {
    for (let lane = 0; lane < FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES; lane++) {
      const inLane = layout.assignments.filter((a) => a.laneIndex === lane);
      for (let i = 0; i < inLane.length; i++) {
        for (let j = i + 1; j < inLane.length; j++) {
          const a = inLane[i]!.labelSpan;
          const b = inLane[j]!.labelSpan;
          expect(a.left < b.right && b.left < a.right).toBe(false);
        }
      }
    }
  }

  it("separates 31 Dec exact expense and January month income into distinct lanes", () => {
    const visual = baseVisual([
      marker({
        eventId: "dec-expense",
        accountName: "Betrieb",
        accountType: "EXPENSE",
        expectedAmountMinor: 3_000_00,
        interval: {
          kind: "EXACT_DATE",
          startDateIso: "2026-12-31",
          endDateIso: "2026-12-31",
          plotAnchorDateIso: "2026-12-31",
        },
      }),
      marker({
        eventId: "jan-income",
        accountName: "Mitgliedsbeiträge",
        accountType: "INCOME",
        expectedAmountMinor: 30_000_00,
        timingPrecision: "MONTH",
        interval: {
          kind: "MONTH",
          startDateIso: "2027-01-01",
          endDateIso: "2027-01-31",
          plotAnchorDateIso: "2027-01-15",
        },
      }),
    ]);
    const model = buildFinanceOverviewEventTimelineModel(visual);
    assertNoLaneOverlap(model.laneLayout);
    const decLane = model.laneLayout.assignments.find((a) => a.eventId === "dec-expense")?.laneIndex;
    const janLane = model.laneLayout.assignments.find((a) => a.eventId === "jan-income")?.laneIndex;
    expect(decLane).toBeDefined();
    expect(janLane).toBeDefined();
    expect(decLane).not.toBe(janLane);
    expect(model.laneLayout.collapsedEventIds).toEqual([]);
  });

  it("assigns deterministically with at most two lanes", () => {
    const entries = [
      {
        eventId: "a",
        sortKeyIso: "2026-11-01",
        startDateIso: "2026-11-01",
        endDateIso: "2026-11-01",
        visualKind: "EXACT_DATE" as const,
        direction: "INCOME" as const,
        amountMinor: 1,
        accountName: "A",
        materialityFraction: 1,
        xStartFraction: 0.05,
        xEndFraction: 0.05,
        isAfterFinanceYearEnd: false,
      },
      {
        eventId: "b",
        sortKeyIso: "2026-11-03",
        startDateIso: "2026-11-03",
        endDateIso: "2026-11-03",
        visualKind: "EXACT_DATE" as const,
        direction: "INCOME" as const,
        amountMinor: 1,
        accountName: "B",
        materialityFraction: 0.8,
        xStartFraction: 0.06,
        xEndFraction: 0.06,
        isAfterFinanceYearEnd: false,
      },
    ];
    const first = assignFinanceOverviewEventTimelineLanes({
      entries,
      materialityByEventId: { a: 1, b: 0.8 },
    });
    const second = assignFinanceOverviewEventTimelineLanes({
      entries,
      materialityByEventId: { a: 1, b: 0.8 },
    });
    expect(first).toEqual(second);
    expect(first.assignments.every((a) => a.laneIndex < FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES)).toBe(
      true,
    );
  });
});

describe("FIN-05D-R2 interval labels", () => {
  it("keeps month and range bounded without fake exact dates", () => {
    const monthEntry = {
      eventId: "m",
      sortKeyIso: "2027-01-01",
      startDateIso: "2027-01-01",
      endDateIso: "2027-01-31",
      visualKind: "MONTH" as const,
      direction: "INCOME" as const,
      amountMinor: 1,
      accountName: "X",
      materialityFraction: 1,
      xStartFraction: 0.5,
      xEndFraction: 0.7,
      isAfterFinanceYearEnd: false,
    };
    const rangeLabel = formatFinanceOverviewEventTimelineWhenLabel(
      {
        ...monthEntry,
        visualKind: "DATE_RANGE",
        startDateIso: "2027-03-01",
        endDateIso: "2027-03-31",
      },
      "de-CH",
    );
    expect(rangeLabel).toMatch(/Mär/i);
    expect(rangeLabel).not.toContain("2027-03-01");
    const monthLabel = formatFinanceOverviewEventTimelineWhenLabel(monthEntry, "de-CH");
    expect(monthLabel.toLowerCase()).toMatch(/jan/);
  });
});

describe("FIN-05D-R2 footer and density", () => {
  it("does not repeat untimed total headline in overview panel footer", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain('data-finance-untimed-context');
    expect(panel).not.toMatch(
      /untimedFooterTitle[\s\S]{0,120}formatFinanceManagementMoneyMinor\(\s*\n?\s*expectedMovement\.untimedRemainderMinor/,
    );
  });

  it("targets compact timeline canvas height", () => {
    expect(FINANCE_OVERVIEW_EVENT_TIMELINE_CANVAS_HEIGHT_PX).toBeGreaterThanOrEqual(180);
    expect(FINANCE_OVERVIEW_EVENT_TIMELINE_CANVAS_HEIGHT_PX).toBeLessThanOrEqual(210);
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
