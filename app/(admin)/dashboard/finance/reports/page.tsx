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
import {
  canManageFinancialShares,
  canPublishFinancialReports,
  canShareFinancialReports,
  canViewFinancePublicationHistory,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { loadFinancePublicationSummaryForYear } from "@/lib/finance/services/finance-publication-query-service";
import { serializeFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";

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

  const canViewPublications = canViewFinancePublicationHistory(workspace.ctx);
  const canPublishReport = canPublishFinancialReports(workspace.ctx);
  const canSharePublication =
    canShareFinancialReports(workspace.ctx) && canViewFinancePublicationHistory(workspace.ctx);
  const canRevokePublicationShares = canManageFinancialShares(workspace.ctx);
  const publicationSummary = canViewPublications
    ? serializeFinancePublicationSummaryReadModel(
        await loadFinancePublicationSummaryForYear(
          prisma,
          workspace.ctx,
          params.yearId ?? model.financeYearId,
        ),
      )
    : null;

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
          canPublishReport={canPublishReport}
          canSharePublication={canSharePublication}
          canRevokePublicationShares={canRevokePublicationShares}
          publicationSummary={publicationSummary}
          publicationLabels={
            canViewPublications || canPublishReport
              ? {
            publishAction: t("reporting.publication.publishAction"),
            dialogTitle: t("reporting.publication.dialogTitle"),
            dialogDescription: t("reporting.publication.dialogDescription"),
            dialogImmutability: t("reporting.publication.dialogImmutability"),
            dialogContentLabel: t("reporting.publication.dialogContentLabel"),
            dialogContentValue: t("reporting.publication.dialogContentValue"),
            dialogPeriodLabel: t("reporting.publication.dialogPeriodLabel"),
            confirmPublish: t("reporting.publication.confirmPublish"),
            cancel: t("reporting.publication.cancel"),
            publishing: t("reporting.publication.publishing"),
            successTitle: t("reporting.publication.successTitle"),
            successBody: t("reporting.publication.successBody"),
            viewLatest: t("reporting.publication.viewLatest"),
            notPublishable: t("reporting.publication.notPublishable"),
            forbidden: t("reporting.publication.forbidden"),
            publishFailed: t("reporting.publication.publishFailed"),
            versionLabel: t("reporting.publication.versionLabel"),
            publishedAtLabel: t("reporting.publication.publishedAtLabel"),
            inspectionTitle: t("reporting.publication.inspectionTitle"),
            inspectionEmpty: t("reporting.publication.inspectionEmpty"),
            close: t("reporting.publication.close"),
          }
              : undefined
          }
          publicationInspectionLabels={
            canViewPublications || canPublishReport
              ? {
                  sheetTitle: t("reporting.publication.inspectionSheetTitle"),
                  frozenNotice: t("reporting.publication.frozenNotice"),
                  versionHeading: t("reporting.publication.versionHeading"),
                  versionLabel: t("reporting.publication.versionLabel"),
                  publishedAtLabel: t("reporting.publication.publishedAtLabel"),
                  contentTypeLabel: t("reporting.publication.dialogContentValue"),
                  statusPublished: t("reporting.publication.statusPublished"),
                  statusSuperseded: t("reporting.publication.statusSuperseded"),
                  downloadPdf: t("reporting.publication.downloadPdf"),
                  close: t("reporting.publication.close"),
                  shareableHint: t("reporting.publicationShare.shareableHint"),
                  loading: t("reporting.publicationShare.inspectionLoading"),
                }
              : undefined
          }
          publicationFastShareLabels={
            canSharePublication
              ? {
                  shareAction: t("reporting.publicationShare.shareAction"),
                  copyLink: t("reporting.publicationShare.copyLink"),
                  linkCopiedTitle: t("reporting.publicationShare.linkCopiedTitle"),
                  linkCopiedBody: t("reporting.publicationShare.linkCopiedBody"),
                  createFailed: t("reporting.publicationShare.createFailed"),
                  manageAction: t("reporting.publicationShare.manageAction"),
                }
              : undefined
          }
          publicationShareManagementLabels={
            canSharePublication
              ? {
                  sectionTitle: t("reporting.publicationShare.managementTitle"),
                  empty: t("reporting.publicationShare.managementEmpty"),
                  statusActive: t("reporting.publicationShare.statusActive"),
                  statusExpired: t("reporting.publicationShare.statusExpired"),
                  statusRevoked: t("reporting.publicationShare.statusRevoked"),
                  createdLabel: t("reporting.publicationShare.createdLabel"),
                  expiresLabel: t("reporting.publicationShare.expiresLabel"),
                  expiresNone: t("reporting.publicationShare.expiryNone"),
                  creatorLabel: t("reporting.publicationShare.creatorLabel"),
                  revoke: t("reporting.publicationShare.revoke"),
                  revoking: t("reporting.publicationShare.revoking"),
                  revokeFailed: t("reporting.publicationShare.revokeFailed"),
                  copyLink: t("reporting.publicationShare.copyLink"),
                  linkCopied: t("reporting.publicationShare.copied"),
                  loadFailed: t("reporting.publicationShare.loadFailed"),
                  advancedTitle: t("reporting.publicationShare.advancedTitle"),
                  expirySection: t("reporting.publicationShare.expirySection"),
                  expiryNone: t("reporting.publicationShare.expiryNone"),
                  expiryDate: t("reporting.publicationShare.expiryDate"),
                  expiryDateLabel: t("reporting.publicationShare.expiryDateLabel"),
                  createAdvancedShare: t("reporting.publicationShare.createAdvancedShare"),
                  creating: t("reporting.publicationShare.creating"),
                  createFailed: t("reporting.publicationShare.createFailed"),
                }
              : undefined
          }
          publicationHistoryLabels={
            canViewPublications
              ? {
                  historyAction: t("reporting.publication.historyAction"),
                  historyTitle: t("reporting.publication.historyTitle"),
                  openVersion: t("reporting.publication.openVersion"),
                  versionLabel: t("reporting.publication.versionLabel"),
                  publishedAtLabel: t("reporting.publication.publishedAtLabel"),
                  statusPublished: t("reporting.publication.statusPublished"),
                  statusSuperseded: t("reporting.publication.statusSuperseded"),
                  downloadPdf: t("reporting.publication.downloadPdf"),
                }
              : undefined
          }
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
            attentionSignalsTitle: t("reporting.pnl.attentionSignalsTitle"),
            grainExplanationYtdVsAnnualPlan: t("reporting.pnl.grainExplanationYtdVsAnnualPlan"),
            grainExplanationAnnualActualAndPlan: t("reporting.pnl.grainExplanationAnnualActualAndPlan"),
            attentionResultFavorableTitle: t("reporting.pnl.attentionResultFavorableTitle"),
            attentionResultFavorableDetail: t("reporting.pnl.attentionResultFavorableDetail"),
            attentionResultUnfavorableTitle: t("reporting.pnl.attentionResultUnfavorableTitle"),
            attentionResultUnfavorableDetail: t("reporting.pnl.attentionResultUnfavorableDetail"),
            attentionResultOnPlanTitle: t("reporting.pnl.attentionResultOnPlanTitle"),
            attentionLargestFavorableTitle: t("reporting.pnl.attentionLargestFavorableTitle"),
            attentionLargestUnfavorableTitle: t("reporting.pnl.attentionLargestUnfavorableTitle"),
            attentionDriverExpenseSuffix: t("reporting.pnl.attentionDriverExpenseSuffix"),
            attentionMissingBudget: t("reporting.pnl.attentionMissingBudget"),
            attentionMissingForecast: t("reporting.pnl.attentionMissingForecast"),
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
            semanticIncomeLabel: t("reporting.investigation.semanticIncomeLabel"),
            semanticExpenseLabel: t("reporting.investigation.semanticExpenseLabel"),
            targetKindAccountLabel: t("reporting.investigation.targetKindAccountLabel"),
            targetKindGroupLabel: t("reporting.investigation.targetKindGroupLabel"),
            varianceVsBudgetLabel: t("reporting.investigation.varianceVsBudgetLabel"),
            evidenceEntryFallback: t("reporting.investigation.evidenceEntryFallback"),
            evidenceShowAll: t("reporting.investigation.evidenceShowAll"),
            evidenceReconciliationSummary: t("reporting.investigation.evidenceReconciliationSummary"),
            evidenceReconciliationRestricted: t("reporting.investigation.evidenceReconciliationRestricted"),
            actualContextSeparator: t("reporting.investigation.actualContextSeparator"),
            interpretationForecastAboveBudget: t(
              "reporting.investigation.interpretationForecastAboveBudget",
            ),
            interpretationForecastBelowBudget: t(
              "reporting.investigation.interpretationForecastBelowBudget",
            ),
            interpretationForecastOnBudget: t("reporting.investigation.interpretationForecastOnBudget"),
            grainExplanationYtdVsAnnualPlan: t("reporting.pnl.grainExplanationYtdVsAnnualPlan"),
          }}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
