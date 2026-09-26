import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardSection } from "./DashboardSection";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { DashboardPersonalTaskPreviewItem } from "@/lib/dashboard/personal-attention";

type Props = {
  previewItems: DashboardPersonalTaskPreviewItem[];
  embedded?: boolean;
};

export async function PersonalTasksPreview({ previewItems, embedded = false }: Props) {
  const t = await getTranslations("PersonalDashboard.tasks");
  const hasItems = previewItems.length > 0;

  const list = hasItems ? (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--border)_85%,transparent)]">
          {previewItems.map((item) => {
            const content = (
              <>
                <span className="block text-[0.875rem] font-medium text-[var(--foreground)]">
                  {item.title}
                </span>
                {item.subtitle ? (
                  <p className="text-[0.75rem] text-[var(--muted-foreground)]">{item.subtitle}</p>
                ) : null}
                {item.metaLine ? (
                  <p className="mt-0.5 text-[0.75rem] text-[var(--muted-foreground)]">{item.metaLine}</p>
                ) : null}
              </>
            );

            return (
              <li key={item.id} className="py-2.5">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:text-[var(--primary)]"
                    aria-label={
                      item.metaLine
                        ? t("rowAriaWithMeta", { title: item.title, meta: item.metaLine })
                        : t("rowAria", { title: item.title })
                    }
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="block">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
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
