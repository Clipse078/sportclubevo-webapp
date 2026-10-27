import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { FinanceCommitmentApprovalInboxPanel } from "@/components/admin/finance/commitment/FinanceCommitmentApprovalInboxPanel";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { canApproveFinanceCommitments } from "@/lib/finance/commitment/finance-commitment-authorization";
import { loadFinanceCommitmentApprovalInboxSnapshot } from "@/lib/finance/services/finance-commitment-query-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceCommitmentApprovalsPage({ searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const params = await searchParams;

  if (!workspace.showCommitmentsNav || !canApproveFinanceCommitments(workspace.ctx)) {
    redirect("/dashboard/finance/commitments");
  }

  if (!workspace.enabledCapabilities.has("COMMITMENTS")) {
    redirect("/dashboard/finance");
  }

  const snapshot = await loadFinanceCommitmentApprovalInboxSnapshot(prisma, workspace.ctx, {
    financeYearId: params.yearId ?? null,
  });

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.commitments"), href: "/dashboard/finance/commitments" },
          { label: t("commitments.approvalInbox.breadcrumb") },
        ]}
        header={{
          eyebrow: t("commitments.approvalInbox.eyebrow"),
          title: t("commitments.approvalInbox.pageTitle"),
          description: t("commitments.approvalInbox.pageDescription"),
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
        <FinanceCommitmentApprovalInboxPanel
          snapshot={snapshot}
          formattingLocale={workspace.formattingLocale}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
