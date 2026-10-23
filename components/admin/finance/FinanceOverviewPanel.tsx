import Link from "next/link";
import { cn } from "@/lib/cn";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import type { FinanceOverviewReportingSlice } from "@/lib/finance/reporting/reporting-overview-state";
import {
  financeOverviewReportingIsPrimaryContent,
  shouldShowSubordinateSetupWorkflowNudge,
} from "@/lib/finance/reporting/reporting-overview-state";
import type { FinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";
import {
  FINANCE_CONTEXT_STRIP_CLASS,
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
  formattedForecast?: {
    income: string;
    expense: string;
    result: string;
    resultDeltaVsBudget: string | null;
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
    setupWorkflowSubordinateTitle: string;
    setupWorkflowSubordinateBody: string;
    reportingApprovedTitle: string;
    reportingYearLabel: string;
    reportingIncome: string;
    reportingExpense: string;
    reportingResult: string;
    reportingNoCurrencyTitle: string;
    reportingNoCurrencyBody: string;
    reportingNoFinanceYearTitle: string;
    reportingNoFinanceYearBody: string;
    reportingNoStructureTitle: string;
    reportingNoStructureBody: string;
    openStructure: string;
    reportingNoBaselineTitle: string;
    reportingNoBaselineBody: string;
    openBudget: string;
    reportingForecastTitle: string;
    reportingForecastResultDelta: string;
    openForecast: string;
  };
};

export function FinanceOverviewPanel({
  state,
  canAdmin,
  canBudgetManage,
  reporting,
  formattedReporting,
  formattedForecast,
  labels,
}: FinanceOverviewPanelProps) {
  const reportingPrimary = financeOverviewReportingIsPrimaryContent(reporting);
  const showSubordinateSetupNudge = shouldShowSubordinateSetupWorkflowNudge({
    overviewState: state,
    reporting,
  });

  const overviewFallbackCopy = (() => {
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
      {reporting.kind === "APPROVED_BASELINE" && formattedReporting ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="approved-baseline"
          data-finance-surface="overview-reporting"
          data-finance-reporting-context={reporting.reportingContextKey}
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {labels.reportingApprovedTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {reporting.financeYearName}
            {reporting.currency ? ` · ${reporting.currency}` : null}
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
              <dd
                className={cn(
                  "font-semibold tabular-nums text-[var(--foreground)]",
                  financeResultSemanticTextClass(reporting.resultMinor),
                )}
                data-finance-result="overview-approved-baseline"
              >
                {formattedReporting.result}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {reporting.kind === "APPROVED_BASELINE" && reporting.forecast && formattedForecast ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-surface="overview-forecast"
          data-finance-reporting-state="current-forecast"
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {labels.reportingForecastTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {reporting.forecast.financeYearName}
            {reporting.forecast.currency ? ` · ${reporting.forecast.currency}` : null}
          </p>
          <dl className="mt-4 grid max-w-md gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[var(--muted)]">{labels.reportingIncome}</dt>
              <dd className="font-medium tabular-nums">{formattedForecast.income}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[var(--muted)]">{labels.reportingExpense}</dt>
              <dd className="font-medium tabular-nums">{formattedForecast.expense}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--sce-color-border-standard)] pt-2">
              <dt className="text-[var(--muted)]">{labels.reportingResult}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  financeResultSemanticTextClass(reporting.forecast.resultMinor),
                )}
              >
                {formattedForecast.result}
              </dd>
            </div>
            {formattedForecast.resultDeltaVsBudget ? (
              <div className="flex items-baseline justify-between gap-4 text-xs">
                <dt className="text-[var(--muted)]">{labels.reportingForecastResultDelta}</dt>
                <dd className="tabular-nums">{formattedForecast.resultDeltaVsBudget}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4">
            <Link
              href="/dashboard/finance/forecast"
              className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
            >
              {labels.openForecast}
            </Link>
          </div>
        </div>
      ) : null}

      {reporting.kind === "NO_BASE_CURRENCY" ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="no-base-currency"
          data-finance-surface="overview-reporting"
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {labels.reportingNoCurrencyTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {labels.reportingNoCurrencyBody}
          </p>
          {canAdmin ? (
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
      ) : null}

      {reporting.kind === "NO_FINANCE_YEAR" ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="no-finance-year"
          data-finance-surface="overview-reporting"
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {labels.reportingNoFinanceYearTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {labels.reportingNoFinanceYearBody}
          </p>
          {canAdmin ? (
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
      ) : null}

      {reporting.kind === "NO_STRUCTURE" ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-reporting-state="no-structure"
          data-finance-surface="overview-reporting"
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {labels.reportingNoStructureTitle}
          </h2>
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
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {labels.reportingNoBaselineTitle}
          </h2>
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

      {showSubordinateSetupNudge && canAdmin ? (
        <div
          className={FINANCE_CONTEXT_STRIP_CLASS}
          data-finance-setup-workflow-nudge="subordinate"
          data-finance-overview-state={state}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {labels.setupWorkflowSubordinateTitle}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)]">
              {labels.setupWorkflowSubordinateBody}
            </p>
          </div>
          <Link
            href="/dashboard/finance/settings"
            className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            {labels.openSetup}
          </Link>
        </div>
      ) : null}

      {!reportingPrimary ? (
        <div
          className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
          data-finance-overview-state={state}
          data-finance-surface="overview"
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {overviewFallbackCopy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {overviewFallbackCopy.body}
          </p>
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
      ) : null}
    </div>
  );
}
