import Link from "next/link";
import type { FinanceOverviewReportingSlice } from "@/lib/finance/reporting/reporting-overview-state";
import type { FinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";

type FinanceOverviewPanelProps = {
  state: FinanceOverviewState;
  canAdmin: boolean;
  canBudgetManage: boolean;
  reporting: FinanceOverviewReportingSlice;
  formattedReporting?: {
    income: string;
    expense: string;
    result: string;
  };
  labels: {
    notConfiguredTitle: string;
    notConfiguredBody: string;
    incompleteTitle: string;
    incompleteBody: string;
    configuredNoDataTitle: string;
    configuredNoDataBody: string;
    configuredCapabilitiesTitle: string;
    configuredCapabilitiesBody: string;
    openSetup: string;
    reportingApprovedTitle: string;
    reportingYearLabel: string;
    reportingIncome: string;
    reportingExpense: string;
    reportingResult: string;
    reportingNoStructureTitle: string;
    reportingNoStructureBody: string;
    openStructure: string;
    reportingNoBaselineTitle: string;
    reportingNoBaselineBody: string;
    openBudget: string;
  };
};

export function FinanceOverviewPanel({
  state,
  canAdmin,
  canBudgetManage,
  reporting,
  formattedReporting,
  labels,
}: FinanceOverviewPanelProps) {
  const copy = (() => {
    switch (state) {
      case "NOT_CONFIGURED":
        return { title: labels.notConfiguredTitle, body: labels.notConfiguredBody };
      case "SETUP_INCOMPLETE":
        return { title: labels.incompleteTitle, body: labels.incompleteBody };
      case "CONFIGURED_WITH_CAPABILITIES":
        return {
          title: labels.configuredCapabilitiesTitle,
          body: labels.configuredCapabilitiesBody,
        };
      case "CONFIGURED_NO_DATA":
      default:
        return {
          title: labels.configuredNoDataTitle,
          body: labels.configuredNoDataBody,
        };
    }
  })();

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS} data-finance-overview-panel>
      <div
        className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
        data-finance-overview-state={state}
        data-finance-surface="overview"
      >
        <h2 className="text-base font-semibold text-[var(--foreground)]">{copy.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy.body}</p>
        {canAdmin && state !== "CONFIGURED_WITH_CAPABILITIES" ? (
          <div className="mt-4">
            <Link
              href="/dashboard/finance/settings"
              className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            >
              {labels.openSetup}
            </Link>
          </div>
        ) : null}
      </div>

      {reporting.kind === "NO_STRUCTURE" ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="no-structure"
          data-finance-surface="overview-reporting"
        >
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {labels.reportingNoStructureTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {labels.reportingNoStructureBody}
          </p>
          {canAdmin ? (
            <div className="mt-4">
              <Link
                href="/dashboard/finance/structure"
                className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              >
                {labels.openStructure}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {reporting.kind === "NO_APPROVED_BASELINE" ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="no-approved-baseline"
          data-finance-surface="overview-reporting"
        >
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {labels.reportingNoBaselineTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {labels.reportingNoBaselineBody}
          </p>
          {canBudgetManage ? (
            <div className="mt-4">
              <Link
                href="/dashboard/finance/budget"
                className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              >
                {labels.openBudget}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {reporting.kind === "APPROVED_BASELINE" && formattedReporting ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="approved-baseline"
          data-finance-surface="overview-reporting"
          data-finance-reporting-context={reporting.reportingContextKey}
        >
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {labels.reportingApprovedTitle}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {labels.reportingYearLabel}: {reporting.financeYearName}
          </p>
          <dl className="mt-4 grid max-w-md gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[var(--muted)]">{labels.reportingIncome}</dt>
              <dd className="font-medium tabular-nums text-[var(--foreground)]">
                {formattedReporting.income}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[var(--muted)]">{labels.reportingExpense}</dt>
              <dd className="font-medium tabular-nums text-[var(--foreground)]">
                {formattedReporting.expense}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--sce-color-border-standard)] pt-2">
              <dt className="text-[var(--muted)]">{labels.reportingResult}</dt>
              <dd className="font-semibold tabular-nums text-[var(--foreground)]">
                {formattedReporting.result}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
