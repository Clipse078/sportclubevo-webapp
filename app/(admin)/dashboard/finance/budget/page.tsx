import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceBudgetWorkspacePanel } from "@/components/admin/finance/FinanceBudgetWorkspacePanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadBudgetWorkspaceSnapshot } from "@/lib/finance/services/finance-budget-query-service";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string }>;
};

export default async function FinanceBudgetPage({ searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const params = await searchParams;

  const budgetingEnabled = workspace.enabledCapabilities.has("BUDGETING");
  if (!budgetingEnabled) {
    redirect("/dashboard/finance");
  }

  const canView =
    workspace.ctx.permissionKeys.has(PERMISSIONS.FINANCE_VIEW) ||
    workspace.ctx.permissionKeys.has(PERMISSIONS.FINANCE_BUDGET_VIEW);
  if (!canView) {
    redirect("/dashboard/finance");
  }

  const { years, snapshot, hasAccounts, selectedYearId, baseCurrency } =
    await loadBudgetWorkspaceSnapshot(prisma, workspace.ctx, params.yearId ?? null);

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.budget") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("budget.pageTitle"),
          description: t("budget.pageDescription"),
        }}
        contextTabs={
          <FinanceWorkspaceTabs
            showStructure={workspace.canStructure}
            showBudget={workspace.showBudgetNav}
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              structure: t("nav.structure"),
              budget: t("nav.budget"),
              settings: t("nav.structure_settings"),
            }}
            ariaLabel={t("contextTabsAria")}
          />
        }
      >
        <FinanceBudgetWorkspacePanel
          years={years.map((y) => ({ id: y.id, name: y.name }))}
          snapshot={snapshot}
          baseCurrency={baseCurrency}
          hasAccounts={hasAccounts}
          canMutate={workspace.canBudgetManage}
          canApprove={workspace.canBudgetApprove}
          selectedYearId={selectedYearId}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
