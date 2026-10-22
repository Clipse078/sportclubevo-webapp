import type { FinancialReportingReadModel } from "@/lib/finance/reporting/reporting-read-model";

export type FinanceOverviewReportingSlice =
  | { kind: "NONE" }
  | { kind: "NO_BASE_CURRENCY" }
  | { kind: "NO_FINANCE_YEAR" }
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

/** FIN-01E overview reporting resolves from the read model alone — not the formal setup workflow flag. */
export function resolveFinanceOverviewReportingSlice(input: {
  reporting: FinancialReportingReadModel;
}): FinanceOverviewReportingSlice {
  const { reporting } = input;

  switch (reporting.availability) {
    case "NO_BASE_CURRENCY":
      return { kind: "NO_BASE_CURRENCY" };
    case "NO_FINANCE_YEAR":
      return { kind: "NO_FINANCE_YEAR" };
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

export function financeOverviewReportingIsPrimaryContent(
  slice: FinanceOverviewReportingSlice,
): boolean {
  return slice.kind !== "NONE";
}

export function shouldShowSubordinateSetupWorkflowNudge(input: {
  overviewState: "NOT_CONFIGURED" | "SETUP_INCOMPLETE" | "CONFIGURED_NO_DATA" | "CONFIGURED_WITH_CAPABILITIES";
  reporting: FinanceOverviewReportingSlice;
}): boolean {
  return (
    input.reporting.kind === "APPROVED_BASELINE" &&
    (input.overviewState === "SETUP_INCOMPLETE" || input.overviewState === "NOT_CONFIGURED")
  );
}
