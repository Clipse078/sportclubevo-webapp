import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

export type DashboardTodayTimelineItem = TodayScheduleItem & {
  href?: string;
};

export type DashboardTodayTimelineProps = {
  items: DashboardTodayTimelineItem[];
  emptyState?: React.ReactNode;
  compact?: boolean;
  className?: string;
};

function getTypeAccent(type?: TodayScheduleItem["eventType"]): string {
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

function MetaSegments({ meta }: { meta: string }) {
  const segments = meta.split(" · ").filter(Boolean);

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {segments.map((segment) => (
        <span
          key={segment}
          className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[0.6875rem] leading-snug text-[var(--text-2)]"
        >
          {segment}
        </span>
      ))}
    </div>
  );
}

function TimelineRow({
  item,
  compact,
  isLast,
}: {
  item: DashboardTodayTimelineItem;
  compact?: boolean;
  isLast: boolean;
}) {
  const accent = getTypeAccent(item.eventType);
  const content = (
    <>
      <div className="pt-0.5 text-right">
        <p className="font-mono text-[0.8125rem] font-semibold tabular-nums text-[var(--foreground)]">
          {item.timeLabel}
        </p>
        {item.endTimeLabel && (
          <p className="mt-0.5 font-mono text-[0.6875rem] tabular-nums text-[var(--muted)]">
            {item.endTimeLabel}
          </p>
        )}
      </div>

      <div className="relative min-w-0 border-l-2 border-[var(--border)] pl-4 sm:pl-5">
        <span
          className="absolute -left-[6px] top-2 h-3 w-3 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)]"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />

        <div
          className={cn(
            "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60",
            compact ? "px-3.5 py-3" : "px-4 py-3.5",
            "motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-150",
            item.href && "motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)] motion-safe:hover:shadow-[var(--shadow-xs)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                style={{ color: accent }}
              >
                {item.typeLabel}
              </span>

              <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)] sm:text-base">
                {item.title}
              </p>

              {item.subtitle && (
                <p className="mt-0.5 text-[0.8125rem] text-[var(--text-2)]">{item.subtitle}</p>
              )}

              {item.meta && <MetaSegments meta={item.meta} />}
            </div>

            {item.href && (
              <ChevronRight
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );

  const rowClassName = cn(
    "group relative grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4.25rem_minmax(0,1fr)]",
    !isLast && (compact ? "pb-4" : "pb-5"),
  );

  if (item.href) {
    return (
      <li className={rowClassName}>
        <Link href={item.href} className="contents no-underline">
          {content}
        </Link>
      </li>
    );
  }

  return <li className={rowClassName}>{content}</li>;
}

/**
 * Premium operational timeline for today's club schedule.
 */
export function DashboardTodayTimeline({
  items,
  emptyState,
  compact = false,
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
      {items.map((item, index) => (
        <TimelineRow
          key={item.key}
          item={item}
          compact={compact}
          isLast={index === items.length - 1}
        />
      ))}
    </ol>
  );
}
