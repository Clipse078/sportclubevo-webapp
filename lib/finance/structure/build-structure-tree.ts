import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";

export type FinanceStructureTreeNode =
  | {
      type: "group";
      id: string;
      name: string;
      parentId: string | null;
      sortOrder: number;
      lifecycle: FinancialReportingGroup["lifecycle"];
      archivedAt: Date | null;
      children: FinanceStructureTreeNode[];
    }
  | {
      type: "account";
      id: string;
      name: string;
      reportingGroupId: string;
      sortOrder: number;
      lifecycle: FinancialAccount["lifecycle"];
      archivedAt: Date | null;
      canonicalSemantic: FinancialAccount["canonicalSemantic"];
    };

export function buildFinanceStructureTree(input: {
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
}): FinanceStructureTreeNode[] {
  const accountsByGroup = new Map<string, FinancialAccount[]>();
  for (const account of input.accounts) {
    const list = accountsByGroup.get(account.reportingGroupId) ?? [];
    list.push(account);
    accountsByGroup.set(account.reportingGroupId, list);
  }

  function groupChildren(parentId: string | null): FinanceStructureTreeNode[] {
    const childGroups = input.groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const nodes: FinanceStructureTreeNode[] = [];

    for (const group of childGroups) {
      const nestedGroups = groupChildren(group.id);
      const groupAccounts = (accountsByGroup.get(group.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map(
          (account): FinanceStructureTreeNode => ({
            type: "account",
            id: account.id,
            name: account.name,
            reportingGroupId: account.reportingGroupId,
            sortOrder: account.sortOrder,
            lifecycle: account.lifecycle,
            archivedAt: account.archivedAt,
            canonicalSemantic: account.canonicalSemantic,
          }),
        );

      nodes.push({
        type: "group",
        id: group.id,
        name: group.name,
        parentId: group.parentId,
        sortOrder: group.sortOrder,
        lifecycle: group.lifecycle,
        archivedAt: group.archivedAt,
        children: [...nestedGroups, ...groupAccounts],
      });
    }

    return nodes;
  }

  return groupChildren(null);
}

export function financeStructureIsEmpty(input: {
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
}): boolean {
  return input.groups.length === 0 && input.accounts.length === 0;
}

/** Detect orphan groups not reachable from roots (should not happen with integrity). */
export function assertFinanceStructureGroupIntegrity(groups: FinancialReportingGroup[]): void {
  const roots = groups.filter((g) => g.parentId === null);
  if (groups.length > 0 && roots.length === 0) {
    throw new Error("FINANCE_STRUCTURE_ORPHAN_GROUPS");
  }
}

export function findFinanceStructureGroup(
  groups: FinancialReportingGroup[],
  id: string,
): FinancialReportingGroup | undefined {
  return groups.find((g) => g.id === id);
}
