import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatFinanceManagementMoneyMinor,
  roundAmountMinorToWholeMajorPresentation,
} from "@/lib/finance/presentation/finance-money-presentation";
import {
  buildForecastEvolutionChartPoints,
  selectMeaningfulForecastChangeDrivers,
} from "@/lib/finance/forecast/forecast-evolution-presentation";
import type { FinanceForecastHistoryEntry } from "@/lib/finance/forecast/forecast-history-read-model";
import { buildProjectionWorkspaceDashboard } from "@/lib/finance/projection/projection-workspace-dashboard";
import type { ProjectionWorkspaceAccountViewModel } from "@/lib/finance/projection/projection-workspace-presentation";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastWorkspacePanel.tsx"),
  "utf8",
);
const rolling = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
  "utf8",
);
const evolutionChart = readFileSync(
  join(
    process.cwd(),
    "components/admin/finance/forecast/FinanceForecastEvolutionChart.tsx",
  ),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

function historyEntry(partial: Partial<FinanceForecastHistoryEntry> & Pick<FinanceForecastHistoryEntry, "forecastVersionId">): FinanceForecastHistoryEntry {
  return {
    versionNumber: 1,
    status: "CURRENT",
    isCurrent: false,
    isHistorical: true,
    revisionSource: null,
    revisionLabel: null,
    asOfDate: null,
    actualsThroughDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: null,
    actor: null,
    previousVersionId: null,
    sourceProjectionVersionId: null,
    lineCount: 1,
    totalIncomeMinor: 100_000_00,
    totalExpenseMinor: 40_000_00,
    resultMinor: 60_000_00,
    presentation: {
      displayTitle: "Initiale Prognose",
      displaySubtitle: null,
      revisionSourceLabel: null,
    },
    ...partial,
  };
}

describe("FIN-04C-05R2 visual intelligence", () => {
  describe("whole currency presentation", () => {
    it("rounds CHF management display to whole units without fractional suffix", () => {
      const minor = 286_327_04;
      const rounded = roundAmountMinorToWholeMajorPresentation(minor, "CHF");
      expect(rounded).toBe(286_327_00);
      const display = formatFinanceManagementMoneyMinor(minor, "CHF", "de-CH");
      expect(display).not.toMatch(/[.,]\d{2}\s/);
      expect(display).toContain("286");
    });

    it("forecast workspace uses canonical management formatters", () => {
      expect(panel).toContain("formatFinanceManagementPlanningMinor");
      expect(rolling).toContain("formatFinanceManagementPlanningMinor");
      expect(rolling).toContain("formatFinanceManagementPlanningSignedMinor");
      expect(panel).not.toContain("formatBudgetPlanningMinor");
    });

    it("keeps internal amountMinor precision unchanged when formatting", () => {
      const minor = 101_161_04;
      expect(roundAmountMinorToWholeMajorPresentation(minor, "CHF")).not.toBe(minor);
      expect(minor).toBe(101_161_04);
    });
  });

  describe("forecast evolution", () => {
    it("uses stored history revisions in chronological order", () => {
      const chronological = [
        historyEntry({
          forecastVersionId: "v1",
          versionNumber: 1,
          resultMinor: 150_000_00,
          presentation: { displayTitle: "Initiale Prognose", displaySubtitle: null, revisionSourceLabel: null },
        }),
        historyEntry({
          forecastVersionId: "v2",
          versionNumber: 2,
          isCurrent: true,
          resultMinor: 185_166_00,
          presentation: { displayTitle: "Q3 Review", displaySubtitle: null, revisionSourceLabel: null },
        }),
      ];
      const points = buildForecastEvolutionChartPoints(chronological);
      expect(points).toHaveLength(2);
      expect(points[0]!.resultMinor).toBe(150_000_00);
      expect(points[1]!.isCurrent).toBe(true);
    });

    it("does not fabricate dates for legacy revisions", () => {
      const points = buildForecastEvolutionChartPoints([
        historyEntry({ forecastVersionId: "legacy", asOfDate: null }),
      ]);
      expect(points[0]!.asOfDate).toBeNull();
    });

    it("renders evolution chart from history read model without second query", () => {
      expect(rolling).toContain("entriesChronological");
      expect(rolling).toContain("FinanceForecastEvolutionChart");
      expect(evolutionChart).toContain('data-finance-surface="prognoseentwicklung"');
      expect(de).toContain('"evolutionTitle": "Prognoseentwicklung"');
    });

    it("avoids raw enum leakage in rolling UX", () => {
      expect(rolling).not.toContain("MANUAL_REFORECAST");
      expect(rolling).not.toContain("SUPERSEDED");
    });
  });

  describe("change drivers", () => {
    it("selects non-zero largest drivers only", () => {
      const rows = [
        { financialAccountId: "a", deltaMinor: 0 },
        { financialAccountId: "b", deltaMinor: 61_327_00 },
        { financialAccountId: "c", deltaMinor: -2_000_00 },
      ];
      const drivers = selectMeaningfulForecastChangeDrivers(rows, 5);
      expect(drivers.map((r) => r.financialAccountId)).toEqual(["b", "c"]);
    });

    it("unifies change since previous section with driver bars", () => {
      expect(rolling).toContain('data-finance-surface="change-since-previous"');
      expect(rolling).toContain("FinanceForecastChangeDriverBars");
      expect(de).toContain("Veränderung seit letzter Prognose");
    });

    it("uses mathematical signed deltas without favorability in driver chart", () => {
      expect(rolling).toContain("formatFinanceManagementPlanningSignedMinor");
      expect(rolling).not.toContain("favorabilityFavorable");
    });
  });

  describe("duplicate summary removal", () => {
    it("does not render standalone summary strip when rolling UX provides totals", () => {
      expect(panel).toContain("currentTotals={displayTotals}");
      expect(panel).toMatch(/!rollingUx \? \([\s\S]*ForecastSummarySection/);
    });
  });

  describe("automatic forecast zero differences", () => {
    it("returns empty divergence array when all account deltas are zero", () => {
      const accounts: ProjectionWorkspaceAccountViewModel[] = [
        {
          accountId: "1",
          accountName: "Mitgliedsbeiträge",
          semantic: "INCOME",
          lifecycle: "ACTIVE",
          projectedAmountMinor: 100_000_00,
          forecastAmountMinor: 100_000_00,
          deltaMinor: 0,
          knownActualAmountMinor: 0,
          dataSufficiency: "SUFFICIENT",
          dataSufficiencyLabel: "Ausreichend",
          confidence: "MEDIUM",
          confidenceLabel: "Mittel",
          methodologyFamily: "LINEAR",
          methodologyLabel: "Linear",
          noProjectionLabel: null,
          explainability: null,
          explainabilityDetail: null,
        },
      ];
      const dashboard = buildProjectionWorkspaceDashboard({
        accounts,
        coverage: {
          projectedAccountCount: 1,
          eligibleAccountCount: 1,
          missingProjectionCount: 0,
          coverageStatus: "FULL",
          income: {
            complete: true,
            projectedTotalMinor: 100_000_00,
            consideredCount: 1,
            projectedCount: 1,
          },
          expense: {
            complete: true,
            projectedTotalMinor: 0,
            consideredCount: 0,
            projectedCount: 0,
          },
          result: { minor: 100_000_00, complete: true },
        },
        budgetTotals: null,
      });
      expect(dashboard.divergence).toEqual([]);
    });
  });

  describe("waterfall decision", () => {
    it("documents horizontal driver visualization instead of waterfall dependency", () => {
      const doc = readFileSync(
        join(process.cwd(), "docs/finance/SCE-FINANCE-04C-05R2-VISUAL-INTELLIGENCE.md"),
        "utf8",
      );
      expect(doc.toLowerCase()).toContain("waterfall");
      expect(rolling).toContain("FinanceForecastChangeDriverBars");
    });
  });
});
