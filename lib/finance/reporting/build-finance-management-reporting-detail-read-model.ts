import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";
import { isEffectiveDateOnOrBeforeCutoff } from "@/lib/finance/actual/period-semantics";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  canManageActuals,
  canManageDraftBudget,
  canManageForecast,
  canViewFinanceActualMeasures,
  canViewFinanceBudgetMeasures,
  canViewFinanceForecastMeasures,
} from "@/lib/finance/finance-authorization";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import {
  buildManagementPnlResolutionSectionNodes,
  buildManagementPnlVarianceTree,
} from "@/lib/finance/reporting/build-management-pnl-tree";
import type { FinanceManagementReportingDetailReadModel } from "@/lib/finance/reporting/finance-management-reporting-detail-read-model";
import type { ApprovedBudgetMeasurePayload } from "@/lib/finance/reporting/approved-budget-measure-provider";
import type { ActualMeasurePayload } from "@/lib/finance/reporting/actual-measure-provider";
import type { CurrentForecastMeasurePayload } from "@/lib/finance/reporting/current-forecast-measure-provider";
import { resolveManagementPnlTreeTarget } from "@/lib/finance/reporting/resolve-management-pnl-tree-target";
import type {
  ManagementPnlAccountRow,
  ManagementPnlTreeNode,
} from "@/lib/finance/reporting/finance-management-pnl-read-model";

export type FinanceActualEntryDetailRow = {
  id: string;
  effectiveDate: Date;
  amountMinor: number;
  currency: string;
  description: string | null;
};

function emptyDetail(partial: Partial<FinanceManagementReportingDetailReadModel>): FinanceManagementReportingDetailReadModel {
  return {
    tenantId: partial.tenantId ?? "",
    financeYearId: partial.financeYearId ?? "",
    financeYearName: partial.financeYearName ?? "",
    baseCurrency: partial.baseCurrency ?? null,
    availability: partial.availability ?? "NOT_FOUND",
    targetKind: "ACCOUNT",
    accountId: null,
    groupId: null,
    name: "",
    lifecycle: "ACTIVE",
    archivedAt: null,
    canonicalSemantic: "INCOME",
    hierarchyPath: [],
    isUnassignedResidual: false,
    actualGrain: null,
    actualCutoffDate: null,
    approvedBudget: { availability: "NOT_VISIBLE", amountMinor: null },
    actual: { availability: "NOT_VISIBLE", amountMinor: null },
    currentForecast: { availability: "NOT_VISIBLE", amountMinor: null },
    forecastVsBudget: {
      availability: "BOTH_MISSING",
      baselineMinor: null,
      comparisonMinor: null,
      rawDeltaMinor: null,
      variancePercent: null,
      favorability: null,
      absoluteVarianceMagnitudeMinor: null,
    },
    actualEvidence: { availability: "NOT_VISIBLE", entries: [] },
    sourceActions: {
      budget: { canNavigate: false, href: null },
      actual: { canNavigate: false, href: null },
      forecast: { canNavigate: false, href: null },
      timing: { canNavigate: false, href: null },
    },
    childAccountSummaries: [],
  };
}

function collectGroupChildAccounts(children: readonly ManagementPnlTreeNode[]): ManagementPnlAccountRow[] {
  const accounts: ManagementPnlAccountRow[] = [];
  for (const child of children) {
    if (child.kind === "account") accounts.push(child);
  }
  return accounts;
}

function buildSourceActions(
  ctx: FinanceAuthContext,
  financeYearId: string,
  input: {
    budgetVisible: boolean;
    actualVisible: boolean;
    forecastVisible: boolean;
    timingNavEnabled: boolean;
  },
): FinanceManagementReportingDetailReadModel["sourceActions"] {
  const yearQuery = `yearId=${encodeURIComponent(financeYearId)}`;
  return {
    budget: {
      canNavigate: input.budgetVisible && canViewFinanceBudgetMeasures(ctx),
      href:
        input.budgetVisible && canViewFinanceBudgetMeasures(ctx)
          ? `/dashboard/finance/budget?${yearQuery}`
          : null,
    },
    actual: {
      canNavigate: input.actualVisible && canViewFinanceActualMeasures(ctx),
      href:
        input.actualVisible && canViewFinanceActualMeasures(ctx)
          ? `/dashboard/finance/actuals?${yearQuery}`
          : null,
    },
    forecast: {
      canNavigate: input.forecastVisible && canViewFinanceForecastMeasures(ctx),
      href:
        input.forecastVisible && canViewFinanceForecastMeasures(ctx)
          ? `/dashboard/finance/forecast?${yearQuery}`
          : null,
    },
    timing: {
      canNavigate: input.timingNavEnabled && canViewFinanceForecastMeasures(ctx),
      href:
        input.timingNavEnabled && canViewFinanceForecastMeasures(ctx)
          ? `/dashboard/finance/forecast/timing?${yearQuery}`
          : null,
    },
  };
}

