import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { UpcomingScheduleItem } from "@/lib/dashboard/command-center";

export type DashboardUpcomingListProps = {
  items: UpcomingScheduleItem[];
  className?: string;
};

function UpcomingRow({ item }: { item: UpcomingScheduleItem }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-[var(--surface)]">
        <span className="text-sm font-bold leading-none text-[var(--foreground)]">
          {item.dayLabel}
        </span>
        <span className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-[var(--muted)]">
          {item.monthLabel}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.location && (
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{item.location}</p>
        )}
      </div>

      <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-2)]">
        {item.timeLabel}
      </span>
    </div>
  );
}

export function DashboardUpcomingList({ items, className }: DashboardUpcomingListProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        className={cn("py-6", className)}
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
