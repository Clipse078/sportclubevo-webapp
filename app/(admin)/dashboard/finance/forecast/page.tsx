import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceForecastSubContextTabs } from "@/components/admin/finance/FinanceForecastSubContextTabs";
import { FinanceForecastWorkspacePanel } from "@/components/admin/finance/FinanceForecastWorkspacePanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import {
  loadForecastWorkspaceRollingUxData,
  loadForecastWorkspaceSnapshot,
} from "@/lib/finance/services/finance-forecast-query-service";
import { loadProjectionWorkspaceViewModel } from "@/lib/finance/services/finance-projection-workspace-query-service";
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

  const forecastAmountByAccountId = new Map<string, number | null>(
    snapshot?.rows.map((row) => [row.accountId, row.amountMinor]) ?? [],
  );
  const projection =
    selectedYearId && hasAccounts
      ? await loadProjectionWorkspaceViewModel(prisma, workspace.ctx, {
          financeYearId: selectedYearId,
          forecastAmountByAccountId,
        })
      : null;

  const rollingUx =
    selectedYearId && snapshot?.forecastId
      ? await loadForecastWorkspaceRollingUxData(prisma, workspace.ctx, selectedYearId)
      : null;

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
        <div className="flex min-w-0 flex-col gap-6">
          <FinanceForecastSubContextTabs
            labels={{
              current: t("forecast.subNav.current"),
              scenarios: t("forecast.subNav.scenarios"),
              timing: t("forecast.subNav.timing"),
            }}
            ariaLabel={t("forecast.subNav.aria")}
          />
          <FinanceForecastWorkspacePanel
          key={snapshot?.versionId ?? selectedYearId ?? "finance-forecast-workspace"}
          years={years.map((y) => ({ id: y.id, name: y.name }))}
          snapshot={snapshot}
          rollingUx={rollingUx}
          projection={projection}
          baseCurrency={baseCurrency}
          hasAccounts={hasAccounts}
          canMutate={workspace.canForecastManage}
          canGenerateProjection={workspace.canForecastManage}
          selectedYearId={selectedYearId}
          formattingLocale={workspace.formattingLocale}
          creation={creation}
          />
        </div>
      </SceWorkspaceChrome>
    </PageShell>
  );
}
