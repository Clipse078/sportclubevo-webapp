import { describe, expect, it } from "vitest";
import {
  buildProjectionExplainabilityNarrative,
  buildProjectionAccountExplainabilityDetail,
  projectionInsufficientDataExplanation,
} from "@/lib/finance/projection/projection-workspace-explainability";
import {
  buildProjectionWorkspaceDashboard,
  type ProjectionWorkspaceDashboardViewModel,
} from "@/lib/finance/projection/projection-workspace-dashboard";
import { computeProjectionAggregateCoverage } from "@/lib/finance/projection/projection-workspace-coverage";
import { buildProjectionWorkspaceViewModel } from "@/lib/finance/projection/projection-workspace-presentation";

function sampleAccount(overrides: Partial<{
  accountId: string;
  accountName: string;
  semantic: "INCOME" | "EXPENSE";
  projectedAmountMinor: number | null;
  forecastAmountMinor: number | null;
  knownActualAmountMinor: number;
  deltaMinor: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}>) {
  return {
    accountId: "a1",
    accountName: "Mitgliedsbeiträge",
    semantic: "INCOME" as const,
    lifecycle: "ACTIVE" as const,
    projectedAmountMinor: 200_000_00,
    forecastAmountMinor: 180_000_00,
    deltaMinor: 20_000_00,
    knownActualAmountMinor: 90_000_00,
    dataSufficiency: "SUFFICIENT" as const,
    dataSufficiencyLabel: "Gute Datengrundlage",
    confidence: "MEDIUM" as const,
    confidenceLabel: "Mittlere Prognosesicherheit",
    methodologyFamily: "HISTORICAL_PATTERN" as const,
    methodologyLabel: "Historischer Verlauf",
    noProjectionLabel: null,
    explainability: null,
    explainabilityDetail: null,
    ...overrides,
  };
}

describe("FIN-04B-05R1 first-use coverage", () => {
  it("does not expose dashboard or fake coverage before generation", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Saison 2026/27",
      version: null,
      staleness: null,
      lines: [],
      forecastAmountByAccountId: new Map(),
      coverageAccounts: [
        { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: null },
      ],
      accountNameById: new Map([["a1", "Konto A"]]),
      explainabilityByAccountId: new Map(),
      explainabilityDetailByAccountId: new Map(),
      budgetTotals: null,
    });
    expect(vm.presentationState).toBe("NO_PROJECTION");
    expect(vm.dashboard).toBeNull();
    expect(vm.coverage.projectedAccountCount).toBe(0);
  });
});

describe("FIN-04B-05R1 outlook comparison", () => {
  it("builds actual, forecast, and SCE series without favorability", () => {
    const coverage = computeProjectionAggregateCoverage([
      { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 200_000_00 },
      { accountId: "e1", semantic: "EXPENSE", lifecycle: "ACTIVE", projectedAmountMinor: 80_000_00 },
    ]);
    const dashboard = buildProjectionWorkspaceDashboard({
      coverage,
      budgetTotals: { incomeMinor: 190_000_00, expenseMinor: 70_000_00, resultMinor: 120_000_00 },
      accounts: [
        sampleAccount({
          accountId: "a1",
          knownActualAmountMinor: 50_000_00,
          forecastAmountMinor: 180_000_00,
          projectedAmountMinor: 200_000_00,
        }),
        sampleAccount({
          accountId: "e1",
          accountName: "Betrieb",
          semantic: "EXPENSE",
          projectedAmountMinor: 80_000_00,
          forecastAmountMinor: 75_000_00,
          knownActualAmountMinor: 30_000_00,
          deltaMinor: 5_000_00,
        }),
      ],
    });
    const income = dashboard.outlook.find((r) => r.metric === "INCOME");
    expect(income?.actualMinor).toBe(50_000_00);
    expect(income?.forecastMinor).toBe(180_000_00);
    expect(income?.projectionMinor).toBe(200_000_00);
    expect(income?.budgetMinor).toBe(190_000_00);
  });
});

describe("FIN-04B-05R1 composition and divergence", () => {
  it("ranks composition segments by projected amount", () => {
    const coverage = computeProjectionAggregateCoverage([
      { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 100_000_00 },
      { accountId: "a2", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 300_000_00 },
    ]);
    const dashboard = buildProjectionWorkspaceDashboard({
      coverage,
      budgetTotals: null,
      accounts: [
        sampleAccount({ accountId: "a1", accountName: "A", projectedAmountMinor: 100_000_00 }),
        sampleAccount({ accountId: "a2", accountName: "B", projectedAmountMinor: 300_000_00 }),
      ],
    });
    expect(dashboard.incomeComposition[0]?.accountId).toBe("a2");
    expect(dashboard.incomeComposition[0]?.shareOfSideTotal).toBeCloseTo(0.75, 5);
  });

  it("omits divergence when fewer than two comparable accounts exist", () => {
    const coverage = computeProjectionAggregateCoverage([
      { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 100_000_00 },
    ]);
    const dashboard: ProjectionWorkspaceDashboardViewModel = buildProjectionWorkspaceDashboard({
      coverage,
      budgetTotals: null,
      accounts: [sampleAccount({ deltaMinor: 10_000_00 })],
    });
    expect(dashboard.divergence).toBeNull();
  });

  it("ranks divergence by absolute delta", () => {
    const coverage = computeProjectionAggregateCoverage([
      { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 100_000_00 },
      { accountId: "a2", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 200_000_00 },
    ]);
    const dashboard = buildProjectionWorkspaceDashboard({
      coverage,
      budgetTotals: null,
      accounts: [
        sampleAccount({ accountId: "a1", accountName: "Small", deltaMinor: 5_000_00 }),
        sampleAccount({
          accountId: "a2",
          accountName: "Large",
          projectedAmountMinor: 200_000_00,
          forecastAmountMinor: 150_000_00,
          deltaMinor: 50_000_00,
        }),
      ],
    });
    expect(dashboard.divergence?.[0]?.accountName).toBe("Large");
  });
});

