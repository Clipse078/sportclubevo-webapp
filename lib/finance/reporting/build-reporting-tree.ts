import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";
import type {
  FinancialReportingAccountNode,
  FinancialReportingGroupNode,
  FinancialReportingTreeNode,
} from "@/lib/finance/reporting/reporting-read-model";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type ReportingStructureInput = {
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  /** Approved measure values keyed by financial account id (each account at most once). */
  valuesByAccountId: ReadonlyMap<string, number>;
};

const PLANNING_SEMANTICS = new Set(["INCOME", "EXPENSE"]);

function sumMinor(a: number, b: number): number {
  assertSafeAmountMinor(b);
  const next = a + b;
  if (!Number.isSafeInteger(next)) {
    throw new Error("FINANCE_AMOUNT_OVERFLOW");
  }
  return next;
}

function amountForAccount(
  accountId: string,
  valuesByAccountId: ReadonlyMap<string, number>,
): number {
  const value = valuesByAccountId.get(accountId);
  if (value === undefined) return 0;
  assertSafeAmountMinor(value);
  return value;
}

function aggregateGroupTotals(children: FinancialReportingTreeNode[]): {
  incomeMinor: number;
  expenseMinor: number;
} {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const child of children) {
    if (child.kind === "reporting_group") {
      incomeMinor = sumMinor(incomeMinor, child.incomeMinor);
      expenseMinor = sumMinor(expenseMinor, child.expenseMinor);
    } else {
      if (child.canonicalSemantic === "INCOME") {
        incomeMinor = sumMinor(incomeMinor, child.amountMinor);
      } else {
        expenseMinor = sumMinor(expenseMinor, child.amountMinor);
      }
    }
  }
  return { incomeMinor, expenseMinor };
}

export function buildFinancialReportingTree(
  input: ReportingStructureInput,
): FinancialReportingTreeNode[] {
  const accountsByGroup = new Map<string, FinancialAccount[]>();
  for (const account of input.accounts) {
    if (!PLANNING_SEMANTICS.has(account.canonicalSemantic)) continue;
    const list = accountsByGroup.get(account.reportingGroupId) ?? [];
    list.push(account);
    accountsByGroup.set(account.reportingGroupId, list);
  }

  function groupChildren(parentId: string | null): FinancialReportingTreeNode[] {
    const childGroups = input.groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const nodes: FinancialReportingTreeNode[] = [];

    for (const group of childGroups) {
      const nestedGroups = groupChildren(group.id);
      const groupAccounts = (accountsByGroup.get(group.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map(
          (account): FinancialReportingAccountNode => ({
            kind: "account",
            accountId: account.id,
            name: account.name,
            reportingGroupId: account.reportingGroupId,
            sortOrder: account.sortOrder,
            lifecycle: account.lifecycle,
            archivedAt: account.archivedAt,
            canonicalSemantic: account.canonicalSemantic as "INCOME" | "EXPENSE",
            amountMinor: amountForAccount(account.id, input.valuesByAccountId),
          }),
        );

      const children: FinancialReportingTreeNode[] = [...nestedGroups, ...groupAccounts];
      const totals = aggregateGroupTotals(children);

      const node: FinancialReportingGroupNode = {
        kind: "reporting_group",
        groupId: group.id,
        name: group.name,
        parentId: group.parentId,
        sortOrder: group.sortOrder,
        lifecycle: group.lifecycle,
        archivedAt: group.archivedAt,
        incomeMinor: totals.incomeMinor,
        expenseMinor: totals.expenseMinor,
        children,
      };
      nodes.push(node);
    }

    return nodes;
  }

  return groupChildren(null);
}

/** Sum top-level reporting groups only (accounts are nested — avoids double counting). */
export function summarizeReportingTree(
  tree: ReadonlyArray<FinancialReportingTreeNode>,
): { incomeMinor: number; expenseMinor: number } {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const node of tree) {
    if (node.kind === "reporting_group") {
      incomeMinor = sumMinor(incomeMinor, node.incomeMinor);
      expenseMinor = sumMinor(expenseMinor, node.expenseMinor);
    } else if (node.kind === "account") {
      if (node.canonicalSemantic === "INCOME") {
        incomeMinor = sumMinor(incomeMinor, node.amountMinor);
      } else {
        expenseMinor = sumMinor(expenseMinor, node.amountMinor);
      }
    }
  }
  return { incomeMinor, expenseMinor };
}
