import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { serializeFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { loadFinanceManagementPnlReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceReportingPnlPage({ searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const params = await searchParams;

  const reportingEnabled = workspace.enabledCapabilities.has("REPORTING");
  if (!reportingEnabled) {
    redirect("/dashboard/finance");
  }

  const model = await loadFinanceManagementPnlReadModel(prisma, workspace.ctx, {
    financeYearId: params.yearId ?? null,
    actualGrain: "ANNUAL_FULL_YEAR",
  });

  const serialized = serializeFinanceManagementPnlReadModel(model);

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.reporting") },
        ]}
        header={{
          eyebrow: t("reporting.pnl.eyebrow"),
          title: t("reporting.pnl.pageTitle"),
          description: t("reporting.pnl.pageDescription"),
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
        <FinanceManagementPnlPanel
          model={serialized}
          formattingLocale={workspace.formattingLocale}
          canConfigureStructure={workspace.canStructure}
          labels={{
            pageContextYear: t("reporting.pnl.contextYear"),
            interpretationTitle: t("reporting.pnl.interpretationTitle"),
            budgetedResult: t("overview.reportingResult"),
            expectedResult: t("reporting.pnl.expectedResult"),
            forecastVsBudgetVariance: t("overview.reportingForecastResultDelta"),
            driversTitle: t("reporting.pnl.driversTitle"),
            topFavourable: t("reporting.pnl.topFavourable"),
            topUnfavourable: t("reporting.pnl.topUnfavourable"),
            incomeSection: t("overview.reportingIncome"),
            expenseSection: t("overview.reportingExpense"),
            incomeSectionTotal: t("reporting.pnl.incomeSectionTotal"),
            expenseSectionTotal: t("reporting.pnl.expenseSectionTotal"),
            managementResult: t("overview.reportingResult"),
            columnBudget: t("reporting.pnl.columnBudget"),
            columnActual: t("reporting.pnl.columnActual"),
            columnActualYtd: t("reporting.pnl.columnActualYtd"),
            columnForecast: t("reporting.pnl.columnForecast"),
            columnVariance: t("reporting.pnl.columnVariance"),
            columnVariancePercent: t("reporting.pnl.columnVariancePercent"),
            unassignedGroup: t("reporting.pnl.unassignedGroup"),
            archivedAccount: t("structure.archivedHint"),
            expandAccounts: t("reporting.pnl.expandAccounts"),
            collapseAccounts: t("reporting.pnl.collapseAccounts"),
            noStructureTitle: t("overview.reportingNoStructureTitle"),
            noStructureBody: t("overview.reportingNoStructureBody"),
            openStructure: t("overview.openStructure"),
            noStructureViewOnly: t("reporting.pnl.noStructureViewOnly"),
            favorabilityFavorable: t("actuals.favorabilityFavorable"),
            favorabilityUnfavorable: t("actuals.favorabilityUnfavorable"),
            favorabilityOnPlan: t("actuals.favorabilityOnPlan"),
            partialSourcesHint: t("reporting.pnl.partialSourcesHint"),
            unassignedHint: t("reporting.pnl.unassignedHint"),
          }}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
