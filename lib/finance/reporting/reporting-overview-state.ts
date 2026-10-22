import type { FinancialReportingReadModel } from "@/lib/finance/reporting/reporting-read-model";
import type { FinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";

export type FinanceOverviewReportingSlice =
  | { kind: "NONE" }
  | { kind: "NO_STRUCTURE"; financeYearName: string | null }
  | {
      kind: "NO_APPROVED_BASELINE";
      financeYearName: string | null;
    }
  | {
      kind: "APPROVED_BASELINE";
      financeYearName: string;
      currency: string | null;
      incomeMinor: number;
      expenseMinor: number;
      resultMinor: number;
      reportingContextKey: string;
      topGroups: ReadonlyArray<{
        groupId: string;
        name: string;
        incomeMinor: number;
        expenseMinor: number;
      }>;
    };

export function resolveFinanceOverviewReportingSlice(input: {
  overviewState: FinanceOverviewState;
  reporting: FinancialReportingReadModel;
}): FinanceOverviewReportingSlice {
  const { overviewState, reporting } = input;
  if (
    overviewState === "NOT_CONFIGURED" ||
    overviewState === "SETUP_INCOMPLETE"
  ) {
    return { kind: "NONE" };
  }

  switch (reporting.availability) {
    case "NO_FINANCE_YEAR":
      return { kind: "NONE" };
    case "NO_STRUCTURE":
      return { kind: "NO_STRUCTURE", financeYearName: reporting.financeYearName };
    case "NO_APPROVED_BASELINE":
      return {
        kind: "NO_APPROVED_BASELINE",
        financeYearName: reporting.financeYearName,
      };
    case "AVAILABLE":
      return {
        kind: "APPROVED_BASELINE",
        financeYearName: reporting.financeYearName ?? "",
        currency: reporting.baseCurrency,
        incomeMinor: reporting.summary.incomeMinor,
        expenseMinor: reporting.summary.expenseMinor,
        resultMinor: reporting.summary.resultMinor,
        reportingContextKey: reporting.reportingContextKey ?? "",
        topGroups: reporting.tree
          .filter((node) => node.kind === "reporting_group")
          .map((node) => ({
            groupId: node.groupId,
            name: node.name,
            incomeMinor: node.incomeMinor,
            expenseMinor: node.expenseMinor,
          })),
      };
    default:
      return { kind: "NONE" };
  }
}