describe("FIN-04B-05R1 explainability narratives", () => {
  it("explains historical pattern from structured evidence", () => {
    const narrative = buildProjectionExplainabilityNarrative(
      {
        financialAccountId: "a1",
        projectedAmountMinor: 225_000_00,
        knownActualAmountMinor: 90_000_00,
        estimatedRemainingAmountMinor: 135_000_00,
        methodologyFamily: "HISTORICAL_PATTERN",
        dataSufficiency: "SUFFICIENT",
        sufficiencyReasons: [],
        confidenceLevel: "MEDIUM",
        confidenceRationaleCodes: [],
        lowerBoundMinor: null,
        upperBoundMinor: null,
        reasonCodes: [],
        materialInfluences: [{ code: "MEDIAN_CUMULATIVE_SHARE_BP", weight: 4000 }],
        historicalFinanceYearIdsUsed: ["fy1"],
        completedCurrentPeriodCount: 3,
      },
      { actualsThroughDate: "2026-09-30", historicalFinanceYearNames: ["FY 2024", "FY 2025"] },
    );
    expect(narrative).toContain("40");
    expect(narrative).toContain("FY 2024");
  });

  it("explains run rate from elapsed finance-year share", () => {
    const narrative = buildProjectionExplainabilityNarrative(
      {
        financialAccountId: "a1",
        projectedAmountMinor: 120_000_00,
        knownActualAmountMinor: 60_000_00,
        estimatedRemainingAmountMinor: 60_000_00,
        methodologyFamily: "RUN_RATE",
        dataSufficiency: "SUFFICIENT",
        sufficiencyReasons: [],
        confidenceLevel: "LOW",
        confidenceRationaleCodes: [],
        lowerBoundMinor: null,
        upperBoundMinor: null,
        reasonCodes: [],
        materialInfluences: [
          { code: "ELAPSED_DAYS", weight: 183 },
          { code: "TOTAL_FINANCE_YEAR_DAYS", weight: 365 },
        ],
        historicalFinanceYearIdsUsed: [],
        completedCurrentPeriodCount: 3,
      },
      { actualsThroughDate: "2026-07-01", historicalFinanceYearNames: [] },
    );
    expect(narrative).toMatch(/Finanzjahr/);
  });

  it("maps insufficient data without raw reason enums", () => {
    expect(projectionInsufficientDataExplanation(["NO_CURRENT_YEAR_ACTUALS"])).toContain("Ist-Daten");
    const detail = buildProjectionAccountExplainabilityDetail(
      {
        financialAccountId: "a1",
        projectedAmountMinor: null,
        knownActualAmountMinor: 0,
        estimatedRemainingAmountMinor: null,
        methodologyFamily: "NONE",
        dataSufficiency: "INSUFFICIENT",
        sufficiencyReasons: ["TOO_FEW_OBSERVATIONS"],
        confidenceLevel: "NONE",
        confidenceRationaleCodes: [],
        lowerBoundMinor: null,
        upperBoundMinor: null,
        reasonCodes: ["NO_RELIABLE_PROJECTION"],
        materialInfluences: [],
        historicalFinanceYearIdsUsed: [],
        completedCurrentPeriodCount: 0,
      },
      { actualsThroughDate: "2026-09-30", historicalFinanceYearNames: [] },
    );
    expect(detail.insufficientExplanation).toContain("Perioden");
    expect(detail.lowerBoundMinor).toBeNull();
  });
});

describe("FIN-04B-05R1 phasing guard", () => {
  it("does not fabricate monthly future projection values in dashboard model", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Y",
      version: {
        versionNumber: 1,
        actualsThroughDate: "2026-09-30",
        generatedAt: new Date(),
        dataSufficiency: "SUFFICIENT",
        evidenceFingerprint: "fp",
      },
      staleness: "FRESH",
      lines: [
        {
          financialAccountId: "a1",
          projectedAmountMinor: 100_000_00,
          lowerBoundMinor: null,
          upperBoundMinor: null,
          methodologyFamily: "RUN_RATE",
          dataSufficiency: "SUFFICIENT",
          confidence: "MEDIUM",
        },
      ],
      forecastAmountByAccountId: new Map([["a1", 90_000_00]]),
      coverageAccounts: [
        { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 100_000_00 },
      ],
      accountNameById: new Map([["a1", "Konto"]]),
      explainabilityByAccountId: new Map(),
      explainabilityDetailByAccountId: new Map([
        [
          "a1",
          buildProjectionAccountExplainabilityDetail(
            {
              financialAccountId: "a1",
              projectedAmountMinor: 100_000_00,
              knownActualAmountMinor: 40_000_00,
              estimatedRemainingAmountMinor: 60_000_00,
              methodologyFamily: "RUN_RATE",
              dataSufficiency: "SUFFICIENT",
              sufficiencyReasons: [],
              confidenceLevel: "MEDIUM",
              confidenceRationaleCodes: [],
              lowerBoundMinor: null,
              upperBoundMinor: null,
              reasonCodes: [],
              materialInfluences: [],
              historicalFinanceYearIdsUsed: [],
              completedCurrentPeriodCount: 2,
            },
            { actualsThroughDate: "2026-09-30", historicalFinanceYearNames: [] },
          ),
        ],
      ]),
      budgetTotals: null,
    });
    expect(vm.dashboard?.outlook.every((row) => !("monthly" in row))).toBe(true);
  });
});
