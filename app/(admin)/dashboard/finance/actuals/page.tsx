import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceActualsWorkspacePanel } from "@/components/admin/finance/FinanceActualsWorkspacePanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadActualsWorkspaceSnapshot } from "@/lib/finance/services/finance-actual-query-service";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ yearId?: string; mode?: string }>;
};

export default async function FinanceActualsPage({ searchParams }: PageProps) {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();
  const params = await searchParams;

  const actualsEnabled = workspace.enabledCapabilities.has("ACTUALS");
  if (!actualsEnabled || !workspace.canActualView) {
    redirect("/dashboard/finance");
  }

  const comparisonMode = params.mode === "ytd" ? "YTD" : "FULL_YEAR";

  const { years, snapshot } = await loadActualsWorkspaceSnapshot(prisma, workspace.ctx, {
    requestedYearId: params.yearId ?? null,
    comparisonMode,
  });

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.actuals") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("actuals.pageTitle"),
          description: t("actuals.pageDescription"),
        }}
        contextTabs={
          <FinanceWorkspaceTabs
            showStructure={workspace.canStructure}
            showBudget={workspace.showBudgetNav}
            showActuals={workspace.showActualsNav}
            showSettings={workspace.canAdmin || workspace.canStructure}
            labels={{
              overview: t("nav.overview"),
              structure: t("nav.structure"),
              budget: t("nav.budget"),
              actuals: t("nav.actuals"),
              settings: t("nav.structure_settings"),
            }}
            ariaLabel={t("contextTabsAria")}
          />
        }
      >
        <FinanceActualsWorkspacePanel
          years={years}
          snapshot={snapshot}
          canMutate={workspace.canActualManage}
          formattingLocale={workspace.formattingLocale}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
