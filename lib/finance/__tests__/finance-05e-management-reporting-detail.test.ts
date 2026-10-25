import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinanceManagementReportingDetailReadModel } from "@/lib/finance/reporting/build-finance-management-reporting-detail-read-model";
import { resolveManagementPnlTreeTarget } from "@/lib/finance/reporting/resolve-management-pnl-tree-target";
import {
  buildManagementPnlResolutionSectionNodes,
  buildManagementPnlVarianceTree,
} from "@/lib/finance/reporting/build-management-pnl-tree";
import {
  loadFinanceManagementReportingDetailReadModel,
  FINANCE_MANAGEMENT_REPORTING_DETAIL_QUERY_SHAPE,
} from "@/lib/finance/services/finance-management-reporting-query-service";
import { FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID } from "@/lib/finance/reporting/pnl-reporting-completeness";

const tenantA = "tenant-a";

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

function baseAccount(id: string, groupId: string, semantic: "INCOME" | "EXPENSE") {
  return {
    id,
    tenantId: tenantA,
    reportingGroupId: groupId,
    name: id,
    sortOrder: 0,
    lifecycle: "ACTIVE" as const,
    archivedAt: null,
    canonicalSemantic: semantic,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("FIN-05E resolve management P&L target", () => {
  it("finds account and group targets in hierarchy", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const budgetMap = new Map([["acc-i", 100_00]]);
    const forecastMap = new Map([["acc-i", 110_00]]);
    const { varianceTree, unassignedAccounts } = buildManagementPnlVarianceTree({
      groups,
      accounts,
      budgetMap,
      forecastMap,
      budgetVisible: true,
      forecastVisible: true,
    });
    const resolution = buildManagementPnlResolutionSectionNodes({
      groups,
      accounts,
      budgetVisible: true,
      actualVisible: true,
      forecastVisible: true,
      budgetMap,
      actualMap: budgetMap,
      forecastMap,
      varianceTree,
      unassignedAccounts,
    });

    const account = resolveManagementPnlTreeTarget({
      incomeNodes: resolution.incomeNodes,
      expenseNodes: resolution.expenseNodes,
      accountId: "acc-i",
      groupId: null,
    });
    expect(account?.kind).toBe("account");

    const group = resolveManagementPnlTreeTarget({
      incomeNodes: resolution.incomeNodes,
      expenseNodes: resolution.expenseNodes,
      accountId: null,
      groupId: "g1",
    });
    expect(group?.kind).toBe("reporting_group");
  });
});

describe("FIN-05E management reporting detail read model", () => {
  it("returns account detail with actual evidence ordered by date", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const detail = buildFinanceManagementReportingDetailReadModel({
      ctx: ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
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
        grain: "ANNUAL_FULL_YEAR",
        cutoffDate: null,
        valuesByAccountId: new Map([["acc-i", 90_00]]),
      },
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: new Map([["acc-i", 110_00]]),
      },
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
      actualCutoffDate: null,
      accountId: "acc-i",
      groupId: null,
      actualEntryRows: [
        {
          id: "e2",
          effectiveDate: new Date("2026-03-01"),
          amountMinor: 40_00,
          currency: "EUR",
          description: "Later",
        },
        {
          id: "e1",
          effectiveDate: new Date("2026-01-15"),
          amountMinor: 50_00,
          currency: "EUR",
          description: "Earlier",
        },
      ],
      timingNavEnabled: true,
    });

    expect(detail.availability).toBe("AVAILABLE");
    expect(detail.targetKind).toBe("ACCOUNT");
    expect(detail.actualEvidence.entries.map((e) => e.entryId)).toEqual(["e1", "e2"]);
    expect(detail.forecastVsBudget.favorability).toBe("FAVORABLE");
    expect(detail.sourceActions.budget.href).toContain("/dashboard/finance/budget");
  });

  it("hides actual evidence without permission", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const detail = buildFinanceManagementReportingDetailReadModel({
      ctx: ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_VIEW]),
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
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
      forecastMeasure: null,
      sourceVisibility: { approvedBudget: true, actual: false, currentForecast: false },
      actualCutoffDate: null,
      accountId: "acc-i",
      groupId: null,
      actualEntryRows: [],
      timingNavEnabled: false,
    });

    expect(detail.actualEvidence.availability).toBe("NOT_VISIBLE");
    expect(detail.actual.amountMinor).toBeNull();
  });

  it("returns NOT_FOUND for foreign account id in tree", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const detail = buildFinanceManagementReportingDetailReadModel({
      ctx: ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
      groups,
      accounts,
      approvedMeasure: null,
      actualMeasure: null,
      forecastMeasure: null,
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
      actualCutoffDate: null,
      accountId: "foreign-acc",
      groupId: null,
      actualEntryRows: [],
      timingNavEnabled: false,
    });
    expect(detail.availability).toBe("NOT_FOUND");
  });

  it("supports unassigned residual account drill-down", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-ui", "missing-group", "INCOME")];
    const detail = buildFinanceManagementReportingDetailReadModel({
      ctx: ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
      groups,
      accounts,
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "EUR",
        valuesByAccountId: new Map([["acc-ui", 30_00]]),
      },
      actualMeasure: {
        measure: "ACTUAL",
        grain: "ANNUAL_FULL_YEAR",
        cutoffDate: null,
        valuesByAccountId: new Map([["acc-ui", 25_00]]),
      },
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: new Map([["acc-ui", 35_00]]),
      },
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
      actualCutoffDate: null,
      accountId: "acc-ui",
      groupId: null,
      actualEntryRows: [],
      timingNavEnabled: false,
    });
    expect(detail.isUnassignedResidual).toBe(true);
    expect(detail.hierarchyPath.some((p) => p.id === FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID)).toBe(
      true,
    );
  });

  it("applies YTD cutoff to actual evidence", () => {
    const groups = [baseGroup("g1", null)];
    const accounts = [baseAccount("acc-i", "g1", "INCOME")];
    const cutoff = new Date("2026-02-01");
    const detail = buildFinanceManagementReportingDetailReadModel({
      ctx: ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      tenantId: tenantA,
      financeYearId: "year-1",
      financeYearName: "FY2026",
      baseCurrency: "EUR",
      structureAvailability: "AVAILABLE",
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
        cutoffDate: cutoff,
        valuesByAccountId: new Map([["acc-i", 50_00]]),
      },
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: new Map([["acc-i", 110_00]]),
      },
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
      actualCutoffDate: cutoff,
      accountId: "acc-i",
      groupId: null,
      actualEntryRows: [
        {
          id: "e-in",
          effectiveDate: new Date("2026-01-15"),
          amountMinor: 50_00,
          currency: "EUR",
          description: null,
        },
        {
          id: "e-out",
          effectiveDate: new Date("2026-04-01"),
          amountMinor: 99_00,
          currency: "EUR",
          description: null,
        },
      ],
      timingNavEnabled: false,
    });
    expect(detail.actualGrain).toBe("YTD");
    expect(detail.actualEvidence.entries.map((e) => e.entryId)).toEqual(["e-in"]);
  });
});

