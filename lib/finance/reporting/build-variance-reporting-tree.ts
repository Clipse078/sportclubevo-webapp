import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";
import { computeSemanticVarianceMetrics } from "@/lib/finance/actual/variance-semantics";
import {
  absoluteVarianceMagnitude,
  resolveComparisonAvailabilityFromSides,
  type FinanceReportingComparisonSlice,
} from "@/lib/finance/reporting/reporting-comparison-model";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type VarianceReportingAccountNode = {
  kind: "account";
  accountId: string;
  name: string;
  reportingGroupId: string;
  sortOrder: number;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  canonicalSemantic: "INCOME" | "EXPENSE";
  baselineMinor: number | null;
  comparisonMinor: number | null;
  comparison: FinanceReportingComparisonSlice;
};

export type VarianceReportingGroupNode = {
  kind: "reporting_group";
  groupId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  lifecycle: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  incomeComparison: FinanceReportingComparisonSlice;
  expenseComparison: FinanceReportingComparisonSlice;
  children: VarianceReportingTreeNode[];
};

export type VarianceReportingTreeNode = VarianceReportingGroupNode | VarianceReportingAccountNode;

const PLANNING_SEMANTICS = new Set(["INCOME", "EXPENSE"]);

function amountForAccount(
  accountId: string,
  values: ReadonlyMap<string, number> | null,
): number | null {
  if (!values) return null;
  const value = values.get(accountId);
  if (value === undefined) return null;
  assertSafeAmountMinor(value);
  return value;
}

function buildComparisonSlice(input: {
  canonicalSemantic: "INCOME" | "EXPENSE";
  baselineMinor: number | null;
  comparisonMinor: number | null;
  periodMismatch?: boolean;
}): FinanceReportingComparisonSlice {
  const metrics = computeSemanticVarianceMetrics({
    canonicalSemantic: input.canonicalSemantic,
    baselineMinor: input.baselineMinor,
    comparisonMinor: input.comparisonMinor,
  });
  const availability = resolveComparisonAvailabilityFromSides({
    hasBaseline: metrics.hasBaseline,
    hasComparison: metrics.hasComparison,
    periodMismatch: input.periodMismatch,
  });
  return {
    availability,
    baselineMinor: metrics.baselineMinor,
    comparisonMinor: metrics.comparisonMinor,
    rawDeltaMinor: metrics.rawDeltaMinor,
    variancePercent: metrics.variancePercent,
    favorability: metrics.favorability,
    absoluteVarianceMagnitudeMinor: absoluteVarianceMagnitude(metrics.rawDeltaMinor),
  };
}

function sumSemanticComparison(
  children: VarianceReportingTreeNode[],
  semantic: "INCOME" | "EXPENSE",
): FinanceReportingComparisonSlice {
  let baseline: number | null = null;
  let comparison: number | null = null;
  let hasAnyBaseline = false;
  let hasAnyComparison = false;

  for (const child of children) {
    let slice: FinanceReportingComparisonSlice;
    if (child.kind === "account") {
      if (child.canonicalSemantic !== semantic) continue;
      slice = child.comparison;
    } else {
      slice = semantic === "INCOME" ? child.incomeComparison : child.expenseComparison;
    }
    if (slice.baselineMinor !== null) {
      hasAnyBaseline = true;
      baseline = (baseline ?? 0) + slice.baselineMinor;
    }
    if (slice.comparisonMinor !== null) {
      hasAnyComparison = true;
      comparison = (comparison ?? 0) + slice.comparisonMinor;
    }
  }

  return buildComparisonSlice({
    canonicalSemantic: semantic,
    baselineMinor: hasAnyBaseline ? baseline : null,
    comparisonMinor: hasAnyComparison ? comparison : null,
  });
}

export function buildVarianceReportingTree(input: {
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  baselineByAccountId: ReadonlyMap<string, number> | null;
  comparisonByAccountId: ReadonlyMap<string, number> | null;
  periodMismatch?: boolean;
}): VarianceReportingTreeNode[] {
  const accountsByGroup = new Map<string, FinancialAccount[]>();
  for (const account of input.accounts) {
    if (!PLANNING_SEMANTICS.has(account.canonicalSemantic)) continue;
    const list = accountsByGroup.get(account.reportingGroupId) ?? [];
    list.push(account);
    accountsByGroup.set(account.reportingGroupId, list);
  }

  function groupChildren(parentId: string | null): VarianceReportingTreeNode[] {
    const childGroups = input.groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const nodes: VarianceReportingTreeNode[] = [];

    for (const group of childGroups) {
      const nestedGroups = groupChildren(group.id);
      const groupAccounts = (accountsByGroup.get(group.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((account): VarianceReportingAccountNode => {
          const baselineMinor = amountForAccount(account.id, input.baselineByAccountId);
          const comparisonMinor = amountForAccount(account.id, input.comparisonByAccountId);
          return {
            kind: "account",
            accountId: account.id,
            name: account.name,
            reportingGroupId: account.reportingGroupId,
            sortOrder: account.sortOrder,
            lifecycle: account.lifecycle,
            archivedAt: account.archivedAt,
            canonicalSemantic: account.canonicalSemantic as "INCOME" | "EXPENSE",
            baselineMinor,
            comparisonMinor,
            comparison: buildComparisonSlice({
              canonicalSemantic: account.canonicalSemantic as "INCOME" | "EXPENSE",
              baselineMinor,
              comparisonMinor,
              periodMismatch: input.periodMismatch,
            }),
          };
        });

      const children: VarianceReportingTreeNode[] = [...nestedGroups, ...groupAccounts];
      const node: VarianceReportingGroupNode = {
        kind: "reporting_group",
        groupId: group.id,
        name: group.name,
        parentId: group.parentId,
        sortOrder: group.sortOrder,
        lifecycle: group.lifecycle,
        archivedAt: group.archivedAt,
        incomeComparison: sumSemanticComparison(children, "INCOME"),
        expenseComparison: sumSemanticComparison(children, "EXPENSE"),
        children,
      };
      nodes.push(node);
    }

    return nodes;
  }

  return groupChildren(null);
}

export function collectAccountVarianceNodes(
  tree: ReadonlyArray<VarianceReportingTreeNode>,
): VarianceReportingAccountNode[] {
  const accounts: VarianceReportingAccountNode[] = [];
  function walk(nodes: ReadonlyArray<VarianceReportingTreeNode>) {
    for (const node of nodes) {
      if (node.kind === "account") {
        accounts.push(node);
      } else {
        walk(node.children);
      }
    }
  }
  walk(tree);
  return accounts;
}

export function summarizeVarianceTreeResult(
  tree: ReadonlyArray<VarianceReportingTreeNode>,
): FinanceReportingComparisonSlice {
  const income = sumSemanticComparison([...tree], "INCOME");
  const expense = sumSemanticComparison([...tree], "EXPENSE");

  const baselineIncome = income.baselineMinor ?? 0;
  const baselineExpense = expense.baselineMinor ?? 0;
  const comparisonIncome = income.comparisonMinor ?? 0;
  const comparisonExpense = expense.comparisonMinor ?? 0;

  const hasBaseline = income.baselineMinor !== null || expense.baselineMinor !== null;
  const hasComparison = income.comparisonMinor !== null || expense.comparisonMinor !== null;

  const baselineResult = hasBaseline ? baselineIncome - baselineExpense : null;
  const comparisonResult = hasComparison ? comparisonIncome - comparisonExpense : null;

  return buildComparisonSlice({
    canonicalSemantic: "INCOME",
    baselineMinor: baselineResult,
    comparisonMinor: comparisonResult,
  });
}
