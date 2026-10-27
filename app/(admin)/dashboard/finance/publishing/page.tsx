import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { FinancePublishingFoundationPanel } from "@/components/admin/finance/publishing/FinancePublishingFoundationPanel";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadFinancePublishingFoundationReadModel } from "@/lib/finance/services/finance-publishing-foundation-query-service";
import { canViewFinancePublicationHistory } from "@/lib/finance/publishing/finance-publishing-authorization";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function FinancePublishingFoundationPage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();

  const reportingEnabled = workspace.enabledCapabilities.has("REPORTING");
  if (!reportingEnabled) {
    redirect("/dashboard/finance");
  }

  if (!canViewFinancePublicationHistory(workspace.ctx)) {
    redirect("/dashboard/finance");
  }

  const model = await loadFinancePublishingFoundationReadModel(prisma, workspace.ctx);

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.publishing") },
        ]}
        header={{
          eyebrow: t("publishing.foundation.eyebrow"),
          title: t("publishing.foundation.pageTitle"),
          description: t("publishing.foundation.pageDescription"),
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
        <FinancePublishingFoundationPanel model={model} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
