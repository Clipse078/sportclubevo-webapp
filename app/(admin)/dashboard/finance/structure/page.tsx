import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { FinanceStructureBuilderPanel } from "@/components/admin/finance/FinanceStructureBuilderPanel";
import { FinanceWorkspaceTabs } from "@/components/admin/finance/FinanceWorkspaceTabs";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { loadFinanceStructureSnapshot } from "@/lib/finance/services/finance-structure-query-service";
import { loadFinanceStructureTemplateState } from "@/lib/finance/services/finance-structure-template-service";
import { prisma } from "@/lib/db/prisma";
import type { FinanceStructureTreeNode } from "@/lib/finance/structure/build-structure-tree";

export const dynamic = "force-dynamic";

function flattenGroupOptionsFromTree(
  nodes: FinanceStructureTreeNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const options: { id: string; name: string; depth: number }[] = [];
  for (const node of nodes) {
    if (node.type !== "group") continue;
    options.push({ id: node.id, name: node.name, depth });
    options.push(...flattenGroupOptionsFromTree(node.children, depth + 1));
  }
  return options;
}

export default async function FinanceStructurePage() {
  const t = await getTranslations("Finance");
  const workspace = await loadFinanceWorkspaceContext();

  const snapshot = await loadFinanceStructureSnapshot(prisma, workspace.ctx);
  const templateState = await loadFinanceStructureTemplateState(prisma, workspace.ctx);

  return (
    <PageShell>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: t("breadcrumbs.dashboard"), href: "/dashboard" },
          { label: t("breadcrumbs.finance"), href: "/dashboard/finance" },
          { label: t("breadcrumbs.structure") },
        ]}
        header={{
          eyebrow: t("workspace.eyebrow"),
          title: t("structure.pageTitle"),
          description: t("structure.pageDescription"),
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
        <FinanceStructureBuilderPanel
          tree={snapshot.tree}
          isEmpty={snapshot.isEmpty}
          canMutate={workspace.canStructure}
          appliedTemplateKey={templateState.appliedTemplateKey}
          groupOptions={flattenGroupOptionsFromTree(snapshot.tree)}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
