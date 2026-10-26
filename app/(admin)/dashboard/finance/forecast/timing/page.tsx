import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceForecastTimingWorkspacePanel } from "@/components/admin/finance/timing/FinanceForecastTimingWorkspacePanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadForecastWorkspaceSnapshot } from "@/lib/finance/services/finance-forecast-query-service";
import { loadFinanceForecastTimingOverview } from "@/lib/finance/services/finance-forecast-timing-query-service";
import { listFinanceExpectedFinancialEvents } from "@/lib/finance/services/finance-expected-financial-event-service";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceForecastTimingPage({ searchParams }: PageProps) {
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

  const selectedYear = years.find((y) => y.id === selectedYearId) ?? null;
  const financeYearStartDateIso = selectedYear?.startDate
    ? formatFinanceCalendarDateIso(selectedYear.startDate)
    : null;
  const financeYearEndDateIso = selectedYear?.endDate
    ? formatFinanceCalendarDateIso(selectedYear.endDate)
    : null;

  let overview = null;
  let timingVisual: FinanceForecastTimingVisualModel | null = null;
  let events: Awaited<ReturnType<typeof listFinanceExpectedFinancialEvents>> = [];
  let loadError: string | null = null;

  if (selectedYearId && hasAccounts && snapshot?.forecastId) {
    try {
      overview = await loadFinanceForecastTimingOverview(prisma, workspace.ctx, {
        financeYearId: selectedYearId,
      });
      events = await listFinanceExpectedFinancialEvents(prisma, workspace.ctx, {
        financeYearId: selectedYearId,
      });
      const accountNameById = new Map(
        overview.accounts.map((account) => [account.financialAccountId, account.name]),
      );
      timingVisual = buildFinanceForecastTimingVisualModel({
        overview,
        events,
        accountNameById,
        financeYearStartDateIso,
        financeYearEndDateIso,
      });
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unbekannter Fehler";
    }
  }

  const accountOptions = overview
    ? overview.accounts.map((account) => ({
        financialAccountId: account.financialAccountId,
        name: account.name,
        accountType: account.accountType,
        lifecycle: account.lifecycle,
      }))
    : [];

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.forecast"), href: "/dashboard/finance/forecast" },
          { label: t("forecast.subNav.timing") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("forecast.timing.pageTitle"),
          description: t("forecast.timing.pageDescription"),
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
        <FinanceForecastTimingWorkspacePanel
          years={years.map((y) => ({ id: y.id, name: y.name }))}
          selectedYearId={selectedYearId}
          hasAccounts={hasAccounts}
          hasCurrentForecast={Boolean(snapshot?.forecastId && snapshot.versionId)}
          overview={overview}
          timingVisual={timingVisual}
          events={events}
          accountOptions={accountOptions}
          baseCurrency={baseCurrency}
          formattingLocale={workspace.formattingLocale}
          canMutate={workspace.canForecastManage}
          financeYearEndDateIso={financeYearEndDateIso}
          loadError={loadError}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
