import type { EventType } from "@prisma/client";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

export type DashboardTodayTimelineProps = {
  items: TodayScheduleItem[];
  emptyState?: React.ReactNode;
  className?: string;
};

function getTypeAccent(type?: EventType | "MEETING"): string {
  switch (type) {
    case "MATCH":
      return "var(--sce-secondary)";
    case "TRAINING":
      return "var(--sce-info)";
    case "TOURNAMENT":
      return "var(--sce-warning)";
    case "MEETING":
      return "var(--sce-primary)";
    default:
      return "var(--text-2)";
  }
}

function TimelineRow({ item }: { item: TodayScheduleItem }) {
  const accent = getTypeAccent(item.eventType);

  return (
    <li className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 pb-5 last:pb-0">
      <div className="pt-0.5 text-right">
        <p className="font-mono text-xs font-medium tabular-nums text-[var(--foreground)]">
          {item.timeLabel}
        </p>
        {item.endTimeLabel && (
          <p className="mt-0.5 font-mono text-[0.65rem] tabular-nums text-[var(--muted)]">
            {item.endTimeLabel}
          </p>
        )}
      </div>

      <div className="relative min-w-0 border-l border-[var(--border)] pl-4">
        <span
          className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-[var(--background)]"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />

        <div className="rounded-lg bg-[var(--surface)] px-3.5 py-3 transition-colors duration-[120ms] hover:bg-[var(--surface-2)]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[0.65rem] font-semibold uppercase tracking-[0.08em]"
              style={{ color: accent }}
            >
              {item.typeLabel}
            </span>
          </div>

          <p className="mt-1 text-sm font-medium leading-snug text-[var(--foreground)]">
            {item.title}
          </p>

          {item.subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-2)]">{item.subtitle}</p>
          )}

          {item.meta && (
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
              {item.meta}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Premium operational timeline for today's club schedule.
 */
export function DashboardTodayTimeline({
  items,
  emptyState,
  className,
}: DashboardTodayTimelineProps) {
  if (items.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <DashboardEmptyState
            title="Heute ist nichts geplant"
            description="Trainings, Spiele und Veranstaltungen erscheinen hier, sobald sie im Kalender erfasst sind."
          />
        )}
      </div>
    );
  }

  return (
    <ol className={cn("relative", className)} aria-label="Heutiger Tagesplan">
      {items.map((item) => (
        <TimelineRow key={item.key} item={item} />
      ))}
    </ol>
  );
}
