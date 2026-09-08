import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export type DashboardActivityItem = {
  key: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  timestamp: string;
  tag?: string;
  tagVariant?: BadgeVariant;
};

export type DashboardActivityFeedProps = {
  items: DashboardActivityItem[];
  emptyState?: ReactNode;
  className?: string;
};

export function DashboardActivityFeed({
  items,
  emptyState,
  className,
}: DashboardActivityFeedProps) {
  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <div
            key={item.key}
            className={cn(
              "group flex items-start gap-2 py-1.5 motion-safe:transition-colors motion-safe:duration-150",
              "motion-safe:hover:bg-[var(--surface-2)] -mx-1 rounded-md px-1",
              !isLast && "border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)]",
            )}
          >
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--muted)]"
              aria-hidden="true"
            >
              {item.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-medium leading-snug text-[var(--foreground)]">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="mt-0.5 text-[0.6875rem] leading-snug text-[var(--text-2)]">
                  {item.subtitle}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-[0.625rem] text-[var(--muted)]">{item.timestamp}</span>
              {item.tag && (
                <Badge variant={item.tagVariant ?? "default"} size="sm">
                  {item.tag}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
