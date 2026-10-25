import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FINANCE_COMPARATIVE_ATTENTION_MAX_INSIGHTS,
  buildFinanceComparativeAttentionInsights,
} from "@/lib/finance/reporting/build-finance-comparative-attention-insights";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import { presentFinanceComparativeAttentionInsight } from "@/lib/finance/presentation/finance-comparative-intelligence-presentation";

function basePnlInput(overrides: Record<string, unknown> = {}) {
  const accountId = "acc-income";
  return {
    tenantId: "tenant-a",
    financeYearId: "fy1",
    financeYearName: "FY2026",
    baseCurrency: "CHF",
    structureAvailability: "AVAILABLE" as const,
    actualCutoffDate: new Date("2026-10-25T12:00:00.000Z"),
    groups: [
      {
        id: "g1",
        tenantId: "tenant-a",
        name: "Income group",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    accounts: [
      {
        id: accountId,
        tenantId: "tenant-a",
        reportingGroupId: "g1",
        name: "Mitgliedsbeiträge",
        sortOrder: 0,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        canonicalSemantic: "INCOME" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "acc-expense",
        tenantId: "tenant-a",
        reportingGroupId: "g1",
        name: "Personal",
        sortOrder: 1,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        canonicalSemantic: "EXPENSE" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    approvedMeasure: {
      budgetVersionId: "bv1",
      valuesByAccountId: new Map([
        [accountId, 150_000_00],
        ["acc-expense", 80_000_00],
      ]),
    },
    actualMeasure: {
      grain: "YTD" as const,
      cutoffDate: new Date("2026-10-25T12:00:00.000Z"),
      valuesByAccountId: new Map([
        [accountId, 7_776_00],
        ["acc-expense", 40_000_00],
      ]),
    },
    forecastMeasure: {
      forecastVersionId: "fv1",
      valuesByAccountId: new Map([
        [accountId, 161_533_00],
        ["acc-expense", 90_000_00],
      ]),
    },
    sourceVisibility: {
      approvedBudget: true,
      actual: true,
      currentForecast: true,
    },
    ...overrides,
  };
}

const attentionLabels = {
  attentionResultFavorableTitle: "Ergebnis besser als geplant",
  attentionResultFavorableDetail: "Die aktuelle Prognose liegt {amount} über dem genehmigten Budget.",
  attentionResultUnfavorableTitle: "Ergebnis unter Plan",
  attentionResultUnfavorableDetail: "Die aktuelle Prognose liegt {amount} unter dem genehmigten Budget.",
  attentionResultOnPlanTitle: "Im Plan",
  attentionLargestFavorableTitle: "Grösste positive Abweichung",
  attentionLargestUnfavorableTitle: "Grösste negative Abweichung",
  attentionDriverExpenseSuffix: "Ausgaben",
  attentionMissingBudget: "Missing budget",
  attentionMissingForecast: "Missing forecast",
};

describe("FIN-05F R1 decision-oriented attention", () => {
  it("A — caps attention insights at three concrete items", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    expect(pnl.comparativeIntelligence.attentionInsights.length).toBeLessThanOrEqual(
      FINANCE_COMPARATIVE_ATTENTION_MAX_INSIGHTS,
    );
    expect(pnl.comparativeIntelligence.attentionInsights.length).toBe(3);
  });

  it("B — overall conclusion uses forecast-vs-budget favorability", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    const overall = pnl.comparativeIntelligence.attentionInsights.find(
      (i) => i.kind === "OVERALL_RESULT",
    );
    expect(overall?.kind).toBe("OVERALL_RESULT");
    if (overall?.kind === "OVERALL_RESULT") {
      expect(overall.favorability).toBe(
        pnl.managementResult.forecastVsBudget.favorability,
      );
    }
  });

  it("C/D — largest favourable and unfavourable drivers reuse FIN-05B ranking", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    const fav = pnl.comparativeIntelligence.attentionInsights.find(
      (i) => i.kind === "FAVORABLE_DRIVER",
    );
    const unfav = pnl.comparativeIntelligence.attentionInsights.find(
      (i) => i.kind === "UNFAVORABLE_DRIVER",
    );
    expect(fav?.kind).toBe("FAVORABLE_DRIVER");
    expect(unfav?.kind).toBe("UNFAVORABLE_DRIVER");
    if (fav?.kind === "FAVORABLE_DRIVER") {
      expect(fav.driver.id).toBe(pnl.topFavourableDrivers[0]?.id);
    }
    if (unfav?.kind === "UNFAVORABLE_DRIVER") {
      expect(unfav.driver.id).toBe(pnl.topUnfavourableDrivers[0]?.id);
    }
  });

  it("E — no filler driver insights when ranking is empty", () => {
    const pnl = buildFinanceManagementPnlReadModel(
      basePnlInput({
        approvedMeasure: {
          budgetVersionId: "bv1",
          valuesByAccountId: new Map([
            ["acc-income", 100_00],
            ["acc-expense", 100_00],
          ]),
        },
        forecastMeasure: {
          forecastVersionId: "fv1",
          valuesByAccountId: new Map([
            ["acc-income", 100_00],
            ["acc-expense", 100_00],
          ]),
        },
      }),
    );
    expect(
      pnl.comparativeIntelligence.attentionInsights.some(
        (i) => i.kind === "FAVORABLE_DRIVER" || i.kind === "UNFAVORABLE_DRIVER",
      ),
    ).toBe(false);
  });

  it("F/G — meta tenant-facing signals are not part of the read model", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    expect(panel).not.toContain("signalMaterialFavorableDrivers");
    expect(panel).not.toContain("signalRecordedActualEvidence");
    const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
    expect(de).not.toContain("siehe Ausnahmen unten");
    expect(de).not.toContain("Fortschrittsbelege");
  });

  it("H — standalone Wesentliche Abweichungen block removed from panel", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    expect(panel).not.toContain("data-finance-pnl-exceptions");
  });

  it("I — driver insight retains FIN-05E investigate hook", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain('data-finance-pnl-investigate="driver"');
    expect(panel).toContain("onInvestigateDriver");
  });

  it("J/K — summary actual label uses canonical cutoff for YTD, not Fortschritt", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("actualColumnLabel");
    expect(panel).not.toContain("actualEvidenceTitle");
    const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
    expect(de).not.toContain("Ist (Fortschritt)");
  });

  it("L/M — investigation sheet maps annual vs YTD actual grain labels", () => {
    const sheet = readFileSync(
      join(
        process.cwd(),
        "components/admin/finance/reporting/FinanceManagementReportingDetailSheet.tsx",
      ),
      "utf8",
    );
    expect(sheet).toContain('detail.actualGrain === "YTD"');
    expect(sheet).toContain("actualGrainAnnual");
    expect(sheet).toContain('detail.actualGrain === "ANNUAL_FULL_YEAR"');
  });

  it("N — attention builder does not use Date.now", () => {
    const builder = readFileSync(
      join(process.cwd(), "lib/finance/reporting/build-finance-comparative-attention-insights.ts"),
      "utf8",
    );
    expect(builder).not.toContain("Date.now");
  });

  it("R — DE presentation strings are natural for overall conclusion", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    const overall = pnl.comparativeIntelligence.attentionInsights.find(
      (i) => i.kind === "OVERALL_RESULT",
    );
    expect(overall).toBeTruthy();
    const copy = presentFinanceComparativeAttentionInsight(
      overall!,
      attentionLabels,
      "CHF",
      "de-CH",
    );
    expect(copy.title).toBe("Ergebnis besser als geplant");
    expect(copy.detail).toMatch(/über dem genehmigten Budget/);
  });

  it("partial sources surface missing budget insight only", () => {
    const insights = buildFinanceComparativeAttentionInsights({
      managementResult: {
        approvedBudget: { availability: "NO_APPROVED_BUDGET", amountMinor: null },
        currentForecast: { availability: "AVAILABLE", amountMinor: 1 },
        actual: { availability: "AVAILABLE", amountMinor: 0 },
        forecastVsBudget: {
          availability: "BASELINE_MISSING",
          baselineMinor: null,
          comparisonMinor: null,
          rawDeltaMinor: null,
          variancePercent: null,
          favorability: null,
          absoluteVarianceMagnitudeMinor: null,
        },
      },
      topFavourableDrivers: [],
      topUnfavourableDrivers: [],
      approvedBudget: { availability: "NO_APPROVED_BUDGET" },
      currentForecast: { availability: "AVAILABLE", currentForecastVersionId: "fv1" },
    });
    expect(insights).toEqual([{ kind: "MISSING_APPROVED_BUDGET" }]);
  });
});
