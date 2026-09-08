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
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.9375rem] font-bold leading-none text-[var(--foreground)]">
          {item.dayLabel}
        </span>
        <span className="mt-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {item.monthLabel}
        </span>
      </div>

      {item.logo && (
        <ClubLogo
          logoUrl={item.logo.logoUrl}
          name={item.logo.displayName}
          size="sm"
          bare
          className="hidden sm:block"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.location && (
          <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--muted)]">{item.location}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {item.eventType === "MATCH" && !item.logo && (
          <CalendarDays className="h-3.5 w-3.5 text-[var(--sce-secondary)]" aria-hidden="true" />
        )}
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
    "group flex items-start gap-3 border-b border-[var(--border)] py-3.5 last:border-b-0 motion-safe:transition-colors motion-safe:duration-150 motion-safe:hover:bg-[var(--surface-2)] -mx-2 rounded-lg px-2";

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
        className={cn("py-5", className)}
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
