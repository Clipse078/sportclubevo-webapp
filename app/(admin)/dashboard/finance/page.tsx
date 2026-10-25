import { getTranslations } from "next-intl/server";
import {
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceOverviewPanel } from "@/components/admin/finance/FinanceOverviewPanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { FINANCE_WORKSPACE_ROUTE_V1 } from "@/lib/finance/finance-architecture";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const formattingLocale = workspace.formattingLocale;

  const formattedReporting =
    workspace.overviewReporting.kind === "APPROVED_BASELINE"
      ? {
          income: formatFinanceManagementPlanningMinor(
            workspace.overviewReporting.incomeMinor,
            workspace.overviewReporting.currency,
            formattingLocale,
          ),
          expense: formatFinanceManagementPlanningMinor(
            workspace.overviewReporting.expenseMinor,
            workspace.overviewReporting.currency,
            formattingLocale,
          ),
          result: formatFinanceManagementPlanningMinor(
            workspace.overviewReporting.resultMinor,
            workspace.overviewReporting.currency,
            formattingLocale,
          ),
        }
      : undefined;

  const forecastSlice =
    workspace.overviewReporting.kind === "APPROVED_BASELINE"
      ? workspace.overviewReporting.forecast
      : null;

  const formattedForecast = forecastSlice
    ? {
        income: formatFinanceManagementPlanningMinor(
          forecastSlice.incomeMinor,
          forecastSlice.currency,
          formattingLocale,
        ),
        expense: formatFinanceManagementPlanningMinor(
          forecastSlice.expenseMinor,
          forecastSlice.currency,
          formattingLocale,
        ),
        result: formatFinanceManagementPlanningMinor(
          forecastSlice.resultMinor,
          forecastSlice.currency,
          formattingLocale,
        ),
        resultDeltaVsBudget:
          forecastSlice.resultDeltaVsBudgetMinor !== null
            ? formatFinanceManagementPlanningSignedMinor(
                forecastSlice.resultDeltaVsBudgetMinor,
                forecastSlice.currency,
                formattingLocale,
              )
            : null,
      }
    : undefined;

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("workspace.title"),
          description: t("workspace.description"),
        }}
        contextTabs={
          <FinanceWorkspaceTabs
            showStructure={workspace.canStructure}
            showReporting={workspace.showReportingNav}
            showBudget={workspace.showBudgetNav}
            showActuals={workspace.showActualsNav}
            showForecast={workspace.showForecastNav}
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              structure: t("nav.structure"),
              reporting: t("nav.reports"),
              budget: t("nav.budget"),
              actuals: t("nav.actuals"),
              forecast: t("nav.forecast"),
              settings: t("nav.structure_settings"),
            }}
            ariaLabel={t("contextTabsAria")}
          />
        }
      >
        <FinanceOverviewPanel
          state={workspace.overviewState}
          canAdmin={workspace.canAdmin}
          canBudgetManage={workspace.canBudgetManage}
          reporting={workspace.overviewReporting}
          formattedReporting={formattedReporting}
          formattedForecast={formattedForecast}
          labels={{
            notConfiguredTitle: t("overview.notConfiguredTitle"),
            notConfiguredBody: t("overview.notConfiguredBody"),
            incompleteTitle: t("overview.incompleteTitle"),
            incompleteBody: t("overview.incompleteBody"),
            configuredNoDataTitle: t("overview.configuredNoDataTitle"),
            configuredNoDataBody: t("overview.configuredNoDataBody"),
            configuredCapabilitiesTitle: t("overview.configuredCapabilitiesTitle"),
            configuredCapabilitiesBody: t("overview.configuredCapabilitiesBody"),
            openSetup: t("overview.openSetup"),
            setupWorkflowSubordinateTitle: t("overview.setupWorkflowSubordinateTitle"),
            setupWorkflowSubordinateBody: t("overview.setupWorkflowSubordinateBody"),
            reportingApprovedTitle: t("overview.reportingApprovedTitle"),
            reportingYearLabel: t("overview.reportingYearLabel"),
            reportingIncome: t("overview.reportingIncome"),
            reportingExpense: t("overview.reportingExpense"),
            reportingResult: t("overview.reportingResult"),
            reportingNoCurrencyTitle: t("overview.reportingNoCurrencyTitle"),
            reportingNoCurrencyBody: t("overview.reportingNoCurrencyBody"),
            reportingNoFinanceYearTitle: t("overview.reportingNoFinanceYearTitle"),
            reportingNoFinanceYearBody: t("overview.reportingNoFinanceYearBody"),
            reportingNoStructureTitle: t("overview.reportingNoStructureTitle"),
            reportingNoStructureBody: t("overview.reportingNoStructureBody"),
            openStructure: t("overview.openStructure"),
            reportingNoBaselineTitle: t("overview.reportingNoBaselineTitle"),
            reportingNoBaselineBody: t("overview.reportingNoBaselineBody"),
            openBudget: t("overview.openBudget"),
            reportingForecastTitle: t("overview.reportingForecastTitle"),
            reportingForecastResultDelta: t("overview.reportingForecastResultDelta"),
            openForecast: t("overview.openForecast"),
          }}
        />
        <p className="sr-only" data-finance-route={FINANCE_WORKSPACE_ROUTE_V1} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
