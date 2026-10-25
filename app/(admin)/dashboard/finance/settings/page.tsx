import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceSettingsPanel } from "@/components/admin/finance/FinanceSettingsPanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import {
  FINANCE_SYSTEM_CAPABILITY_KEYS,
  isFinanceCapabilityImplemented,
} from "@/lib/finance/capability-registry";
import {
  listFinanceYears,
  listFinanceYearsForSettings,
} from "@/lib/finance/services/finance-year-service";
import { formatFinanceYearDateInputValue } from "@/lib/finance/setup/finance-year-date-input";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function FinanceSettingsPage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();

  if (!workspace.canAdmin && !workspace.canStructure) {
    notFound();
  }

  const years = workspace.canAdmin
    ? await listFinanceYears(prisma, workspace.ctx)
    : [];
  const existingYears = workspace.canAdmin
    ? (await listFinanceYearsForSettings(prisma, workspace.ctx)).map((year) => ({
        id: year.id,
        name: year.name,
        startDate: formatFinanceYearDateInputValue(year.startDate),
        endDate: formatFinanceYearDateInputValue(year.endDate),
        periodEditable: year.periodEditable,
      }))
    : [];
  const config = workspace.snapshot.configuration;
  const canCompleteSetup =
    workspace.canAdmin &&
    Boolean(config?.baseCurrency) &&
    years.length > 0 &&
    config?.setupStatus !== "CONFIGURED";

  const capabilityRows = FINANCE_SYSTEM_CAPABILITY_KEYS.map((capability) => ({
    capability,
    enabled: workspace.enabledCapabilities.has(capability),
    configurable: isFinanceCapabilityImplemented(capability) && workspace.canAdmin,
  }));

  const newYearDraftDefaults = {
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  };

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.settings") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("settings.title"),
          description: t("settings.description"),
        }}
        contextTabs={
          <FinanceWorkspaceTabs
            showStructure={workspace.canStructure}
            showReporting={workspace.showReportingNav}
            showBudget={workspace.showBudgetNav}
            showActuals={workspace.showActualsNav}
            showForecast={workspace.showForecastNav}
            showSettings
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
        {workspace.canAdmin ? (
          <FinanceSettingsPanel
            baseCurrency={config?.baseCurrency ?? null}
            canCompleteSetup={canCompleteSetup}
            capabilityRows={capabilityRows}
            existingYears={existingYears}
            newYearDraftDefaults={newYearDraftDefaults}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("settings.structureOnlyHint")}</p>
        )}
      </SceWorkspaceChrome>
    </PageShell>
  );
}
