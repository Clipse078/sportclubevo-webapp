import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SCE_WORKSPACE_RECORD_ROW_CLASS } from "@/lib/sce/sce-workspace-surface-styles";
import { DashboardSection } from "./DashboardSection";
import { DashboardEmptyState } from "./DashboardEmptyState";
import SceWorkspaceEmptyState from "@/components/sce/workspace/SceWorkspaceEmptyState";
import type { DashboardPersonalTaskPreviewItem } from "@/lib/dashboard/personal-attention";

type Props = {
  previewItems: DashboardPersonalTaskPreviewItem[];
  embedded?: boolean;
};

export async function PersonalTasksPreview({ previewItems, embedded = false }: Props) {
  const t = await getTranslations("PersonalDashboard.tasks");
  const hasItems = previewItems.length > 0;

  const list = hasItems ? (
    <ul className="space-y-2" data-testid="personal-tasks-preview-list">
      {previewItems.map((item) => {
        const inner = (
          <>
            <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
            {item.subtitle ? (
              <p className="text-xs text-[var(--muted)] mt-0.5">{item.subtitle}</p>
            ) : null}
            {item.metaLine ? (
              <p className="text-xs text-[var(--muted)] mt-0.5">{item.metaLine}</p>
            ) : null}
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className={SCE_WORKSPACE_RECORD_ROW_CLASS}
                aria-label={
                  item.metaLine
                    ? t("rowAriaWithMeta", { title: item.title, meta: item.metaLine })
                    : t("rowAria", { title: item.title })
                }
              >
                {inner}
              </Link>
            ) : (
              <div className={SCE_WORKSPACE_RECORD_ROW_CLASS}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  ) : embedded ? (
    <SceWorkspaceEmptyState message={t("emptyDescription")} testId="personal-tasks-empty" />
  ) : (
    <DashboardEmptyState
      icon={<ProductDomainSceIcon name="tasks" size={16} />}
      title={t("emptyTitle")}
      description={t("emptyDescription")}
      variant="cockpit"
    />
  );

  if (embedded) {
    return <div data-testid="personal-tasks-preview">{list}</div>;
  }

  return (
    <DashboardSection
      title={t("title")}
      icon={<ProductDomainSceIcon name="tasks" size={16} />}
      iconAccent="info"
      variant={hasItems ? "card" : "flat"}
      density={hasItems ? "default" : "compact"}
      bodyClassName={hasItems ? "px-4 py-1.5 sm:px-5 sm:py-2" : "px-0 py-0"}
      actions={
        <Link
          href="/dashboard/aufgaben?bereich=meine"
          className="sce-link-primary text-[0.8125rem] font-medium"
        >
          {t("viewAll")} →
        </Link>
      }
    >
      {list}
    </DashboardSection>
  );
}
