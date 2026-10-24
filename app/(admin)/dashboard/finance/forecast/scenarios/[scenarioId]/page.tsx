import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { FinanceScenarioDetailPanel } from "@/components/admin/finance/scenario/FinanceScenarioDetailPanel";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadForecastWorkspaceSnapshot } from "@/lib/finance/services/finance-forecast-query-service";
import { loadFinanceScenarioDetail } from "@/lib/finance/services/finance-scenario-query-service";
import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceScenarioDetailPage({ params, searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const { scenarioId } = await params;
  const query = await searchParams;

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

  const { selectedYearId, baseCurrency, hasAccounts } = await loadForecastWorkspaceSnapshot(
    prisma,
    workspace.ctx,
    query.yearId ?? null,
  );

  if (!selectedYearId || !hasAccounts) {
    redirect("/dashboard/finance/forecast/scenarios");
  }

  let detail;
  try {
    detail = await loadFinanceScenarioDetail(prisma, workspace.ctx, {
      financeYearId: selectedYearId,
      scenarioId,
    });
  } catch {
    notFound();
  }

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.forecast"), href: "/dashboard/finance/forecast" },
          {
            label: t("forecast.subNav.scenarios"),
            href: `/dashboard/finance/forecast/scenarios?yearId=${selectedYearId}`,
          },
          { label: detail.name },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: detail.name,
          description: detail.description ?? t("forecast.scenarios.detailFallbackDescription"),
        }}
        contextTabs={
          <FinanceWorkspaceTabs
            showStructure={workspace.canStructure}
            showBudget={workspace.showBudgetNav}
            showActuals={workspace.showActualsNav}
            showForecast={workspace.showForecastNav}
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              structure: t("nav.structure"),
              budget: t("nav.budget"),
              actuals: t("nav.actuals"),
              forecast: t("nav.forecast"),
              settings: t("nav.structure_settings"),
            }}
            ariaLabel={t("contextTabsAria")}
          />
        }
      >
        <FinanceScenarioDetailPanel
          key={`${detail.scenarioId}-${detail.updatedAt}`}
          detail={detail}
          financeYearId={selectedYearId}
          baseCurrency={baseCurrency}
          formattingLocale={workspace.formattingLocale}
          canMutate={workspace.canForecastManage}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