describe("FIN-05E detail loader tenant isolation", () => {
  it("returns NOT_FOUND for account outside tenant without leaking", async () => {
    const db = {
      financeConfiguration: { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "EUR", currentFinanceYearId: "y1" }) },
      financeYear: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "y1",
            tenantId: tenantA,
            name: "FY2026",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
          },
        ]),
      },
      financialReportingGroup: { findMany: vi.fn().mockResolvedValue([baseGroup("g1", null)]) },
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([baseAccount("acc-i", "g1", "INCOME")]),
      },
      financeBudget: { findUnique: vi.fn().mockResolvedValue(null) },
      financeForecast: { findUnique: vi.fn().mockResolvedValue(null) },
      financeActualEntry: { findMany: vi.fn() },
    };

    const model = await loadFinanceManagementReportingDetailReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      {
        financeYearId: "y1",
        accountId: "acc-other-tenant",
        groupId: null,
        timingNavEnabled: false,
      },
    );
    expect(model.availability).toBe("NOT_FOUND");
    expect(db.financeActualEntry.findMany).not.toHaveBeenCalled();
  });
});

describe("FIN-05E query shape", () => {
  it("declares lazy evidence loading", () => {
    expect(FINANCE_MANAGEMENT_REPORTING_DETAIL_QUERY_SHAPE.reusesManagementReportingMeasureLoads).toBe(
      true,
    );
  });
});
