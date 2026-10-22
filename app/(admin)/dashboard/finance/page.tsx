import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceOverviewPanel } from "@/components/admin/finance/FinanceOverviewPanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { FINANCE_WORKSPACE_ROUTE_V1 } from "@/lib/finance/finance-architecture";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();

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
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              settings: t("nav.structure_settings"),
            }}
            ariaLabel={t("contextTabsAria")}
          />
        }
      >
        <FinanceOverviewPanel
          state={workspace.overviewState}
          canAdmin={workspace.canAdmin}
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
          }}
        />
        <p className="sr-only" data-finance-route={FINANCE_WORKSPACE_ROUTE_V1} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
