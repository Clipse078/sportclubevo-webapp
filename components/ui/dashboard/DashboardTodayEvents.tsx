import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type TodayEventItem = {
  key: string;
  time: string;
  typeLabel: string;
  title: string;
  location?: string | null;
};

export type DashboardTodayEventsProps = {
  events: TodayEventItem[];
  countLabel?: string;
  emptyStateAction?: ReactNode;
  className?: string;
};

export function DashboardTodayEvents({
  events,
  countLabel,
  emptyStateAction,
  className,
}: DashboardTodayEventsProps) {
  if (events.length === 0) {
    return (
      <DashboardEmptyState
        title="Heute sind keine Termine geplant."
        description={countLabel}
        action={emptyStateAction}
        className={cn("py-10", className)}
      />
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;

        return (
          <div
            key={event.key}
            className={cn(
              "flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-3",
              !isLast && "border-b border-[var(--border)]",
            )}
          >
            <div className="flex shrink-0 items-center gap-3">
              <span className="w-14 font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {event.time}
              </span>
              <span
                className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
                style={{
                  background: "color-mix(in srgb, var(--sce-primary) 10%, var(--surface-2))",
                  color: "var(--text-2)",
                }}
              >
                {event.typeLabel}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {event.title}
              </p>
              {event.location && (
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {event.location}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type DashboardTodayEventsLinkActionProps = {
  href: string;
  label: string;
};

export function DashboardTodayEventsLinkAction({
  href,
  label,
}: DashboardTodayEventsLinkActionProps) {
  return (
    <Link href={href} className="sce-link-primary text-[0.8125rem]">
      {label} →
    </Link>
  );
}
