import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceForecastWorkspacePanel } from "@/components/admin/finance/FinanceForecastWorkspacePanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadForecastWorkspaceSnapshot } from "@/lib/finance/services/finance-forecast-query-service";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceForecastPage({ searchParams }: PageProps) {
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

  const { years, snapshot, hasAccounts, selectedYearId, baseCurrency, creation } =
    await loadForecastWorkspaceSnapshot(prisma, workspace.ctx, params.yearId ?? null);

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.forecast") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("forecast.pageTitle"),
          description: t("forecast.pageDescription"),
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
        <FinanceForecastWorkspacePanel
          years={years.map((y) => ({ id: y.id, name: y.name }))}
          snapshot={snapshot}
          baseCurrency={baseCurrency}
          hasAccounts={hasAccounts}
          canMutate={workspace.canForecastManage}
          selectedYearId={selectedYearId}
          formattingLocale={workspace.formattingLocale}
          creation={creation}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
