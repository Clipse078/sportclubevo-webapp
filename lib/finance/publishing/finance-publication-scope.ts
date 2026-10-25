/**
 * FIN-06A — canonical reporting scope validation for shares and publications.
 */

import { FinanceDomainError } from "@/lib/finance/errors";

export const FINANCE_PUBLISHING_REPORT_TYPES = [
  "MANAGEMENT_PNL",
  "MANAGEMENT_REPORTING_DETAIL",
  "COMPARATIVE_INTELLIGENCE",
  "OVERVIEW_DECISION_SUMMARY",
] as const;

export type FinancePublishingReportType = (typeof FINANCE_PUBLISHING_REPORT_TYPES)[number];

export type FinancePublishingReportingScope = {
  financeYearId: string;
  reportType: FinancePublishingReportType;
  reportingGroupIds?: readonly string[];
  financialAccountIds?: readonly string[];
  includeActual: boolean;
  includeApprovedBudget: boolean;
  includeCurrentForecast: boolean;
  includeAutomaticForecast: boolean;
  includeScenarios: boolean;
  comparisonBasis?: "APPROVED_BUDGET" | "PRIOR_PUBLICATION" | "NONE";
  hierarchyDetailLevel: "SUMMARY" | "REPORTING_GROUPS" | "ACCOUNTS";
};

export function assertFinancePublishingReportingScope(
  scope: FinancePublishingReportingScope,
): void {
  if (!scope.financeYearId.trim()) {
    throw new FinanceDomainError(
      "FINANCE_PUBLISHING_INVALID_SCOPE",
      "Reporting scope requires a finance year.",
      400,
    );
  }
  if (!FINANCE_PUBLISHING_REPORT_TYPES.includes(scope.reportType)) {
    throw new FinanceDomainError(
      "FINANCE_PUBLISHING_INVALID_SCOPE",
      "Reporting scope uses an unsupported report type.",
      400,
    );
  }
  const hasMeasure =
    scope.includeActual ||
    scope.includeApprovedBudget ||
    scope.includeCurrentForecast ||
    scope.includeAutomaticForecast ||
    scope.includeScenarios;
  if (!hasMeasure) {
    throw new FinanceDomainError(
      "FINANCE_PUBLISHING_INVALID_SCOPE",
      "Reporting scope must include at least one permitted measure.",
      400,
    );
  }
  if (scope.includeScenarios && scope.reportType === "OVERVIEW_DECISION_SUMMARY") {
    throw new FinanceDomainError(
      "FINANCE_PUBLISHING_INVALID_SCOPE",
      "Overview summary scope cannot include scenario measures.",
      400,
    );
  }
}
