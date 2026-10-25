import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  computeSemanticVarianceMetrics,
  computeVariancePercent,
} from "@/lib/finance/actual/variance-semantics";
import { computeCanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import {
  buildFinancialReportingTree,
  summarizeReportingTree,
} from "@/lib/finance/reporting/build-reporting-tree";
import {
  buildVarianceReportingTree,
  summarizeVarianceTreeResult,
} from "@/lib/finance/reporting/build-variance-reporting-tree";
import { buildFinanceVarianceAnalysisReadModel } from "@/lib/finance/reporting/build-finance-variance-analysis-read-model";
import { resolveCurrentForecastMeasure } from "@/lib/finance/reporting/current-forecast-measure-provider";
import {
  FINANCE_REPORTING_COMPARISON_PAIRS,
  FINANCE_REPORTING_UNSUPPORTED_COMPARISONS,
} from "@/lib/finance/reporting/reporting-comparison-model";
import {
  FINANCE_05B_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import {
  FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE,
  loadFinanceManagementOverviewReadModel,
  loadFinanceVarianceAnalysisReadModel,
} from "@/lib/finance/services/finance-management-reporting-query-service";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const userId = "user-1";

function ctx(tenantId: string, permissions: string[]) {
  return { tenantId, userId, permissionKeys: new Set(permissions) };
}

describe("FIN-05B variance engine semantics", () => {
  it("INCOME: comparison above baseline → FAVORABLE", () => {
    const m = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 100_00,
      comparisonMinor: 120_00,
    });
    expect(m.rawDeltaMinor).toBe(20_00);
    expect(m.favorability).toBe("FAVORABLE");
  });

  it("INCOME: comparison below baseline → UNFAVORABLE", () => {
    const m = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 100_00,
      comparisonMinor: 80_00,
    });
    expect(m.favorability).toBe("UNFAVORABLE");
  });

  it("EXPENSE: comparison above baseline → UNFAVORABLE", () => {
    const m = computeSemanticVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      baselineMinor: 100_00,
      comparisonMinor: 120_00,
    });
    expect(m.rawDeltaMinor).toBe(20_00);
    expect(m.favorability).toBe("UNFAVORABLE");
  });

  it("EXPENSE: comparison below baseline → FAVORABLE", () => {
    const m = computeSemanticVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      baselineMinor: 100_00,
      comparisonMinor: 80_00,
    });
    expect(m.favorability).toBe("FAVORABLE");
  });

  it("equal amounts → ON_PLAN", () => {
    const m = computeSemanticVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      baselineMinor: 50_00,
      comparisonMinor: 50_00,
    });
    expect(m.favorability).toBe("ON_PLAN");
  });

  it("zero baseline → percentage unavailable", () => {
    expect(computeVariancePercent(10_00, 0)).toBeNull();
    const m = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 0,
      comparisonMinor: 10_00,
    });
    expect(m.variancePercent).toBeNull();
  });

  it("missing baseline or comparison → no fabricated variance", () => {
    const missingBaseline = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: null,
      comparisonMinor: 10_00,
    });
    expect(missingBaseline.rawDeltaMinor).toBeNull();
    expect(missingBaseline.favorability).toBeNull();

    const missingComparison = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 10_00,
      comparisonMinor: null,
    });
    expect(missingComparison.rawDeltaMinor).toBeNull();
  });
});

