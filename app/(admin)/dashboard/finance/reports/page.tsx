import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceReportingInvestigationWorkspace } from "@/components/admin/finance/reporting/FinanceReportingInvestigationWorkspace";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { serializeFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { serializeFinanceManagementReportingDetailReadModel } from "@/lib/finance/presentation/serialize-management-reporting-detail-read-model";
import {
  loadFinanceManagementPnlReadModel,
  loadFinanceManagementReportingDetailReadModel,
} from "@/lib/finance/services/finance-management-reporting-query-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string; account?: string; group?: string }>;
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

  const initialAccountId = params.account?.trim() || null;
  const initialGroupId = params.group?.trim() || null;
  const hasDeepLinkTarget =
    Boolean(initialAccountId) !== Boolean(initialGroupId) &&
    Boolean(initialAccountId || initialGroupId);

  const initialDetail = hasDeepLinkTarget
    ? serializeFinanceManagementReportingDetailReadModel(
        await loadFinanceManagementReportingDetailReadModel(prisma, workspace.ctx, {
          financeYearId: params.yearId ?? model.financeYearId,
          accountId: initialAccountId,
          groupId: initialGroupId,
          actualGrain: model.actualGrain ?? "ANNUAL_FULL_YEAR",
          timingNavEnabled: workspace.showForecastNav,
        }),
      )
    : null;

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
          description: t("reporting.investigation.pageDescription"),
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
        <FinanceReportingInvestigationWorkspace
          model={serialized}
          formattingLocale={workspace.formattingLocale}
          canConfigureStructure={workspace.canStructure}
          initialAccountId={initialAccountId && !initialGroupId ? initialAccountId : null}
          initialGroupId={initialGroupId && !initialAccountId ? initialGroupId : null}
          initialDetail={initialDetail}
          initialDetailOpen={hasDeepLinkTarget}
          pnlLabels={{
            pageContextYear: t("reporting.pnl.contextYear"),
            interpretationTitle: t("reporting.pnl.interpretationTitle"),
            budgetedResult: t("reporting.pnl.budgetedResult"),
            expectedResult: t("reporting.pnl.expectedResult"),
            forecastVsBudgetVariance: t("reporting.pnl.varianceVsBudget"),
            driversTitle: t("reporting.pnl.driversTitle"),
            driversSubtitle: t("reporting.pnl.driversSubtitle"),
            topFavourable: t("reporting.pnl.topFavourable"),
            topUnfavourable: t("reporting.pnl.topUnfavourable"),
            exceptionsTitle: t("reporting.investigation.exceptionsTitle"),
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
            investigateAccount: t("reporting.investigation.investigateAccount"),
            investigateGroup: t("reporting.investigation.investigateGroup"),
          }}
          detailLabels={{
            sheetTitleAccount: t("reporting.investigation.sheetTitleAccount"),
            sheetTitleGroup: t("reporting.investigation.sheetTitleGroup"),
            hierarchyLabel: t("reporting.investigation.hierarchyLabel"),
            summaryTitle: t("reporting.investigation.summaryTitle"),
            periodContextTitle: t("reporting.investigation.periodContextTitle"),
            actualGrainAnnual: t("reporting.investigation.actualGrainAnnual"),
            actualGrainYtd: t("reporting.investigation.actualGrainYtd"),
            evidenceTitle: t("reporting.investigation.evidenceTitle"),
            actualEntriesTitle: t("reporting.investigation.actualEntriesTitle"),
            noActualEntries: t("reporting.investigation.noActualEntries"),
            evidenceNotVisible: t("reporting.investigation.evidenceNotVisible"),
            sourceActionsTitle: t("reporting.investigation.sourceActionsTitle"),
            openBudget: t("reporting.investigation.openBudget"),
            openActuals: t("reporting.investigation.openActuals"),
            openForecast: t("reporting.investigation.openForecast"),
            openTiming: t("reporting.investigation.openTiming"),
            archivedAccount: t("structure.archivedHint"),
            unassignedAccount: t("reporting.investigation.unassignedAccount"),
            notFoundTitle: t("reporting.investigation.notFoundTitle"),
            notFoundBody: t("reporting.investigation.notFoundBody"),
            columnBudget: t("reporting.pnl.columnBudget"),
            columnActual: t("reporting.pnl.columnActual"),
            columnForecast: t("reporting.pnl.columnForecast"),
            columnVariance: t("reporting.pnl.columnVariance"),
            favorabilityFavorable: t("actuals.favorabilityFavorable"),
            favorabilityUnfavorable: t("actuals.favorabilityUnfavorable"),
            favorabilityOnPlan: t("actuals.favorabilityOnPlan"),
            entryDate: t("reporting.investigation.entryDate"),
            entryAmount: t("reporting.investigation.entryAmount"),
            entryDescription: t("reporting.investigation.entryDescription"),
            groupAccountsTitle: t("reporting.investigation.groupAccountsTitle"),
            investigateAccount: t("reporting.investigation.investigateAccount"),
            closeDetail: t("reporting.investigation.closeDetail"),
          }}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
