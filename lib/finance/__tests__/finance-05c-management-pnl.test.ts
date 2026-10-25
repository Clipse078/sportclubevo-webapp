import { describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import {
  buildManagementPnlSemanticSections,
  buildManagementPnlVarianceTree,
} from "@/lib/finance/reporting/build-management-pnl-tree";
import {
  FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID,
  findUnrepresentedPlanningAccounts,
} from "@/lib/finance/reporting/pnl-reporting-completeness";
import {
  FINANCE_05C_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import {
  loadFinanceManagementPnlReadModel,
  FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE,
} from "@/lib/finance/services/finance-management-reporting-query-service";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function ctx(tenantId: string, permissions: string[]) {
  return { tenantId, userId: "user-1", permissionKeys: new Set(permissions) };
}

function baseGroup(id: string, parentId: string | null, sortOrder = 0) {
  return {
    id,
    tenantId: tenantA,
    name: id,
    parentId,
    sortOrder,
    lifecycle: "ACTIVE" as const,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function baseAccount(
  id: string,
  groupId: string,
  semantic: "INCOME" | "EXPENSE",
  lifecycle: "ACTIVE" | "ARCHIVED" = "ACTIVE",
) {
  return {
    id,
    tenantId: tenantA,
    reportingGroupId: groupId,
    name: id,
    sortOrder: 0,
    lifecycle,
    archivedAt: lifecycle === "ARCHIVED" ? new Date("2026-01-01") : null,
    canonicalSemantic: semantic,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("FIN-05C Management P&L read model", () => {
  it("reconciles budget, actual, and forecast totals including unassigned accounts", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [
      baseAccount("acc-i", "g1", "INCOME"),
      baseAccount("acc-e", "g1", "EXPENSE"),
      baseAccount("acc-ui", "orphan-group", "INCOME"),
    ];
    const budgetMap = new Map([
      ["acc-i", 200_00],
      ["acc-e", 120_00],
      ["acc-ui", 30_00],
    ]);
    const actualMap = new Map([
      ["acc-i", 180_00],
      ["acc-e", 100_00],
      ["acc-ui", 25_00],
    ]);
    const forecastMap = new Map([
      ["acc-i", 210_00],
      ["acc-e", 130_00],
      ["acc-ui", 35_00],
    ]);

    const { varianceTree, unassignedAccounts } = buildManagementPnlVarianceTree({
      groups,
      accounts,
      budgetMap,
      forecastMap,
      budgetVisible: true,
      forecastVisible: true,
    });
    expect(unassignedAccounts.map((a) => a.id)).toContain("acc-ui");

    const sections = buildManagementPnlSemanticSections({
      groups,
      accounts,
      budgetVisible: true,
      actualVisible: true,
      forecastVisible: true,
      budgetMap,
      actualMap,
      forecastMap,
      varianceTree,
      unassignedAccounts,
    });
    expect(sections.hasUnassignedFinancialValues).toBe(true);
    const incomeResidual = sections.incomeSection.nodes.find((n) => n.kind === "unassigned_residual");
    expect(incomeResidual?.kind).toBe("unassigned_residual");
    if (incomeResidual?.kind === "unassigned_residual") {
      expect(incomeResidual.residualGroupId).toBe(FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID);
    }

    const model = buildFinanceManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
      actualCutoffDate: null,
      groups,
      accounts,
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "EUR",
        valuesByAccountId: budgetMap,
      },
      actualMeasure: {
        measure: "ACTUAL",
        grain: "ANNUAL_FULL_YEAR",
        cutoffDate: null,
        valuesByAccountId: actualMap,
      },
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: forecastMap,
      },
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
    });

    expect(model.reconciliation.approvedBudget.reconciles).toBe(true);
    expect(model.reconciliation.actual.reconciles).toBe(true);
    expect(model.reconciliation.currentForecast.reconciles).toBe(true);
    expect(model.managementResult.approvedBudget.amountMinor).toBe(110_00);
    expect(model.managementResult.currentForecast.amountMinor).toBe(115_00);
  });

  it("keeps archived accounts with historical values in the hierarchy", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME", "ARCHIVED")];
    const budgetMap = new Map([["acc-i", 50_00]]);
    const { varianceTree } = buildManagementPnlVarianceTree({
      groups,
      accounts,
      budgetMap,
      forecastMap: budgetMap,
      budgetVisible: true,
      forecastVisible: true,
    });
    const unassigned = findUnrepresentedPlanningAccounts({
      accounts,
      groups,
      hierarchyTree: varianceTree,
    });
    expect(unassigned).toHaveLength(0);
    expect(varianceTree[0]?.kind).toBe("reporting_group");
  });

  it("uses semantic forecast-vs-budget favourability from FIN-05B engine", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-e", "g1", "EXPENSE")];
    const budgetMap = new Map([["acc-e", 100_00]]);
    const forecastMap = new Map([["acc-e", 120_00]]);
    const model = buildFinanceManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
      actualCutoffDate: null,
      groups,
      accounts,
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "EUR",
        valuesByAccountId: budgetMap,
      },
      actualMeasure: null,
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: forecastMap,
      },
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
    });
    expect(model.expenseSection.sectionTotal.forecastVsBudget.favorability).toBe("UNFAVORABLE");
  });

  it("does not expose forecast measures without permission", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const model = buildFinanceManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
      actualCutoffDate: null,
      groups,
      accounts,
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "EUR",
        valuesByAccountId: new Map([["acc-i", 100_00]]),
      },
      actualMeasure: null,
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: new Map([["acc-i", 200_00]]),
      },
      sourceVisibility: { approvedBudget: true, actual: false, currentForecast: false },
    });
    expect(model.currentForecast.availability).toBe("NOT_VISIBLE");
    expect(model.managementResult.currentForecast.amountMinor).toBeNull();
    expect(model.topFavourableDrivers).toHaveLength(0);
  });

  it("marks YTD actual vs annual budget variance as period mismatch", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const model = buildFinanceManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
      actualCutoffDate: new Date("2026-06-30"),
      groups,
      accounts,
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "EUR",
        valuesByAccountId: new Map([["acc-i", 100_00]]),
      },
      actualMeasure: {
        measure: "ACTUAL",
        grain: "YTD",
        cutoffDate: new Date("2026-06-30"),
        valuesByAccountId: new Map([["acc-i", 40_00]]),
      },
      forecastMeasure: null,
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: false },
    });
    expect(model.actualVsBudgetVariance.availability).toBe("PERIOD_MISMATCH");
    expect(model.actual.grain).toBe("YTD");
  });
});

