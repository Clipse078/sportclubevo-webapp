import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";
import { computeCanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import {
  collectAccountVarianceNodes,
  type VarianceReportingTreeNode,
} from "@/lib/finance/reporting/build-variance-reporting-tree";

export const FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID =
  "__sce_management_pnl_unassigned__" as const;

const PLANNING_SEMANTICS = new Set(["INCOME", "EXPENSE"]);

export function collectReachableReportingGroupIds(
  groups: ReadonlyArray<FinancialReportingGroup>,
): Set<string> {
  const byParent = new Map<string | null, FinancialReportingGroup[]>();
  for (const group of groups) {
    const list = byParent.get(group.parentId) ?? [];
    list.push(group);
    byParent.set(group.parentId, list);
  }

  const reachable = new Set<string>();
  function walk(parentId: string | null) {
    for (const group of byParent.get(parentId) ?? []) {
      reachable.add(group.id);
      walk(group.id);
    }
  }
  walk(null);
  return reachable;
}

export function collectHierarchyRepresentedAccountIds(
  tree: ReadonlyArray<VarianceReportingTreeNode>,
): Set<string> {
  return new Set(collectAccountVarianceNodes(tree).map((node) => node.accountId));
}

export function findUnrepresentedPlanningAccounts(input: {
  accounts: ReadonlyArray<FinancialAccount>;
  groups: ReadonlyArray<FinancialReportingGroup>;
  hierarchyTree: ReadonlyArray<VarianceReportingTreeNode>;
}): FinancialAccount[] {
  const represented = collectHierarchyRepresentedAccountIds(input.hierarchyTree);
  const reachableGroups = collectReachableReportingGroupIds(input.groups);
  const groupIds = new Set(input.groups.map((g) => g.id));

  return input.accounts.filter((account) => {
    if (!PLANNING_SEMANTICS.has(account.canonicalSemantic)) return false;
    if (represented.has(account.id)) return false;
    const groupMissing = !groupIds.has(account.reportingGroupId);
    const groupUnreachable = !reachableGroups.has(account.reportingGroupId);
    return groupMissing || groupUnreachable;
  });
}

export function accountHasFinancialValueInAnySource(input: {
  accountId: string;
  approvedBudgetByAccountId: ReadonlyMap<string, number> | null;
  actualByAccountId: ReadonlyMap<string, number> | null;
  forecastByAccountId: ReadonlyMap<string, number> | null;
}): boolean {
  const sources = [
    input.approvedBudgetByAccountId,
    input.actualByAccountId,
    input.forecastByAccountId,
  ];
  for (const map of sources) {
    if (!map) continue;
    const value = map.get(input.accountId);
    if (value !== undefined && value !== 0) return true;
  }
  return false;
}

export function shouldSurfaceUnassignedResidualGroup(
  accounts: ReadonlyArray<FinancialAccount>,
  input: {
    approvedBudgetByAccountId: ReadonlyMap<string, number> | null;
    actualByAccountId: ReadonlyMap<string, number> | null;
    forecastByAccountId: ReadonlyMap<string, number> | null;
  },
): boolean {
  if (accounts.length === 0) return false;
  return accounts.some((account) =>
    accountHasFinancialValueInAnySource({ accountId: account.id, ...input }),
  );
}

export function amountFromSourceMap(
  accountId: string,
  map: ReadonlyMap<string, number> | null,
  visible: boolean,
): number | null {
  if (!visible || !map) return null;
  const value = map.get(accountId);
  if (value === undefined) return 0;
  return value;
}

export function computeCanonicalSourceSectionTotals(input: {
  accounts: ReadonlyArray<FinancialAccount>;
  valuesByAccountId: ReadonlyMap<string, number> | null;
  sourceVisible: boolean;
}): { incomeMinor: number | null; expenseMinor: number | null; resultMinor: number | null } {
  if (!input.sourceVisible || !input.valuesByAccountId) {
    return { incomeMinor: null, expenseMinor: null, resultMinor: null };
  }
  const planning = input.accounts.filter((a) => PLANNING_SEMANTICS.has(a.canonicalSemantic));
  const lines = planning.map((account) => ({
    amountMinor: input.valuesByAccountId!.get(account.id) ?? 0,
    canonicalSemantic: account.canonicalSemantic as "INCOME" | "EXPENSE",
  }));
  const result = computeCanonicalFinancialResult(lines);
  return {
    incomeMinor: result.incomeMinor,
    expenseMinor: result.expenseMinor,
    resultMinor: result.resultMinor,
  };
}

export type PnlReconciliationSlice = {
  canonicalIncomeMinor: number | null;
  canonicalExpenseMinor: number | null;
  canonicalResultMinor: number | null;
  representedIncomeMinor: number | null;
  representedExpenseMinor: number | null;
  representedResultMinor: number | null;
  reconciles: boolean;
};

export function reconcilePnlSectionTotals(input: {
  canonical: { incomeMinor: number | null; expenseMinor: number | null };
  represented: { incomeMinor: number | null; expenseMinor: number | null };
}): PnlReconciliationSlice {
  const canonicalResultMinor =
    input.canonical.incomeMinor !== null && input.canonical.expenseMinor !== null
      ? input.canonical.incomeMinor - input.canonical.expenseMinor
      : null;
  const representedResultMinor =
    input.represented.incomeMinor !== null && input.represented.expenseMinor !== null
      ? input.represented.incomeMinor - input.represented.expenseMinor
      : null;

  const reconciles =
    input.canonical.incomeMinor === input.represented.incomeMinor &&
    input.canonical.expenseMinor === input.represented.expenseMinor &&
    canonicalResultMinor === representedResultMinor;

  return {
    canonicalIncomeMinor: input.canonical.incomeMinor,
    canonicalExpenseMinor: input.canonical.expenseMinor,
    canonicalResultMinor,
    representedIncomeMinor: input.represented.incomeMinor,
    representedExpenseMinor: input.represented.expenseMinor,
    representedResultMinor,
    reconciles,
  };
}
