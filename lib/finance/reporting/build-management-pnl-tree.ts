import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";
import { computeSemanticVarianceMetrics } from "@/lib/finance/actual/variance-semantics";
import {
  buildVarianceReportingTree,
  type VarianceReportingAccountNode,
  type VarianceReportingGroupNode,
  type VarianceReportingTreeNode,
} from "@/lib/finance/reporting/build-variance-reporting-tree";
import type {
  ManagementPnlAccountRow,
  ManagementPnlGroupRow,
  ManagementPnlMeasureCell,
  ManagementPnlSemanticSection,
  ManagementPnlTreeNode,
  ManagementPnlUnassignedResidualRow,
} from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { FinanceManagementMeasureAvailability } from "@/lib/finance/reporting/finance-management-overview-read-model";
import {
  amountFromSourceMap,
  FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID,
  findUnrepresentedPlanningAccounts,
  shouldSurfaceUnassignedResidualGroup,
} from "@/lib/finance/reporting/pnl-reporting-completeness";
import {
  absoluteVarianceMagnitude,
  resolveComparisonAvailabilityFromSides,
  type FinanceReportingComparisonSlice,
} from "@/lib/finance/reporting/reporting-comparison-model";

function measureCell(
  visible: boolean,
  map: ReadonlyMap<string, number> | null,
  accountId: string,
  missingCode: FinanceManagementMeasureAvailability,
): ManagementPnlMeasureCell {
  if (!visible) return { availability: "NOT_VISIBLE", amountMinor: null };
  if (!map) return { availability: missingCode, amountMinor: null };
  return { availability: "AVAILABLE", amountMinor: amountFromSourceMap(accountId, map, true) };
}

function buildForecastVsBudgetSlice(input: {
  canonicalSemantic: "INCOME" | "EXPENSE";
  baselineMinor: number | null;
  comparisonMinor: number | null;
}): FinanceReportingComparisonSlice {
  const metrics = computeSemanticVarianceMetrics({
    canonicalSemantic: input.canonicalSemantic,
    baselineMinor: input.baselineMinor,
    comparisonMinor: input.comparisonMinor,
  });
  return {
    availability: resolveComparisonAvailabilityFromSides({
      hasBaseline: metrics.hasBaseline,
      hasComparison: metrics.hasComparison,
    }),
    baselineMinor: metrics.baselineMinor,
    comparisonMinor: metrics.comparisonMinor,
    rawDeltaMinor: metrics.rawDeltaMinor,
    variancePercent: metrics.variancePercent,
    favorability: metrics.favorability,
    absoluteVarianceMagnitudeMinor: absoluteVarianceMagnitude(metrics.rawDeltaMinor),
  };
}

function sumMeasureCells(
  cells: ReadonlyArray<ManagementPnlMeasureCell>,
): ManagementPnlMeasureCell {
  let hasAny = false;
  let total = 0;
  for (const cell of cells) {
    if (cell.availability === "NOT_VISIBLE") continue;
    if (cell.amountMinor === null) continue;
    hasAny = true;
    total += cell.amountMinor;
  }
  if (!hasAny) {
    const availability = cells.some((c) => c.availability === "AVAILABLE")
      ? "AVAILABLE"
      : cells[0]?.availability ?? "NOT_VISIBLE";
    return { availability, amountMinor: null };
  }
  return { availability: "AVAILABLE", amountMinor: total };
}

function accountRowFromVarianceNode(
  node: VarianceReportingAccountNode,
  input: {
    budgetVisible: boolean;
    actualVisible: boolean;
    forecastVisible: boolean;
    budgetMap: ReadonlyMap<string, number> | null;
    actualMap: ReadonlyMap<string, number> | null;
    forecastMap: ReadonlyMap<string, number> | null;
  },
): ManagementPnlAccountRow {
  return {
    kind: "account",
    accountId: node.accountId,
    name: node.name,
    reportingGroupId: node.reportingGroupId,
    sortOrder: node.sortOrder,
    lifecycle: node.lifecycle,
    archivedAt: node.archivedAt,
    canonicalSemantic: node.canonicalSemantic,
    approvedBudget: measureCell(
      input.budgetVisible,
      input.budgetMap,
      node.accountId,
      "NO_APPROVED_BUDGET",
    ),
    actual: measureCell(input.actualVisible, input.actualMap, node.accountId, "NO_ACTUAL"),
    currentForecast: measureCell(
      input.forecastVisible,
      input.forecastMap,
      node.accountId,
      "NO_CURRENT_FORECAST",
    ),
    forecastVsBudget: node.comparison,
  };
}

