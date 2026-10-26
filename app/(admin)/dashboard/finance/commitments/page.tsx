import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { FinanceCommitmentFoundationPanel } from "@/components/admin/finance/commitment/FinanceCommitmentFoundationPanel";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadFinanceCommitmentFoundationReadModel } from "@/lib/finance/services/finance-commitment-foundation-query-service";
import { canViewFinanceCommitments } from "@/lib/finance/commitment/finance-commitment-authorization";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function FinanceCommitmentsFoundationPage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();

  if (!canViewFinanceCommitments(workspace.ctx)) {
    redirect("/dashboard/finance");
  }

  const model = await loadFinanceCommitmentFoundationReadModel(prisma, workspace.ctx);

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.commitments") },
        ]}
        header={{
          eyebrow: t("commitments.foundation.eyebrow"),
          title: t("commitments.foundation.pageTitle"),
          description: t("commitments.foundation.pageDescription"),
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
        <FinanceCommitmentFoundationPanel model={model} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
