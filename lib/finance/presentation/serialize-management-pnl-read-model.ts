import type {
  FinanceManagementPnlReadModel,
  ManagementPnlAccountRow,
  ManagementPnlGroupRow,
  ManagementPnlUnassignedResidualRow,
} from "@/lib/finance/reporting/finance-management-pnl-read-model";

export type SerializedManagementPnlAccountRow = Omit<ManagementPnlAccountRow, "archivedAt"> & {
  archivedAt: string | null;
};

export type SerializedManagementPnlGroupRow = Omit<ManagementPnlGroupRow, "archivedAt" | "children"> & {
  archivedAt: string | null;
  children: SerializedManagementPnlTreeNode[];
};

export type SerializedManagementPnlUnassignedResidualRow = Omit<
  ManagementPnlUnassignedResidualRow,
  "accounts"
> & {
  accounts: SerializedManagementPnlAccountRow[];
};

export type SerializedManagementPnlTreeNode =
  | SerializedManagementPnlAccountRow
  | SerializedManagementPnlGroupRow
  | SerializedManagementPnlUnassignedResidualRow;

export type SerializedManagementPnlSection = Omit<
  FinanceManagementPnlReadModel["incomeSection"],
  "nodes"
> & {
  nodes: SerializedManagementPnlTreeNode[];
};

/** Client-safe Management P&L payload (dates as ISO strings). */
export type SerializedFinanceManagementPnlReadModel = Omit<
  FinanceManagementPnlReadModel,
  "actualCutoffDate" | "incomeSection" | "expenseSection"
> & {
  actualCutoffDate: string | null;
  incomeSection: SerializedManagementPnlSection;
  expenseSection: SerializedManagementPnlSection;
};

function serializeAccount(account: ManagementPnlAccountRow): SerializedManagementPnlAccountRow {
  return {
    ...account,
    archivedAt: account.archivedAt?.toISOString() ?? null,
  };
}

function serializeNode(node: FinanceManagementPnlReadModel["incomeSection"]["nodes"][number]): SerializedManagementPnlTreeNode {
  if (node.kind === "account") {
    return serializeAccount(node);
  }
  if (node.kind === "unassigned_residual") {
    return {
      ...node,
      accounts: node.accounts.map(serializeAccount),
    };
  }
  return {
    ...node,
    archivedAt: node.archivedAt?.toISOString() ?? null,
    children: node.children.map(serializeNode),
  };
}

function serializeSection(
  section: FinanceManagementPnlReadModel["incomeSection"],
): SerializedManagementPnlSection {
  return {
    ...section,
    nodes: section.nodes.map(serializeNode),
  };
}

export function serializeFinanceManagementPnlReadModel(
  model: FinanceManagementPnlReadModel,
): SerializedFinanceManagementPnlReadModel {
  const { actualCutoffDate, incomeSection, expenseSection, ...rest } = model;
  return {
    ...rest,
    actualCutoffDate: actualCutoffDate?.toISOString() ?? null,
    incomeSection: serializeSection(incomeSection),
    expenseSection: serializeSection(expenseSection),
  };
}
