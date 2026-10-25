import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFinanceOverviewEventTimelineModel,
  resolveFinanceOverviewEventTimelinePresentationWindow,
} from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import { FINANCE_COMPARATIVE_ATTENTION_DRIVERS_GRID_CLASS } from "@/lib/finance/presentation/finance-comparative-attention-layout";

const pnlPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
  "utf8",
);
const overviewPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
  "utf8",
);
const detailSheet = readFileSync(
  join(process.cwd(), "components/admin/finance/reporting/FinanceManagementReportingDetailSheet.tsx"),
  "utf8",
);
const comparativeSummary = readFileSync(
  join(process.cwd(), "lib/finance/presentation/finance-comparative-summary-section.tsx"),
  "utf8",
);
const reportsPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/reports/page.tsx"),
  "utf8",
);

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

describe("FIN-05G visual intelligence & responsive hardening", () => {
  it("A — reporting hierarchy: comparative summary before attention before P&L", () => {
    const interpretationIndex = pnlPanel.indexOf("FinanceComparativeSummarySection");
    const attentionIndex = pnlPanel.indexOf("data-finance-comparative-attention");
    const statementIndex = pnlPanel.indexOf("data-finance-pnl-statement");
    expect(interpretationIndex).toBeGreaterThan(-1);
    expect(attentionIndex).toBeGreaterThan(interpretationIndex);
    expect(statementIndex).toBeGreaterThan(attentionIndex);
  });

  it("B — comparative summary semantics labels preserved", () => {
    expect(comparativeSummary).toContain("budgetedResultLabel");
    expect(comparativeSummary).toContain("expectedResultLabel");
    expect(comparativeSummary).toContain("varianceLabel");
    expect(comparativeSummary).toContain("actualEvidenceLabel");
    expect(comparativeSummary).toContain("data-finance-comparative-primary-variance");
  });

  it("C/D — attention max-three model; no duplicate driver section", () => {
    expect(pnlPanel).toContain("ComparativeAttentionInsights");
    expect(pnlPanel).not.toContain("data-finance-pnl-exceptions");
    expect(pnlPanel).not.toMatch(/Wesentliche Abweichungen/);
    expect(pnlPanel).toContain("data-finance-comparative-attention-drivers");
  });

  it("E — management P&L columns preserved", () => {
    for (const col of ["columnBudget", "columnActual", "columnForecast", "columnVariance"]) {
      expect(pnlPanel).toContain(col);
    }
    expect(pnlPanel).toContain("hidden md:table-cell");
  });

  it("F — favourability text remains alongside variance (non-color-only)", () => {
    expect(pnlPanel).toContain("financeVarianceComparisonSemanticTextClass");
    expect(pnlPanel).toContain("favorabilityText");
    expect(pnlPanel).toContain("data-finance-variance-favorability");
  });

  it("G — investigation sheet semantics preserved", () => {
    expect(detailSheet).toContain("data-finance-reporting-detail-interpretation");
    expect(detailSheet).toContain("data-finance-reporting-detail-summary");
    expect(detailSheet).not.toContain("fixture");
  });

  it("H — event timeline remains discrete events (not line chart)", () => {
    const timeline = readFileSync(
      join(
        process.cwd(),
        "components/admin/finance/overview/FinanceOverviewExpectedEventTimeline.tsx",
      ),
      "utf8",
    );
    expect(timeline).not.toMatch(/recharts|LineChart|area chart/i);
    expect(timeline).toContain("data-finance-overview-timeline-event");
  });

  it("I/J — no fake phasing or liquidity semantics in 05G presentation modules", () => {
    const moneyTypography = readFileSync(
      join(process.cwd(), "lib/finance/presentation/finance-money-typography.ts"),
      "utf8",
    );
    expect(moneyTypography).not.toMatch(/liquidity|cash balance/i);
    expect(moneyTypography).not.toMatch(/monthly phasing/i);
  });

  it("K — no new financial source calculations in comparative summary UI", () => {
    expect(comparativeSummary).not.toContain("buildFinance");
    expect(comparativeSummary).not.toContain("computeSemanticVariance");
  });

  it("L — page-level horizontal overflow contract markers", () => {
    expect(pnlPanel).toContain("data-finance-responsive-root");
    expect(pnlPanel).toContain("overflow-x-hidden");
    expect(overviewPanel).toContain("data-finance-responsive-root");
  });

  it("M — mobile progressive disclosure for P&L measures", () => {
    expect(pnlPanel).toContain("data-finance-pnl-mobile-measure");
    expect(pnlPanel).toContain("md:hidden");
  });

  it("N — DE/EN keys unchanged for comparative copy", () => {
    const en = readFileSync(join(process.cwd(), "messages/en.json"), "utf8");
    const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
    expect(en).toContain('"budgetedResult"');
    expect(de).toContain('"budgetedResult"');
  });

  it("O — no hardcoded currency in 05G presentation primitives", () => {
    expect(comparativeSummary).not.toMatch(/\bCHF\b/);
    expect(pnlPanel).not.toMatch(/"CHF"/);
  });

  it("P/Q — no generic BI route; reports workspace intact", () => {
    expect(reportsPage).toContain("FinanceReportingInvestigationWorkspace");
    expect(reportsPage).not.toMatch(/\/dashboard\/finance\/bi/);
  });

  it("R — design system surface classes reused", () => {
    expect(comparativeSummary).toContain("FINANCE_SUMMARY_STRIP_SURFACE_CLASS");
    expect(pnlPanel).toContain("FINANCE_MANAGEMENT_PNL_TABLE_SURFACE_CLASS");
  });

  it("attention driver grid uses bounded width layout token", () => {
    expect(pnlPanel).toContain("FINANCE_COMPARATIVE_ATTENTION_DRIVERS_GRID_CLASS");
    expect(FINANCE_COMPARATIVE_ATTENTION_DRIVERS_GRID_CLASS).toContain("max-w-2xl");
  });

  it("timeline presentation window trims long empty lead without changing event kinds", () => {
    const visual = baseVisual([
      marker({
        eventId: "e1",
        interval: { kind: "EXACT_DATE", startDateIso: "2027-01-15", endDateIso: "2027-01-15" },
      }),
    ]);
    const resolved = resolveFinanceOverviewEventTimelinePresentationWindow(visual);
    expect(resolved.trimmedLeadingWindow).toBe(true);
    expect(resolved.startDateIso > visual.window.startDateIso).toBe(true);
    const model = buildFinanceOverviewEventTimelineModel(visual);
    expect(model.entries[0]?.visualKind).toBe("EXACT_DATE");
    expect(model.entries[0]?.xStartFraction).toBeGreaterThan(0.05);
  });
});
