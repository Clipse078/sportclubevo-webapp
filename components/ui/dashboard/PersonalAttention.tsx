import Link from "next/link";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { PersonalAttentionItem } from "@/lib/dashboard/personal-attention";

export type PersonalAttentionProps = {
  items: PersonalAttentionItem[];
  totalCount: number;
  viewAllHref: string | null;
  className?: string;
};

const SOURCE_ICON: Record<
  string,
  { icon: typeof ListChecks; accent: string; bg: string }
> = {
  TASK: {
    icon: ListChecks,
    accent: "var(--sce-primary)",
    bg: "var(--sce-primary-light)",
  },
  ATTENDANCE_RESPONSE: {
    icon: CalendarClock,
    accent: "var(--sce-warning)",
    bg: "var(--sce-warning-light)",
  },
  REQUIREMENT: {
    icon: ClipboardCheck,
    accent: "var(--sce-info)",
    bg: "var(--sce-info-light)",
  },
};

function urgencyPrefix(
  item: PersonalAttentionItem,
  labels: { overdue: string; dueToday: string },
): string | null {
  if (item.urgency === "overdue") return labels.overdue;
  if (item.urgency === "due_today") return labels.dueToday;
  return null;
}

function AttentionRow({
  item,
  labels,
}: {
  item: PersonalAttentionItem;
  labels: {
    overdue: string;
    dueToday: string;
    rowAria: (title: string, status: string | null) => string;
  };
}) {
  const iconConfig = SOURCE_ICON[item.sourceType] ?? {
    icon: Bell,
    accent: "var(--sce-primary)",
    bg: "var(--sce-primary-light)",
  };
  const Icon = iconConfig.icon;
  const prefix = urgencyPrefix(item, labels);
  const statusText = item.presentationStatus ?? item.summary;
  const ariaLabel = labels.rowAria(item.title, statusText);

  return (
    <Link
      href={item.deepLink}
      className={cn(
        "group flex items-start gap-3 border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] py-3 no-underline last:border-b-0",
        "motion-safe:transition-colors motion-safe:duration-150 motion-safe:hover:bg-[var(--surface-2)] -mx-1.5 rounded-md px-1.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
      )}
      aria-label={ariaLabel}
    >
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{ backgroundColor: iconConfig.bg, color: iconConfig.accent }}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
          {prefix ? (
            <>
              <span className="sr-only">{prefix}. </span>
              <span aria-hidden="true">{prefix} · </span>
              {item.title}
            </>
          ) : (
            item.title
          )}
        </p>
        {item.summary ? (
          <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--muted)]">{item.summary}</p>
        ) : null}
        {item.presentationStatus ? (
          <p className="mt-0.5 text-[0.75rem] font-medium leading-relaxed text-[var(--muted-foreground)]">
            {item.presentationStatus}
          </p>
        ) : null}
        {item.contextLabel ? (
          <p className="mt-0.5 text-[0.6875rem] uppercase tracking-wide text-[var(--muted)]">
            {item.contextLabel}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="mt-2 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
        aria-hidden="true"
      />
    </Link>
  );
}

export async function PersonalAttention({
  items,
  totalCount,
  viewAllHref,
  className,
}: PersonalAttentionProps) {
  const t = await getTranslations("PersonalDashboard.attention");

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        className={cn("min-h-0", className)}
        icon={<CheckCircle2 className="h-4 w-4 text-[var(--sce-success)]" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
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

  return (
    <div className={className}>
      {showViewAll ? (
        <div className="mb-1 flex justify-end border-b border-[var(--border)] pb-2">{showViewAll}</div>
      ) : null}
      <div role="list" aria-label={t("listAria")}>
        {items.map((item) => (
          <AttentionRow
            key={item.id}
            item={item}
            labels={{
              overdue: t("urgency.overdue"),
              dueToday: t("urgency.dueToday"),
              rowAria: (title, status) =>
                status ? t("rowAriaWithStatus", { title, status }) : t("rowAria", { title }),
            }}
          />
        ))}
      </div>
    </div>
  );
}
