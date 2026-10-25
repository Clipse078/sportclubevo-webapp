import type {
  ManagementPnlAccountRow,
  ManagementPnlGroupRow,
  ManagementPnlTreeNode,
} from "@/lib/finance/reporting/finance-management-pnl-read-model";
import { FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID } from "@/lib/finance/reporting/pnl-reporting-completeness";

export type ResolvedManagementPnlAccountTarget = {
  kind: "account";
  row: ManagementPnlAccountRow;
  hierarchyPath: Array<{ kind: "reporting_group" | "residual"; id: string; name: string }>;
  isUnassignedResidual: boolean;
};

export type ResolvedManagementPnlGroupTarget = {
  kind: "reporting_group";
  row: ManagementPnlGroupRow;
  hierarchyPath: Array<{ kind: "reporting_group" | "residual"; id: string; name: string }>;
};

export type ResolvedManagementPnlTarget =
  | ResolvedManagementPnlAccountTarget
  | ResolvedManagementPnlGroupTarget;

function walkNodes(
  nodes: ReadonlyArray<ManagementPnlTreeNode>,
  path: ResolvedManagementPnlAccountTarget["hierarchyPath"],
  findAccountId: string | null,
  findGroupId: string | null,
): ResolvedManagementPnlTarget | null {
  for (const node of nodes) {
    if (node.kind === "account" && findAccountId && node.accountId === findAccountId) {
      return { kind: "account", row: node, hierarchyPath: path, isUnassignedResidual: false };
    }
    if (node.kind === "reporting_group") {
      const groupPath = [...path, { kind: "reporting_group" as const, id: node.groupId, name: node.name }];
      if (findGroupId && node.groupId === findGroupId) {
        return { kind: "reporting_group", row: node, hierarchyPath: groupPath };
      }
      const nested = walkNodes(node.children, groupPath, findAccountId, findGroupId);
      if (nested) return nested;
    }
    if (node.kind === "unassigned_residual") {
      const residualPath = [
        ...path,
        {
          kind: "residual" as const,
          id: FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID,
          name: FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID,
        },
      ];
      for (const account of node.accounts) {
        if (findAccountId && account.accountId === findAccountId) {
          return {
            kind: "account",
            row: account,
            hierarchyPath: residualPath,
            isUnassignedResidual: true,
          };
        }
      }
    }
  }
  return null;
}

export function resolveManagementPnlTreeTarget(input: {
  incomeNodes: ReadonlyArray<ManagementPnlTreeNode>;
  expenseNodes: ReadonlyArray<ManagementPnlTreeNode>;
  accountId: string | null;
  groupId: string | null;
}): ResolvedManagementPnlTarget | null {
  if (input.accountId) {
    return (
      walkNodes(input.incomeNodes, [], input.accountId, null) ??
      walkNodes(input.expenseNodes, [], input.accountId, null)
    );
  }
  if (input.groupId) {
    return (
      walkNodes(input.incomeNodes, [], null, input.groupId) ??
      walkNodes(input.expenseNodes, [], null, input.groupId)
    );
  }
  return null;
}
