import type { Weekday } from "@/lib/training/types";
import { MANAGEMENT_WEEKDAY_SHORT } from "@/lib/training/management-series-view";
import { cn } from "@/lib/cn";

type Props = {
  weekdays: readonly Weekday[];
  className?: string;
};

export default function TrainingWeekdayPills({ weekdays, className }: Props) {
  if (weekdays.length === 0) {
    return <span className="text-sm text-[var(--muted)]">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)} data-testid="training-weekday-pills">
      {weekdays.map((weekday) => (
        <span
          key={weekday}
          className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-md bg-[var(--surface-2)] px-1.5 text-[0.6875rem] font-medium tabular-nums text-[var(--text-2)] ring-1 ring-[var(--border)]/80"
        >
          {MANAGEMENT_WEEKDAY_SHORT[weekday]}
        </span>
      ))}
    </div>
  );
}
