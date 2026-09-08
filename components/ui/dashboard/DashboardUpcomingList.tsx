import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { UpcomingScheduleItem } from "@/lib/dashboard/command-center";

export type DashboardUpcomingListProps = {
  items: UpcomingScheduleItem[];
  className?: string;
};

function UpcomingRow({ item }: { item: UpcomingScheduleItem }) {
  const content = (
    <>
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.9375rem] font-bold leading-none text-[var(--foreground)]">
          {item.dayLabel}
        </span>
        <span className="mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
          {item.monthLabel}
        </span>
      </div>

      {item.logo ? (
        <ClubLogo
          logoUrl={item.logo.logoUrl}
          name={item.logo.displayName}
          size="sm"
          bare
          className="shrink-0"
        />
      ) : item.eventType === "MATCH" ? (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--sce-secondary)_12%,transparent)] text-[var(--sce-secondary)]"
          aria-hidden="true"
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.location && (
          <p className="mt-0.5 line-clamp-1 text-[0.75rem] leading-snug text-[var(--muted)]">
            {item.location}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-start pt-0.5">
        <span className="font-mono text-[0.8125rem] font-medium tabular-nums text-[var(--text-2)]">
          {item.timeLabel}
        </span>
        {item.href && (
          <ChevronRight
            className="h-4 w-4 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );

  const rowClassName =
    "group flex items-start gap-2.5 border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] py-3 last:border-b-0 motion-safe:transition-colors motion-safe:duration-150 motion-safe:hover:bg-[var(--surface-2)] -mx-1.5 rounded-md px-1.5";

  if (item.href) {
    return (
      <Link href={item.href} className={cn(rowClassName, "no-underline")}>
        {content}
      </Link>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}

export function DashboardUpcomingList({ items, className }: DashboardUpcomingListProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        className={cn("py-4", className)}
        title="Keine kommenden Termine"
        description="Nach heute sind derzeit keine weiteren Termine geplant."
      />
    );
  }

  return (
    <div className={className} aria-label="Nächste Termine">
      {items.map((item) => (
        <UpcomingRow key={item.key} item={item} />
      ))}
    </div>
  );
}