function filterActualEvidenceEntries(input: {
  entries: readonly FinanceActualEntryDetailRow[];
  grain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  cutoffDate: Date | null;
}): FinanceActualEntryDetailRow[] {
  const scoped =
    input.grain === "YTD" && input.cutoffDate
      ? input.entries.filter((e) => isEffectiveDateOnOrBeforeCutoff(e.effectiveDate, input.cutoffDate!))
      : [...input.entries];
  return scoped.sort(
    (a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime() || a.id.localeCompare(b.id),
  );
}

export function buildFinanceManagementReportingDetailReadModel(input: {
  ctx: FinanceAuthContext;
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  baseCurrency: string | null;
  structureAvailability: "AVAILABLE" | "NO_STRUCTURE";
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  approvedMeasure: ApprovedBudgetMeasurePayload | null;
  actualMeasure: ActualMeasurePayload | null;
  forecastMeasure: CurrentForecastMeasurePayload | null;
  sourceVisibility: {
    approvedBudget: boolean;
    actual: boolean;
    currentForecast: boolean;
  };
  actualCutoffDate: Date | null;
  accountId: string | null;
  groupId: string | null;
  actualEntryRows: readonly FinanceActualEntryDetailRow[];
  timingNavEnabled: boolean;
}): FinanceManagementReportingDetailReadModel {
  if (input.structureAvailability !== "AVAILABLE") {
    return emptyDetail({
      tenantId: input.tenantId,
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      baseCurrency: input.baseCurrency,
      availability: "NO_STRUCTURE",
    });
  }

  if (!input.accountId && !input.groupId) {
    return emptyDetail({
      tenantId: input.tenantId,
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      baseCurrency: input.baseCurrency,
      availability: "NOT_FOUND",
    });
  }

  const budgetMap = input.sourceVisibility.approvedBudget
    ? (input.approvedMeasure?.valuesByAccountId ?? null)
    : null;
  const actualMap = input.sourceVisibility.actual
    ? (input.actualMeasure?.valuesByAccountId ?? null)
    : null;
  const forecastMap = input.sourceVisibility.currentForecast
    ? (input.forecastMeasure?.valuesByAccountId ?? null)
    : null;

  const { varianceTree, unassignedAccounts } = buildManagementPnlVarianceTree({
    groups: input.groups,
    accounts: input.accounts,
    budgetMap,
    forecastMap,
    budgetVisible: input.sourceVisibility.approvedBudget,
    forecastVisible: input.sourceVisibility.currentForecast,
  });

  const resolutionTrees = buildManagementPnlResolutionSectionNodes({
    groups: input.groups,
    accounts: input.accounts,
    budgetVisible: input.sourceVisibility.approvedBudget,
    actualVisible: input.sourceVisibility.actual,
    forecastVisible: input.sourceVisibility.currentForecast,
    budgetMap,
    actualMap,
    forecastMap,
    varianceTree,
    unassignedAccounts,
  });

  const pnl = buildFinanceManagementPnlReadModel({
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    baseCurrency: input.baseCurrency,
    structureAvailability: "AVAILABLE",
    actualCutoffDate: input.actualCutoffDate,
    groups: input.groups,
    accounts: input.accounts,
    approvedMeasure: input.approvedMeasure,
    actualMeasure: input.actualMeasure,
    forecastMeasure: input.forecastMeasure,
    sourceVisibility: input.sourceVisibility,
  });

  function containsGroupId(node: ManagementPnlTreeNode, targetGroupId: string): boolean {
    if (node.kind === "reporting_group") {
      if (node.groupId === targetGroupId) return true;
      return node.children.some((c) => containsGroupId(c, targetGroupId));
    }
    return false;
  }

  const resolved = resolveManagementPnlTreeTarget({
    incomeNodes: resolutionTrees.incomeNodes,
    expenseNodes: resolutionTrees.expenseNodes,
    accountId: input.accountId,
    groupId: input.groupId,
  });

  const groupInIncome =
    input.groupId != null &&
    resolutionTrees.incomeNodes.some((n) => containsGroupId(n, input.groupId!));

  if (!resolved) {
    return emptyDetail({
      tenantId: input.tenantId,
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      baseCurrency: input.baseCurrency,
      availability: "NOT_FOUND",
    });
  }

  const sourceActions = buildSourceActions(input.ctx, input.financeYearId, {
    budgetVisible: input.sourceVisibility.approvedBudget,
    actualVisible: input.sourceVisibility.actual,
    forecastVisible: input.sourceVisibility.currentForecast,
    timingNavEnabled: input.timingNavEnabled,
  });

  if (resolved.kind === "account") {
    const evidenceVisible = input.sourceVisibility.actual && canViewFinanceActualMeasures(input.ctx);
    const filtered = evidenceVisible
      ? filterActualEvidenceEntries({
          entries: input.actualEntryRows,
          grain: pnl.actualGrain,
          cutoffDate: pnl.actualCutoffDate,
        })
      : [];

    return {
      tenantId: input.tenantId,
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      baseCurrency: input.baseCurrency,
      availability: "AVAILABLE",
      targetKind: "ACCOUNT",
      accountId: resolved.row.accountId,
      groupId: resolved.row.reportingGroupId,
      name: resolved.row.name,
      lifecycle: resolved.row.lifecycle,
      archivedAt: resolved.row.archivedAt,
      canonicalSemantic: resolved.row.canonicalSemantic,
      hierarchyPath: resolved.hierarchyPath,
      isUnassignedResidual: resolved.isUnassignedResidual,
      actualGrain: pnl.actualGrain,
      actualCutoffDate: pnl.actualCutoffDate,
      approvedBudget: resolved.row.approvedBudget,
      actual: resolved.row.actual,
      currentForecast: resolved.row.currentForecast,
      forecastVsBudget: resolved.row.forecastVsBudget,
      actualEvidence: {
        availability: !evidenceVisible
          ? "NOT_VISIBLE"
          : filtered.length > 0
            ? "AVAILABLE"
            : "NO_ENTRIES",
        entries: evidenceVisible
          ? filtered.map((e) => ({
              entryId: e.id,
              effectiveDate: e.effectiveDate,
              amountMinor: e.amountMinor,
              currency: e.currency,
              description: e.description,
            }))
          : [],
      },
      sourceActions,
      childAccountSummaries: [],
    };
  }

  const childAccounts = collectGroupChildAccounts(resolved.row.children);

  return {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    baseCurrency: input.baseCurrency,
    availability: "AVAILABLE",
    targetKind: "REPORTING_GROUP",
    accountId: null,
    groupId: resolved.row.groupId,
    name: resolved.row.name,
    lifecycle: resolved.row.lifecycle,
    archivedAt: resolved.row.archivedAt,
    canonicalSemantic: childAccounts[0]?.canonicalSemantic ?? (groupInIncome ? "INCOME" : "EXPENSE"),
    hierarchyPath: resolved.hierarchyPath,
    isUnassignedResidual: false,
    actualGrain: pnl.actualGrain,
    actualCutoffDate: pnl.actualCutoffDate,
    approvedBudget: resolved.row.approvedBudget,
    actual: resolved.row.actual,
    currentForecast: resolved.row.currentForecast,
    forecastVsBudget: resolved.row.forecastVsBudget,
    actualEvidence: { availability: "NOT_VISIBLE", entries: [] },
    sourceActions,
    childAccountSummaries: childAccounts.map((a) => ({
      accountId: a.accountId,
      name: a.name,
      lifecycle: a.lifecycle,
      approvedBudget: a.approvedBudget,
      actual: a.actual,
      currentForecast: a.currentForecast,
      forecastVsBudget: a.forecastVsBudget,
    })),
  };
}

/** Intentionally unused in read model — navigation uses view permissions only; manage is not required to open source workspaces. */
export const FINANCE_REPORTING_DETAIL_MANAGE_CAPABILITIES = {
  budgetManage: canManageDraftBudget,
  actualManage: canManageActuals,
  forecastManage: canManageForecast,
} as const;
