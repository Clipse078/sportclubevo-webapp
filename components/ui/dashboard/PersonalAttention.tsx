import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { PersonalAttentionItem } from "@/lib/dashboard/personal-attention";
import { PersonalAttentionRow } from "./PersonalAttentionRow";

export type PersonalAttentionProps = {
  items: PersonalAttentionItem[];
  totalCount: number;
  viewAllHref: string | null;
  operationalSourcesDegraded?: boolean;
  className?: string;
};

export async function PersonalAttention({
  items,
  totalCount,
  viewAllHref,
  operationalSourcesDegraded = false,
  className,
}: PersonalAttentionProps) {
  const t = await getTranslations("PersonalDashboard.attention");

  if (items.length === 0) {
    const degraded = operationalSourcesDegraded;
    return (
      <DashboardEmptyState
        className={cn("min-h-0", className)}
        icon={
          degraded ? (
            <Bell className="h-4 w-4 text-[var(--sce-warning)]" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-[var(--sce-success)]" />
          )
        }
        title={degraded ? t("partialEmptyTitle") : t("emptyTitle")}
        description={degraded ? t("partialEmptyDescription") : t("emptyDescription")}
        variant="cockpit"
      />
    );
  }

  const showViewAll =
    viewAllHref && totalCount > items.length ? (
      <Link href={viewAllHref} className="sce-link-primary text-[0.8125rem] font-medium">
        {t("viewAll")} →
      </Link>
    ) : viewAllHref ? (
      <Link href={viewAllHref} className="sce-link-primary text-[0.8125rem] font-medium">
        {t("openInbox")} →
      </Link>
    ) : null;

  const overdueLabel = t("urgency.overdue");
  const dueTodayLabel = t("urgency.dueToday");

  return (
    <div className={className}>
      {showViewAll ? (
        <div className="mb-1 flex justify-end border-b border-[var(--border)] pb-2">{showViewAll}</div>
      ) : null}
      <div role="list" aria-label={t("listAria")}>
        {items.map((item) => {
          const statusText = item.presentationStatus ?? item.summary;
          const ariaLabel = statusText
            ? t("rowAriaWithStatus", { title: item.title, status: statusText })
            : t("rowAria", { title: item.title });

          return (
            <PersonalAttentionRow
              key={item.id}
              item={item}
              overdueLabel={overdueLabel}
              dueTodayLabel={dueTodayLabel}
              ariaLabel={ariaLabel}
            />
          );
        })}
      </div>
    </div>
  );
}
