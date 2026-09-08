import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type UpcomingEventItem = {
  key: string;
  day: string;
  month: string;
  title: string;
  location?: string | null;
  time: string;
};

export type DashboardUpcomingListProps = {
  items: UpcomingEventItem[];
  emptyIcon?: ReactNode;
  className?: string;
};

export function DashboardUpcomingList({
  items,
  emptyIcon,
  className,
}: DashboardUpcomingListProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={emptyIcon}
        title="Keine bevorstehenden Termine"
        className={cn("py-8", className)}
      />
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-3 py-3",
              !isLast && "border-b border-[var(--border)]",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--surface-2)]">
              <span className="text-sm font-bold leading-none text-[var(--foreground)]">
                {item.day}
              </span>
              <span className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-[var(--muted)]">
                {item.month}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium leading-tight text-[var(--foreground)]">
                {item.title}
              </p>
              {item.location && (
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {item.location}
                </p>
              )}
            </div>
            <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)]">
              {item.time}
            </span>
          </div>
        );
      })}
    </div>
  );
}