function groupRowFromVarianceNode(
  node: VarianceReportingGroupNode,
  semantic: "INCOME" | "EXPENSE",
  children: ManagementPnlTreeNode[],
  forecastSlice: FinanceReportingComparisonSlice,
  rolledMeasures: {
    approvedBudget: ManagementPnlMeasureCell;
    actual: ManagementPnlMeasureCell;
    currentForecast: ManagementPnlMeasureCell;
  },
): ManagementPnlGroupRow {
  return {
    kind: "reporting_group",
    groupId: node.groupId,
    name: node.name,
    parentId: node.parentId,
    sortOrder: node.sortOrder,
    lifecycle: node.lifecycle,
    archivedAt: node.archivedAt,
    approvedBudget: rolledMeasures.approvedBudget,
    actual: rolledMeasures.actual,
    currentForecast: rolledMeasures.currentForecast,
    forecastVsBudget: forecastSlice,
    children,
  };
}

function rollGroupMeasures(children: ManagementPnlTreeNode[]): {
  approvedBudget: ManagementPnlMeasureCell;
  actual: ManagementPnlMeasureCell;
  currentForecast: ManagementPnlMeasureCell;
} {
  const collect = (field: "approvedBudget" | "actual" | "currentForecast") =>
    sumMeasureCells(children.map((child) => child[field]));
  return {
    approvedBudget: collect("approvedBudget"),
    actual: collect("actual"),
    currentForecast: collect("currentForecast"),
  };
}

function transformGroupForSemantic(
  node: VarianceReportingGroupNode,
  semantic: "INCOME" | "EXPENSE",
  input: {
    budgetVisible: boolean;
    actualVisible: boolean;
    forecastVisible: boolean;
    budgetMap: ReadonlyMap<string, number> | null;
    actualMap: ReadonlyMap<string, number> | null;
    forecastMap: ReadonlyMap<string, number> | null;
  },
): ManagementPnlTreeNode | null {
  const childNodes: ManagementPnlTreeNode[] = [];
  for (const child of node.children) {
    const transformed = transformNodeForSemantic(child, semantic, input);
    if (transformed) childNodes.push(transformed);
  }
  if (childNodes.length === 0) return null;

  const forecastSlice =
    semantic === "INCOME" ? node.incomeComparison : node.expenseComparison;
  const rolled = rollGroupMeasures(childNodes);
  return groupRowFromVarianceNode(node, semantic, childNodes, forecastSlice, rolled);
}

function transformNodeForSemantic(
  node: VarianceReportingTreeNode,
  semantic: "INCOME" | "EXPENSE",
  input: {
    budgetVisible: boolean;
    actualVisible: boolean;
    forecastVisible: boolean;
    budgetMap: ReadonlyMap<string, number> | null;
    actualMap: ReadonlyMap<string, number> | null;
    forecastMap: ReadonlyMap<string, number> | null;
  },
): ManagementPnlTreeNode | null {
  if (node.kind === "account") {
    if (node.canonicalSemantic !== semantic) return null;
    return accountRowFromVarianceNode(node, input);
  }
  return transformGroupForSemantic(node, semantic, input);
}

function buildUnassignedResidual(
  semantic: "INCOME" | "EXPENSE",
  accounts: FinancialAccount[],
  varianceTree: ReadonlyArray<VarianceReportingTreeNode>,
  input: {
    budgetVisible: boolean;
    actualVisible: boolean;
    forecastVisible: boolean;
    budgetMap: ReadonlyMap<string, number> | null;
    actualMap: ReadonlyMap<string, number> | null;
    forecastMap: ReadonlyMap<string, number> | null;
  },
): ManagementPnlUnassignedResidualRow | null {
  const semanticAccounts = accounts.filter((a) => a.canonicalSemantic === semantic);
  if (
    !shouldSurfaceUnassignedResidualGroup(semanticAccounts, {
      approvedBudgetByAccountId: input.budgetMap,
      actualByAccountId: input.actualMap,
      forecastByAccountId: input.forecastMap,
    })
  ) {
    return null;
  }

  const accountRows = semanticAccounts
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((account): ManagementPnlAccountRow => {
      const approvedBudget = measureCell(
        input.budgetVisible,
        input.budgetMap,
        account.id,
        "NO_APPROVED_BUDGET",
      );
      const actual = measureCell(
        input.actualVisible,
        input.actualMap,
        account.id,
        "NO_ACTUAL",
      );
      const currentForecast = measureCell(
        input.forecastVisible,
        input.forecastMap,
        account.id,
        "NO_CURRENT_FORECAST",
      );
      return {
        kind: "account",
        accountId: account.id,
        name: account.name,
        reportingGroupId: account.reportingGroupId,
        sortOrder: account.sortOrder,
        lifecycle: account.lifecycle,
        archivedAt: account.archivedAt,
        canonicalSemantic: semantic,
        approvedBudget,
        actual,
        currentForecast,
        forecastVsBudget: buildForecastVsBudgetSlice({
          canonicalSemantic: semantic,
          baselineMinor: approvedBudget.amountMinor,
          comparisonMinor: currentForecast.amountMinor,
        }),
      };
    });

  const rolled = rollGroupMeasures(accountRows);
  return {
    kind: "unassigned_residual",
    residualGroupId: FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID,
    canonicalSemantic: semantic,
    approvedBudget: rolled.approvedBudget,
    actual: rolled.actual,
    currentForecast: rolled.currentForecast,
    forecastVsBudget: buildForecastVsBudgetSlice({
      canonicalSemantic: semantic,
      baselineMinor: rolled.approvedBudget.amountMinor,
      comparisonMinor: rolled.currentForecast.amountMinor,
    }),
    accounts: accountRows,
  };
}