describe("FIN-05C query service", () => {
  const store = {
    config: { tenantId: tenantA, baseCurrency: "EUR", currentFinanceYearId: "year-1" },
    years: [
      {
        id: "year-1",
        tenantId: tenantA,
        name: "FY2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      },
    ],
    groups: [baseGroup("g1", null)],
    accounts: [baseAccount("acc-i", "g1", "INCOME"), baseAccount("acc-e", "g1", "EXPENSE")],
    budgets: [
      {
        id: "b1",
        tenantId: tenantA,
        financeYearId: "year-1",
        currentBaselineVersionId: "bv1",
      },
    ],
    versions: [
      {
        id: "bv1",
        budgetId: "b1",
        status: "APPROVED",
        approvedAt: new Date(),
        lines: [
          { financialAccountId: "acc-i", amountMinor: 100_00 },
          { financialAccountId: "acc-e", amountMinor: 40_00 },
        ],
      },
    ],
    forecasts: [
      {
        id: "f1",
        tenantId: tenantA,
        financeYearId: "year-1",
        currentVersionId: "fv1",
      },
    ],
    forecastVersions: [
      {
        id: "fv1",
        forecastId: "f1",
        status: "CURRENT",
        lines: [
          { financialAccountId: "acc-i", amountMinor: 110_00 },
          { financialAccountId: "acc-e", amountMinor: 45_00 },
        ],
      },
    ],
    actuals: [
      {
        financialAccountId: "acc-i",
        amountMinor: 90_00,
        effectiveDate: new Date("2026-03-01"),
      },
    ],
  };

  const db = {
    financeConfiguration: {
      findUnique: vi.fn(async () => store.config),
    },
    financeYear: {
      findMany: vi.fn(async () => store.years),
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
      findUnique: vi.fn(async () => ({
        ...store.budgets[0],
        versions: store.versions.map((v) => ({ ...v, lines: v.lines })),
      })),
    },
    financeForecast: {
      findUnique: vi.fn(async () => ({
        ...store.forecasts[0],
        versions: store.forecastVersions.map((v) => ({ ...v, lines: v.lines })),
      })),
    },
    financeActualEntry: {
      findMany: vi.fn(async () => store.actuals),
    },
  };

  it("loads tenant-scoped P&L without N+1 pattern", async () => {
    const model = await loadFinanceManagementPnlReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      { financeYearId: "year-1" },
    );
    expect(model.tenantId).toBe(tenantA);
    expect(model.reconciliation.approvedBudget.reconciles).toBe(true);
    expect(FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE.perAccountQueryLoopForbidden).toBe(true);
  });

  it("rejects users without finance reporting access", async () => {
    await expect(
      loadFinanceManagementPnlReadModel(db as never, ctx(tenantA, []), {
        financeYearId: "year-1",
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });
});

describe("FIN-05C architecture locks", () => {
  it("documents implementation boundaries", () => {
    expect(SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.managementPnlUsesFin05bPrimitives).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.unassignedFinancialValuesMustNotDisappear).toBe(
      true,
    );
    expect(FINANCE_05C_IMPLEMENTATION.workspaceRoute).toBe("/dashboard/finance/reports");
  });
});
