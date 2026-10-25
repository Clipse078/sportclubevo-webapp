import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { YTD_BUDGET_VARIANCE_SUPPORTED } from "@/lib/finance/actual/period-semantics";
import {
  computeSemanticVarianceMetrics,
  computeVariancePercent,
} from "@/lib/finance/actual/variance-semantics";
import { buildFinanceComparativeIntelligenceReadModel } from "@/lib/finance/reporting/build-finance-comparative-intelligence-read-model";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import {
  buildComparativeComparisonAvailabilityMatrix,
  FINANCE_COMPARATIVE_COMPARISON_KINDS,
  resolveComparativeComparisonPresentation,
} from "@/lib/finance/reporting/comparative-comparison-availability";
import { FINANCE_REPORTING_PERIOD_SEMANTICS } from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import { FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID } from "@/lib/finance/reporting/pnl-reporting-completeness";
import { loadFinanceManagementReportingDetailReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";

const tenantA = "tenant-a";
const userId = "user-1";

function ctx(permissions: string[]) {
  return { tenantId: tenantA, userId, permissionKeys: new Set(permissions) };
}

function baseGroup(id: string) {
  return {
    id,
    tenantId: tenantA,
    name: "Income group",
    parentId: null,
    sortOrder: 0,
    lifecycle: "ACTIVE" as const,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function baseAccount(id: string, semantic: "INCOME" | "EXPENSE") {
  return {
    id,
    tenantId: tenantA,
    reportingGroupId: "g1",
    name: id,
    sortOrder: 0,
    lifecycle: "ACTIVE" as const,
    archivedAt: null,
    canonicalSemantic: semantic,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function basePnlInput(overrides: Partial<Parameters<typeof buildFinanceManagementPnlReadModel>[0]> = {}) {
  const accountId = "acc-income";
  return {
    tenantId: tenantA,
    financeYearId: "fy1",
    financeYearName: "FY2026",
    baseCurrency: "EUR",
    structureAvailability: "AVAILABLE" as const,
    actualCutoffDate: new Date("2026-10-25T12:00:00.000Z"),
    groups: [baseGroup("g1")],
    accounts: [baseAccount(accountId, "INCOME"), baseAccount("acc-expense", "EXPENSE")],
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

describe("FIN-05F comparative intelligence", () => {
  it("A — current forecast vs approved budget is SUPPORTED", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    const comparative = pnl.comparativeIntelligence;
    expect(comparative.overallComparison.presentationRole).toBe("SUPPORTED");
    expect(comparative.overallComparison.variance.availability).toBe("AVAILABLE");
    const entry = comparative.comparisonAvailability.find(
      (e) => e.kind === "CURRENT_FORECAST_VS_APPROVED_BUDGET",
    );
    expect(entry?.role).toBe("SUPPORTED");
  });

  it("B/C — YTD actual vs annual budget/forecast are not ordinary comparable variances", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    expect(pnl.actualVsBudgetVariance.availability).toBe("PERIOD_MISMATCH");
    expect(pnl.comparativeIntelligence.actualVsBudgetVarianceRole).toBe("UNSUPPORTED");
    const ytdBudget = resolveComparativeComparisonPresentation({
      kind: "YTD_ACTUAL_VS_ANNUAL_APPROVED_BUDGET",
      actualGrain: "YTD",
    });
    const ytdForecast = resolveComparativeComparisonPresentation({
      kind: "YTD_ACTUAL_VS_ANNUAL_CURRENT_FORECAST",
      actualGrain: "YTD",
    });
    expect(ytdBudget.role).toBe("CONTEXT_ONLY");
    expect(ytdForecast.role).toBe("CONTEXT_ONLY");
    expect(pnl.comparativeIntelligence.actualContext.presentationRole).toBe("CONTEXT_ONLY");
  });

  it("D — annual actual vs annual budget can be SUPPORTED when grain aligns", () => {
    const pnl = buildFinanceManagementPnlReadModel(
      basePnlInput({
        actualMeasure: {
          grain: "ANNUAL_FULL_YEAR",
          cutoffDate: null,
          valuesByAccountId: new Map([["acc-income", 140_000_00]]),
        },
        actualCutoffDate: null,
      }),
    );
    expect(pnl.comparativeIntelligence.actualVsBudgetVarianceRole).toBe("SUPPORTED");
    expect(pnl.actualVsBudgetVariance.availability).not.toBe("PERIOD_MISMATCH");
  });

  it("E/F — no fake budget or forecast phasing flags remain locked", () => {
    expect(YTD_BUDGET_VARIANCE_SUPPORTED).toBe(false);
    expect(FINANCE_REPORTING_PERIOD_SEMANTICS.fakeMonthlyBudgetFromAnnualDivideBy12Forbidden).toBe(
      true,
    );
    expect(FINANCE_REPORTING_PERIOD_SEMANTICS.fakeMonthlyForecastFromAnnualDivideBy12Forbidden).toBe(
      true,
    );
    const queryService = readFileSync(
      join(process.cwd(), "lib/finance/services/finance-management-reporting-query-service.ts"),
      "utf8",
    );
    expect(queryService).not.toMatch(/\/\s*12/);
    expect(queryService).not.toContain("Date.now(");
  });

  it("G/H — zero and missing baselines keep percent variance unavailable", () => {
    expect(computeVariancePercent(100_00, 0)).toBeNull();
    const zeroSemantic = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 0,
      comparisonMinor: 100_00,
    });
    expect(zeroSemantic.variancePercent).toBeNull();
    const missingSemantic = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: null,
      comparisonMinor: 100_00,
    });
    expect(missingSemantic.variancePercent).toBeNull();
  });

  it("I — missing measures are not coerced to zero in comparison slices", () => {
    const pnl = buildFinanceManagementPnlReadModel(
      basePnlInput({
        forecastMeasure: null,
        sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
      }),
    );
    expect(pnl.managementResult.currentForecast.availability).toBe("NO_CURRENT_FORECAST");
    expect(pnl.managementResult.currentForecast.amountMinor).toBeNull();
  });

  it("J/K/L — income and expense favourability semantics", () => {
    const incomeFav = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 100,
      comparisonMinor: 120,
    });
    expect(incomeFav.favorability).toBe("FAVORABLE");
    const incomeUnfav = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 100,
      comparisonMinor: 80,
    });
    expect(incomeUnfav.favorability).toBe("UNFAVORABLE");
    const expenseUnfav = computeSemanticVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      baselineMinor: 100,
      comparisonMinor: 120,
    });
    expect(expenseUnfav.favorability).toBe("UNFAVORABLE");
    const expenseFav = computeSemanticVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      baselineMinor: 100,
      comparisonMinor: 80,
    });
    expect(expenseFav.favorability).toBe("FAVORABLE");
  });

  it("M — material drivers are reused from FIN-05B ranking on the PnL read model", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    expect(pnl.comparativeIntelligence.materialDrivers.favourable).toEqual(pnl.topFavourableDrivers);
    expect(pnl.comparativeIntelligence.materialDrivers.unfavourable).toEqual(
      pnl.topUnfavourableDrivers,
    );
  });

  it("N — unassigned residual group id preserved in architecture", () => {
    expect(FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID).toBe("__sce_management_pnl_unassigned__");
  });

  it("O/P — actual cutoff comes from measure payload, not Date.now", () => {
    const cutoff = new Date("2026-10-25T08:00:00.000Z");
    const pnl = buildFinanceManagementPnlReadModel(
      basePnlInput({
        actualCutoffDate: cutoff,
        actualMeasure: {
          grain: "YTD",
          cutoffDate: cutoff,
          valuesByAccountId: new Map([["acc-income", 1_00]]),
        },
      }),
    );
    expect(pnl.actualCutoffDate?.toISOString()).toBe(cutoff.toISOString());
    expect(pnl.comparativeIntelligence.actualContext.cutoffDate?.toISOString()).toBe(
      cutoff.toISOString(),
    );
  });

  it("Q — restricted forecast visibility hides forecast comparison values", () => {
    const pnl = buildFinanceManagementPnlReadModel(
      basePnlInput({
        sourceVisibility: { approvedBudget: true, actual: true, currentForecast: false },
        forecastMeasure: null,
      }),
    );
    expect(pnl.managementResult.currentForecast.availability).toBe("NOT_VISIBLE");
    expect(pnl.managementResult.currentForecast.amountMinor).toBeNull();
  });

  it("R — tenant isolation on detail load returns NOT_FOUND without evidence query", async () => {
    const db = {
      financeYear: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "fy1",
            tenantId: tenantA,
            name: "FY2026",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
          },
        ]),
      },
      financeConfiguration: {
        findUnique: vi.fn().mockResolvedValue({
          tenantId: tenantA,
          baseCurrency: "EUR",
          currentFinanceYearId: "fy1",
        }),
      },
      financeBudget: { findUnique: vi.fn().mockResolvedValue(null) },
      financeForecast: { findUnique: vi.fn().mockResolvedValue(null) },
      financeActualEntry: { findMany: vi.fn().mockResolvedValue([]) },
      financialReportingGroup: { findMany: vi.fn().mockResolvedValue([]) },
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "acc-i",
            tenantId: tenantA,
            name: "Membership",
            reportingGroupId: "g1",
            sortOrder: 0,
            lifecycle: "ACTIVE",
            archivedAt: null,
            canonicalSemantic: "INCOME",
          },
        ]),
      },
    };
    const model = await loadFinanceManagementReportingDetailReadModel(
      db as never,
      ctx([PERMISSIONS.FINANCE_VIEW]),
      {
        financeYearId: "fy1",
        accountId: "acc-other-tenant",
        groupId: null,
        timingNavEnabled: false,
      },
    );
    expect(model.availability).toBe("NOT_FOUND");
    expect(db.financeActualEntry.findMany).not.toHaveBeenCalled();
  });

  it("S — partial source combinations surface explicit availability", () => {
    const pnl = buildFinanceManagementPnlReadModel(
      basePnlInput({
        approvedMeasure: null,
        forecastMeasure: null,
      }),
    );
    expect(pnl.comparativeIntelligence.sourceAvailability.approvedBudget).toBe("NO_APPROVED_BUDGET");
    expect(pnl.comparativeIntelligence.attentionSignals.some((s) => s.kind === "MISSING_APPROVED_BUDGET")).toBe(
      true,
    );
  });

  it("T/U — no automatic forecast or scenario substitution in reporting query service", () => {
    const queryService = readFileSync(
      join(process.cwd(), "lib/finance/services/finance-management-reporting-query-service.ts"),
      "utf8",
    );
    expect(queryService).toContain("resolveCurrentForecastMeasure");
    expect(queryService).not.toContain("AutomaticForecast");
    expect(queryService).not.toContain("resolveScenario");
  });

  it("V/W — no liquidity or expected-event recognition in comparative modules", () => {
    const comparativeBuilder = readFileSync(
      join(process.cwd(), "lib/finance/reporting/build-finance-comparative-intelligence-read-model.ts"),
      "utf8",
    );
    expect(comparativeBuilder).not.toMatch(/cash|liquidity|treasury/i);
    expect(comparativeBuilder).not.toContain("expectedFinancialEvent");
  });

  it("X — FIN-05E drill integration hooks remain on reports workspace", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("data-finance-comparative-intelligence");
    expect(panel).toContain("onInvestigateAccount");
    const workspace = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceReportingInvestigationWorkspace.tsx"),
      "utf8",
    );
    expect(workspace).toContain("FinanceManagementReportingDetailSheet");
  });

  it("Y — DE/EN translation keys exist for comparative copy", () => {
    const en = readFileSync(join(process.cwd(), "messages/en.json"), "utf8");
    const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
    for (const key of [
      "actualEvidenceTitle",
      "grainExplanationYtdVsAnnualPlan",
      "signalLimitedActualEvidence",
    ]) {
      expect(en).toContain(`"${key}"`);
      expect(de).toContain(`"${key}"`);
    }
  });

  it("Z — comparison availability matrix covers all canonical kinds", () => {
    const matrix = buildComparativeComparisonAvailabilityMatrix({ actualGrain: "YTD" });
    expect(matrix.map((e) => e.kind).sort()).toEqual([...FINANCE_COMPARATIVE_COMPARISON_KINDS].sort());
  });

  it("buildFinanceComparativeIntelligenceReadModel composes without duplicate variance math", () => {
    const pnl = buildFinanceManagementPnlReadModel(basePnlInput());
    const standalone = buildFinanceComparativeIntelligenceReadModel(pnl);
    expect(standalone.overallComparison.variance).toEqual(pnl.managementResult.forecastVsBudget);
  });
});
