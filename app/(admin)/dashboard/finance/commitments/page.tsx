import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { FinanceCommitmentWorkspacePanel } from "@/components/admin/finance/commitment/FinanceCommitmentWorkspacePanel";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadFinanceCommitmentWorkspaceSnapshot } from "@/lib/finance/services/finance-commitment-query-service";
import { canViewFinanceCommitments } from "@/lib/finance/commitment/finance-commitment-authorization";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    yearId?: string;
    page?: string;
    lifecycle?: string;
    approval?: string;
    q?: string;
  }>;
};

export default async function FinanceCommitmentsPage({ searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const params = await searchParams;

  if (!workspace.showCommitmentsNav || !canViewFinanceCommitments(workspace.ctx)) {
    redirect("/dashboard/finance");
  }

  const commitmentsEnabled = workspace.enabledCapabilities.has("COMMITMENTS");
  if (!commitmentsEnabled) {
    redirect("/dashboard/finance");
  }

  const page = params.page ? Number.parseInt(params.page, 10) : 1;

  const snapshot = await loadFinanceCommitmentWorkspaceSnapshot(prisma, workspace.ctx, {
    financeYearId: params.yearId ?? null,
    page: Number.isFinite(page) ? page : 1,
    lifecycleStatus: params.lifecycle ?? null,
    approvalStatus: params.approval ?? null,
    search: params.q ?? null,
  });

  const accounts = await prisma.financialAccount.findMany({
    where: {
      tenantId: workspace.ctx.tenantId,
      lifecycle: "ACTIVE",
      canonicalSemantic: { in: ["INCOME", "EXPENSE"] },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.commitments") },
        ]}
        header={{
          eyebrow: t("commitments.workspace.eyebrow"),
          title: t("commitments.workspace.pageTitle"),
          description: t("commitments.workspace.pageDescription"),
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
        <FinanceCommitmentWorkspacePanel
          snapshot={snapshot}
          accounts={accounts}
          formattingLocale={workspace.formattingLocale}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
