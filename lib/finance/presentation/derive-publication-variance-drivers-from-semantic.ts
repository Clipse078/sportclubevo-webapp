/**
 * FIN-06C-R2 — derive FIN-05B-compatible material drivers from immutable publication semantic payload only.
 */

import type { SerializedManagementPnlTreeNode } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import {
  computeRelativeContributionBasisPoints,
  rankVarianceDrivers,
  selectTopDriversByFavorability,
  sumAbsoluteVarianceMagnitudes,
  type FinanceVarianceDriver,
} from "@/lib/finance/reporting/reporting-contribution-analysis";

const TOP_DRIVER_LIMIT = 5;

function collectAccountDriverDraft(
  nodes: readonly SerializedManagementPnlTreeNode[],
): Array<Omit<FinanceVarianceDriver, "rank">> {
  const draft: Array<Omit<FinanceVarianceDriver, "rank">> = [];

  function walk(treeNodes: readonly SerializedManagementPnlTreeNode[]): void {
    for (const node of treeNodes) {
      if (node.kind === "account") {
        if (node.forecastVsBudget.availability !== "AVAILABLE") continue;
        draft.push({
          kind: "ACCOUNT",
          id: node.accountId,
          name: node.name,
          canonicalSemantic: node.canonicalSemantic,
          hierarchySortOrder: node.sortOrder,
          comparison: node.forecastVsBudget,
          relativeContributionBasisPoints: null,
        });
      } else if (node.kind === "reporting_group") {
        walk(node.children);
      } else if (node.kind === "unassigned_residual") {
        for (const account of node.accounts) {
          if (account.forecastVsBudget.availability !== "AVAILABLE") continue;
          draft.push({
            kind: "ACCOUNT",
            id: account.accountId,
            name: account.name,
            canonicalSemantic: account.canonicalSemantic,
            hierarchySortOrder: account.sortOrder,
            comparison: account.forecastVsBudget,
            relativeContributionBasisPoints: null,
          });
        }
      }
    }
  }

  walk(nodes);
  return draft;
}

export function derivePublicationVarianceDriversFromSemantic(input: {
  incomeNodes: readonly SerializedManagementPnlTreeNode[];
  expenseNodes: readonly SerializedManagementPnlTreeNode[];
}): {
  topFavourableDrivers: FinanceVarianceDriver[];
  topUnfavourableDrivers: FinanceVarianceDriver[];
} {
  const draft = [
    ...collectAccountDriverDraft(input.incomeNodes),
    ...collectAccountDriverDraft(input.expenseNodes),
  ];

  const totalAbs = sumAbsoluteVarianceMagnitudes(draft.map((d) => d.comparison));
  const withContribution = draft.map((driver) => ({
    ...driver,
    relativeContributionBasisPoints: computeRelativeContributionBasisPoints(
      driver.comparison.absoluteVarianceMagnitudeMinor,
      totalAbs,
    ),
  }));

  const ranked = rankVarianceDrivers(withContribution);
  return {
    topFavourableDrivers: selectTopDriversByFavorability(ranked, "FAVORABLE", TOP_DRIVER_LIMIT),
    topUnfavourableDrivers: selectTopDriversByFavorability(ranked, "UNFAVORABLE", TOP_DRIVER_LIMIT),
  };
}