/**
 * When the configured hierarchy has a single semantic root group, the section heading
 * already establishes that scope — hoisting avoids presentational duplication.
 */
export function flattenPresentationalSectionRoots(
  nodes: ReadonlyArray<ManagementPnlTreeNode>,
): ManagementPnlTreeNode[] {
  const unassigned = nodes.filter((node) => node.kind === "unassigned_residual");
  let structural: ManagementPnlTreeNode[] = nodes.filter(
    (node) => node.kind !== "unassigned_residual",
  );

  while (structural.length === 1) {
    const only = structural[0]!;
    if (only.kind !== "reporting_group" || only.children.length === 0) break;
    structural = [...only.children];
  }

  return [...structural, ...unassigned];
}

function sumSectionFromNodes(
  nodes: ReadonlyArray<ManagementPnlTreeNode>,
  semantic: "INCOME" | "EXPENSE",
): FinanceReportingComparisonSlice {
  let baseline: number | null = null;
  let comparison: number | null = null;
  let hasBaseline = false;
  let hasComparison = false;
  for (const node of nodes) {
    const slice = node.forecastVsBudget;
    if (slice.baselineMinor !== null) {
      hasBaseline = true;
      baseline = (baseline ?? 0) + slice.baselineMinor;
    }
    if (slice.comparisonMinor !== null) {
      hasComparison = true;
      comparison = (comparison ?? 0) + slice.comparisonMinor;
    }
  }
  return buildForecastVsBudgetSlice({
    canonicalSemantic: semantic,
    baselineMinor: hasBaseline ? baseline : null,
    comparisonMinor: hasComparison ? comparison : null,
  });
}

export function buildManagementPnlSemanticSections(input: {
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  budgetVisible: boolean;
  actualVisible: boolean;
  forecastVisible: boolean;
  budgetMap: ReadonlyMap<string, number> | null;
  actualMap: ReadonlyMap<string, number> | null;
  forecastMap: ReadonlyMap<string, number> | null;
  varianceTree: ReadonlyArray<VarianceReportingTreeNode>;
  unassignedAccounts: FinancialAccount[];
}): {
  incomeSection: ManagementPnlSemanticSection;
  expenseSection: ManagementPnlSemanticSection;
  hasUnassignedFinancialValues: boolean;
} {
  const transformInput = {
    budgetVisible: input.budgetVisible,
    actualVisible: input.actualVisible,
    forecastVisible: input.forecastVisible,
    budgetMap: input.budgetMap,
    actualMap: input.actualMap,
    forecastMap: input.forecastMap,
  };

  function buildSection(semantic: "INCOME" | "EXPENSE"): ManagementPnlSemanticSection {
    const nodes: ManagementPnlTreeNode[] = [];
    for (const root of input.varianceTree) {
      const transformed = transformNodeForSemantic(root, semantic, transformInput);
      if (transformed) nodes.push(transformed);
    }
    const residual = buildUnassignedResidual(
      semantic,
      input.unassignedAccounts.filter((account) => account.canonicalSemantic === semantic),
      input.varianceTree,
      transformInput,
    );
    if (residual) nodes.push(residual);

    const presentationNodes = flattenPresentationalSectionRoots(nodes);

    const sectionMeasures = rollGroupMeasures(presentationNodes);
    return {
      semantic,
      sectionTotal: {
        ...sectionMeasures,
        forecastVsBudget: sumSectionFromNodes(presentationNodes, semantic),
      },
      nodes: presentationNodes,
    };
  }

  const incomeSection = buildSection("INCOME");
  const expenseSection = buildSection("EXPENSE");
  const hasUnassignedFinancialValues =
    incomeSection.nodes.some((n) => n.kind === "unassigned_residual") ||
    expenseSection.nodes.some((n) => n.kind === "unassigned_residual");

  return { incomeSection, expenseSection, hasUnassignedFinancialValues };
}

export function buildManagementPnlVarianceTree(input: {
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  budgetMap: ReadonlyMap<string, number> | null;
  forecastMap: ReadonlyMap<string, number> | null;
  budgetVisible: boolean;
  forecastVisible: boolean;
}): {
  varianceTree: VarianceReportingTreeNode[];
  unassignedAccounts: FinancialAccount[];
} {
  const varianceTree = buildVarianceReportingTree({
    groups: input.groups,
    accounts: input.accounts,
    baselineByAccountId: input.budgetVisible ? input.budgetMap : null,
    comparisonByAccountId: input.forecastVisible ? input.forecastMap : null,
  });
  const unassignedAccounts = findUnrepresentedPlanningAccounts({
    accounts: input.accounts,
    groups: input.groups,
    hierarchyTree: varianceTree,
  });
  return { varianceTree, unassignedAccounts };
}
