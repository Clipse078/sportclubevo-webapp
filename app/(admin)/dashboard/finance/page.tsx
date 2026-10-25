import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceOverviewPanel } from "@/components/admin/finance/FinanceOverviewPanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { FINANCE_WORKSPACE_ROUTE_V1 } from "@/lib/finance/finance-architecture";
import { serializeFinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/presentation/serialize-finance-overview-decision-intelligence-read-model";
import { loadFinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/services/finance-overview-decision-intelligence-query-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();

  const decisionModel = await loadFinanceOverviewDecisionIntelligenceReadModel(
    prisma,
    workspace.ctx,
    {
      financeYearId: null,
      forecastingCapabilityEnabled: workspace.enabledCapabilities.has("FORECASTING"),
      reportingCapabilityEnabled: workspace.enabledCapabilities.has("REPORTING"),
      canBudgetManage: workspace.canBudgetManage,
      canStructure: workspace.canStructure,
    },
  );

  const serialized = serializeFinanceOverviewDecisionIntelligenceReadModel(decisionModel);

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
          model={serialized}
          formattingLocale={workspace.formattingLocale}
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
            noCurrencyTitle: t("overview.reportingNoCurrencyTitle"),
            noCurrencyBody: t("overview.reportingNoCurrencyBody"),
            noFinanceYearTitle: t("overview.reportingNoFinanceYearTitle"),
            noFinanceYearBody: t("overview.reportingNoFinanceYearBody"),
            noStructureTitle: t("overview.reportingNoStructureTitle"),
            noStructureBody: t("overview.reportingNoStructureBody"),
            openStructure: t("overview.openStructure"),
            noBaselineTitle: t("overview.reportingNoBaselineTitle"),
            noBaselineBody: t("overview.reportingNoBaselineBody"),
            openBudget: t("overview.openBudget"),
            outlookTitle: t("overview.decision.outlookTitle"),
            expectedResult: t("overview.decision.expectedResult"),
            varianceAgainstApprovedBudget: t("overview.decision.varianceAgainstApprovedBudget"),
            actualLabel: t("overview.decision.actualLabel"),
            actualYtdThrough: t("overview.decision.actualYtdThrough"),
            conclusionOnTrack: t("overview.decision.conclusionOnTrack"),
            conclusionAboveBudget: t("overview.decision.conclusionAboveBudget"),
            conclusionBelowBudget: t("overview.decision.conclusionBelowBudget"),
            conclusionForecastUnavailable: t("overview.decision.conclusionForecastUnavailable"),
            conclusionBudgetUnavailable: t("overview.decision.conclusionBudgetUnavailable"),
            conclusionNoConclusion: t("overview.decision.conclusionNoConclusion"),
            attentionTitle: t("overview.decision.attentionTitle"),
            attentionMissingBudget: t("overview.decision.attentionMissingBudget"),
            attentionMissingForecast: t("overview.decision.attentionMissingForecast"),
            attentionUnfavorableVariance: t("overview.decision.attentionUnfavorableVariance"),
            attentionTimingOverallocated: t("overview.decision.attentionTimingOverallocated"),
            attentionTimingAmbiguous: t("overview.decision.attentionTimingAmbiguous"),
            attentionPartialTimingTitle: t("overview.decision.attentionPartialTimingTitle"),
            attentionPartialTimingBody: t("overview.decision.attentionPartialTimingBody"),
            attentionNoStructure: t("overview.decision.attentionNoStructure"),
            driversTitle: t("overview.decision.driversTitle"),
            driversFavourable: t("overview.decision.driversFavourable"),
            driversUnfavourable: t("overview.decision.driversUnfavourable"),
            openReports: t("overview.decision.openReports"),
            expectedMovementTitle: t("overview.decision.expectedMovementTitle"),
            expectedMovementZeroTiming: t("overview.decision.expectedMovementZeroTiming"),
            expectedMovementZeroTimingAction: t("overview.decision.expectedMovementZeroTimingAction"),
            timingCoverageShort: t("overview.decision.timingCoverageShort"),
            untimedFooterTitle: t("overview.decision.untimedFooterTitle"),
            untimedFooterIncome: t("overview.decision.untimedFooterIncome"),
            untimedFooterExpense: t("overview.decision.untimedFooterExpense"),
            movementSemanticClarification: t("overview.decision.movementSemanticClarification"),
            timelineMonthPrecision: t("overview.decision.timelineMonthPrecision"),
            timelineRangePrecision: t("overview.decision.timelineRangePrecision"),
            timelineFinanceYearEnd: t("overview.decision.timelineFinanceYearEnd"),
            openTiming: t("overview.decision.openTiming"),
            openForecast: t("overview.openForecast"),
            openActuals: t("nav.actuals"),
            favorabilityFavorable: t("actuals.favorabilityFavorable"),
            favorabilityUnfavorable: t("actuals.favorabilityUnfavorable"),
            favorabilityOnPlan: t("actuals.favorabilityOnPlan"),
            measureUnavailable: t("overview.decision.measureUnavailable"),
          }}
        />
        <p className="sr-only" data-finance-route={FINANCE_WORKSPACE_ROUTE_V1} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
