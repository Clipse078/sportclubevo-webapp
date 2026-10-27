import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { FinanceScenarioOverviewPanel } from "@/components/admin/finance/scenario/FinanceScenarioOverviewPanel";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadForecastWorkspaceSnapshot } from "@/lib/finance/services/finance-forecast-query-service";
import {
  loadFinanceScenarioList,
} from "@/lib/finance/services/finance-scenario-query-service";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceScenarioOverviewPage({ searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const params = await searchParams;

  const forecastingEnabled = workspace.enabledCapabilities.has("FORECASTING");
  if (!forecastingEnabled) {
    redirect("/dashboard/finance");
  }

  const canView =
    workspace.ctx.permissionKeys.has(PERMISSIONS.FINANCE_VIEW) ||
    workspace.ctx.permissionKeys.has(PERMISSIONS.FINANCE_FORECAST_VIEW);
  if (!canView) {
    redirect("/dashboard/finance");
  }

  const { years, snapshot, hasAccounts, selectedYearId, baseCurrency } =
    await loadForecastWorkspaceSnapshot(prisma, workspace.ctx, params.yearId ?? null);

  const [list, archivedList] =
    selectedYearId && hasAccounts
      ? await Promise.all([
          loadFinanceScenarioList(prisma, workspace.ctx, selectedYearId, {
            includeArchived: false,
          }),
          loadFinanceScenarioList(prisma, workspace.ctx, selectedYearId, {
            includeArchived: true,
          }).then((full) => ({
            financeYearId: full.financeYearId,
            items: full.items.filter((item) => item.isArchived),
          })),
        ])
      : [null, null];

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.forecast"), href: "/dashboard/finance/forecast" },
          { label: t("forecast.subNav.scenarios") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("forecast.scenarios.pageTitle"),
          description: t("forecast.scenarios.pageDescription"),
        }}
        contextTabs={
          <FinanceWorkspaceTabs
            showStructure={workspace.canStructure}
            showReporting={workspace.showReportingNav}
            showBudget={workspace.showBudgetNav}
            showActuals={workspace.showActualsNav}
            showForecast={workspace.showForecastNav}
            showCommitments={workspace.showCommitmentsNav}
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              structure: t("nav.structure"),
              reporting: t("nav.reports"),
              budget: t("nav.budget"),
              actuals: t("nav.actuals"),
              forecast: t("nav.forecast"),
              commitments: t("nav.commitments"),
              settings: t("nav.structure_settings"),
            }}
            ariaLabel={t("contextTabsAria")}
          />
        }
      >
        <FinanceScenarioOverviewPanel
          years={years.map((y) => ({ id: y.id, name: y.name }))}
          selectedYearId={selectedYearId}
          list={list}
          archivedList={archivedList}
          baseCurrency={baseCurrency}
          formattingLocale={workspace.formattingLocale}
          canMutate={workspace.canForecastManage}
          hasAccounts={hasAccounts}
          expectedCurrentForecastVersionId={snapshot?.versionId ?? null}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