describe("FIN-05B management result", () => {
  it("RESULT = INCOME - EXPENSE for budget, actual, and forecast sources", () => {
    const lines = [
      { amountMinor: 200_00, canonicalSemantic: "INCOME" },
      { amountMinor: 150_00, canonicalSemantic: "EXPENSE" },
    ];
    expect(computeCanonicalFinancialResult(lines).resultMinor).toBe(50_00);
  });

  it("rollup tree avoids double counting nested groups", () => {
    const groups = [
      {
        id: "g-root",
        tenantId: tenantA,
        name: "Root",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const accounts = [
      {
        id: "acc-i",
        tenantId: tenantA,
        reportingGroupId: "g-root",
        name: "Income",
        sortOrder: 0,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        canonicalSemantic: "INCOME" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "acc-e",
        tenantId: tenantA,
        reportingGroupId: "g-root",
        name: "Expense",
        sortOrder: 1,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        canonicalSemantic: "EXPENSE" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const values = new Map([
      ["acc-i", 100_00],
      ["acc-e", 40_00],
    ]);
    const tree = buildFinancialReportingTree({ groups, accounts, valuesByAccountId: values });
    const totals = summarizeReportingTree(tree);
    expect(totals.incomeMinor).toBe(100_00);
    expect(totals.expenseMinor).toBe(40_00);
  });
});

describe("FIN-05B forecast authority", () => {
  it("uses currentVersionId pointer — not max version id", () => {
    const measure = resolveCurrentForecastMeasure({
      forecastId: "f1",
      currentVersionId: "v-old",
      versions: [
        {
          id: "v-new",
          status: "CURRENT",
          forecastId: "f1",
          lines: [{ financialAccountId: "acc-1", amountMinor: 999_00 }],
        },
        {
          id: "v-old",
          status: "CURRENT",
          forecastId: "f1",
          lines: [{ financialAccountId: "acc-1", amountMinor: 50_00 }],
        },
      ],
    });
    expect(measure?.forecastVersionId).toBe("v-old");
    expect(measure?.valuesByAccountId.get("acc-1")).toBe(50_00);
  });
});

describe("FIN-05B period safety", () => {
  it("marks YTD vs annual budget as PERIOD_MISMATCH", () => {
    const model = buildFinanceVarianceAnalysisReadModel({
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2027",
      baseCurrency: "EUR",
      comparison: "ACTUAL_VS_APPROVED_BUDGET",
      grain: "ACTUAL_YTD_WITH_EXPLICIT_CUTOFF",
      actualCutoffDate: new Date("2027-06-30"),
      groups: [],
      accounts: [],
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "EUR",
        valuesByAccountId: new Map([["acc-1", 100_00]]),
      },
      actualMeasure: {
        measure: "ACTUAL",
        grain: "YTD",
        cutoffDate: new Date("2027-06-30"),
        valuesByAccountId: new Map([["acc-1", 40_00]]),
      },
      forecastMeasure: null,
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
    });
    expect(model.availability).toBe("PERIOD_MISMATCH");
  });
});

describe("FIN-05B architecture locks", () => {
  it("documents supported and unsupported comparisons", () => {
    expect(FINANCE_REPORTING_COMPARISON_PAIRS).toContain("ACTUAL_VS_APPROVED_BUDGET");
    expect(FINANCE_REPORTING_UNSUPPORTED_COMPARISONS).toContain("ACTUAL_VS_CURRENT_FORECAST");
    expect(SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.missingIsNotZero).toBe(true);
    expect(FINANCE_05B_IMPLEMENTATION.supportedComparisons.length).toBe(2);
  });

  it("protects query shape", () => {
    expect(FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE.perAccountQueryLoopForbidden).toBe(true);
  });
});

describe("FIN-05B management reporting query service", () => {
  const store = {
    config: { tenantId: tenantA, baseCurrency: "EUR", currentFinanceYearId: "year-1" },
    years: [] as Array<{
      id: string;
      tenantId: string;
      name: string;
      startDate: Date;
      endDate: Date;
    }>,
    groups: [] as Array<Record<string, unknown>>,
    accounts: [] as Array<Record<string, unknown>>,
    budgets: [] as Array<Record<string, unknown>>,
    versions: [] as Array<Record<string, unknown>>,
    forecasts: [] as Array<Record<string, unknown>>,
    forecastVersions: [] as Array<Record<string, unknown>>,
    actualEntries: [] as Array<Record<string, unknown>>,
  };

  const db = {
    financeConfiguration: {
      findUnique: vi.fn(async () =>
        store.config.tenantId === tenantA ? store.config : null,
      ),
    },
    financeYear: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        store.years.filter((y) => y.tenantId === where.tenantId),
      ),
    },
    financialReportingGroup: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        store.groups.filter((g) => g.tenantId === where.tenantId),
      ),
    },
    financialAccount: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        store.accounts.filter((a) => a.tenantId === where.tenantId),
      ),
    },
    financeBudget: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
        }) => {
          const budget = store.budgets.find(
            (b) =>
              b.tenantId === where.tenantId_financeYearId.tenantId &&
              b.financeYearId === where.tenantId_financeYearId.financeYearId,
          );
          if (!budget) return null;
          return {
            ...budget,
            versions: store.versions
              .filter((v) => v.budgetId === budget.id)
              .map((v) => ({ ...v, lines: v.lines })),
          };
        },
      ),
    },
    financeForecast: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
        }) => {
          const forecast = store.forecasts.find(
            (f) =>
              f.tenantId === where.tenantId_financeYearId.tenantId &&
              f.financeYearId === where.tenantId_financeYearId.financeYearId,
          );
          if (!forecast) return null;
          return {
            ...forecast,
            versions: store.forecastVersions
              .filter((v) => v.forecastId === forecast.id)
              .map((v) => ({ ...v, lines: v.lines })),
          };
        },
      ),
    },
    financeActualEntry: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string; financeYearId: string } }) =>
        store.actualEntries.filter(
          (e) => e.tenantId === where.tenantId && e.financeYearId === where.financeYearId,
        ),
      ),
    },
  };

  beforeEach(() => {
    store.years = [
      {
        id: "year-1",
        tenantId: tenantA,
        name: "FY2027",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
      },
    ];
    store.groups = [
      {
        id: "g1",
        tenantId: tenantA,
        name: "Income",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    store.accounts = [
      {
        id: "acc-i",
        tenantId: tenantA,
        reportingGroupId: "g1",
        name: "Fees",
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        canonicalSemantic: "INCOME",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "acc-e",
        tenantId: tenantA,
        reportingGroupId: "g1",
        name: "Rent",
        sortOrder: 1,
        lifecycle: "ACTIVE",
        archivedAt: null,
        canonicalSemantic: "EXPENSE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    store.budgets = [
      {
        id: "b1",
        tenantId: tenantA,
        financeYearId: "year-1",
        currentBaselineVersionId: "bv1",
      },
    ];
    store.versions = [
      {
        id: "bv1",
        budgetId: "b1",
        status: "APPROVED",
        approvedAt: new Date(),
        lines: [
          { financialAccountId: "acc-i", amountMinor: 100_00 },
          { financialAccountId: "acc-e", amountMinor: 60_00 },
        ],
      },
    ];
    store.forecasts = [
      {
        id: "fc1",
        tenantId: tenantA,
        financeYearId: "year-1",
        currentVersionId: "fv1",
      },
    ];
    store.forecastVersions = [
      {
        id: "fv1",
        forecastId: "fc1",
        status: "CURRENT",
        lines: [
          { financialAccountId: "acc-i", amountMinor: 110_00 },
          { financialAccountId: "acc-e", amountMinor: 55_00 },
        ],
      },
    ];
    store.actualEntries = [
      {
        tenantId: tenantA,
        financeYearId: "year-1",
        financialAccountId: "acc-i",
        amountMinor: 90_00,
        effectiveDate: new Date("2027-03-01"),
      },
    ];
  });

  it("loads management overview with all sources", async () => {
    const model = await loadFinanceManagementOverviewReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      { financeYearId: "year-1" },
    );
    expect(model.approvedBudget.summary?.resultMinor).toBe(40_00);
    expect(model.currentForecast.summary?.resultMinor).toBe(55_00);
    expect(model.actual.summary?.incomeMinor).toBe(90_00);
    expect(model.forecastVsBudgetVariance.favorability).toBe("FAVORABLE");
    expect(model.topFavourableDrivers.length).toBeGreaterThan(0);
  });

  it("requires finance.view", async () => {
    await expect(
      loadFinanceManagementOverviewReadModel(db as never, ctx(tenantA, []), {
        financeYearId: "year-1",
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("does not leak forecast when forecast permission missing", async () => {
    const model = await loadFinanceManagementOverviewReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_VIEW, PERMISSIONS.FINANCE_ACTUAL_VIEW]),
      { financeYearId: "year-1" },
    );
    expect(model.currentForecast.availability).toBe("NOT_VISIBLE");
    expect(model.currentForecast.summary).toBeNull();
  });

  it("does not leak tenant B measures to tenant A", async () => {
    store.budgets.push({
      id: "b-b",
      tenantId: tenantB,
      financeYearId: "year-b",
      currentBaselineVersionId: "bv-b",
    });
    store.versions.push({
      id: "bv-b",
      budgetId: "b-b",
      status: "APPROVED",
      approvedAt: new Date(),
      lines: [{ financialAccountId: "acc-i", amountMinor: 999_00 }],
    });
    const model = await loadFinanceManagementOverviewReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      { financeYearId: "year-1" },
    );
    expect(model.approvedBudget.summary?.incomeMinor).toBe(100_00);
  });

  it("variance analysis exposes hierarchy comparison slices", async () => {
    const model = await loadFinanceVarianceAnalysisReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      {
        financeYearId: "year-1",
        comparison: "CURRENT_FORECAST_VS_APPROVED_BUDGET",
      },
    );
    expect(model.availability).toBe("AVAILABLE");
    expect(model.managementResultComparison.rawDeltaMinor).toBe(15_00);
    const incomeAccount = model.tree[0]?.kind === "reporting_group"
      ? model.tree[0].children.find((c) => c.kind === "account" && c.accountId === "acc-i")
      : null;
    expect(incomeAccount && incomeAccount.kind === "account").toBe(true);
    if (incomeAccount && incomeAccount.kind === "account") {
      expect(incomeAccount.comparison.favorability).toBe("FAVORABLE");
    }
  });

  it("includes archived accounts in variance tree", () => {
    const tree = buildVarianceReportingTree({
      groups: store.groups as never,
      accounts: [
        {
          ...(store.accounts[0] as object),
          lifecycle: "ARCHIVED",
        } as never,
      ],
      baselineByAccountId: new Map([["acc-i", 100_00]]),
      comparisonByAccountId: new Map([["acc-i", 80_00]]),
    });
    const result = summarizeVarianceTreeResult(tree);
    expect(result.rawDeltaMinor).toBe(-20_00);
  });
});
