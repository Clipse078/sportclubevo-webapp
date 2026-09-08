import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { UpcomingScheduleItem } from "@/lib/dashboard/command-center";

export type DashboardUpcomingListProps = {
  items: UpcomingScheduleItem[];
  className?: string;
};

function UpcomingRow({ item }: { item: UpcomingScheduleItem }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--border)] py-3.5 last:border-b-0">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.9375rem] font-bold leading-none text-[var(--foreground)]">
          {item.dayLabel}
        </span>
        <span className="mt-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {item.monthLabel}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.location && (
          <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--muted)]">{item.location}</p>
        )}
      </div>

      <span className="shrink-0 pt-0.5 font-mono text-[0.8125rem] font-medium tabular-nums text-[var(--text-2)]">
        {item.timeLabel}
      </span>
    </div>
  );
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
