import { getTranslations } from "next-intl/server";
import { formatBudgetPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
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
          income: formatBudgetPlanningMinor(
            workspace.overviewReporting.incomeMinor,
            workspace.overviewReporting.currency,
            formattingLocale,
          ),
          expense: formatBudgetPlanningMinor(
            workspace.overviewReporting.expenseMinor,
            workspace.overviewReporting.currency,
            formattingLocale,
          ),
          result: formatBudgetPlanningMinor(
            workspace.overviewReporting.resultMinor,
            workspace.overviewReporting.currency,
            formattingLocale,
          ),
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
            showBudget={workspace.showBudgetNav}
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              structure: t("nav.structure"),
              budget: t("nav.budget"),
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
          }}
        />
        <p className="sr-only" data-finance-route={FINANCE_WORKSPACE_ROUTE_V1} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
