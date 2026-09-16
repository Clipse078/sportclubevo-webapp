"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { PopoverContent } from "@/components/ui/Popover";
import type { AggregateClusterSummary } from "@/lib/planning-hub/scheduler/aggregate-cluster";
import {
  schedulerDisplayIdentity,
  schedulerResourceCodes,
} from "@/lib/planning-hub/scheduler-display-label";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  summary: AggregateClusterSummary;
  items: WeekplannerItem[];
  locale: string;
  timezone: string;
  onActivateItem: (item: WeekplannerItem) => void;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

export default function PlanningHubClusterInspector({
  open,
  onOpenChange,
  anchorRef,
  summary,
  items,
  locale,
  timezone,
  onActivateItem,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const sorted = [...items].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
  );

  return (
    <PopoverContent
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      matchAnchorWidth={false}
      maxHeight={420}
      role="dialog"
      clipOverflow={false}
      className="w-[min(100vw-1.5rem,22.5rem)] min-w-[18rem] max-w-[24rem] overflow-hidden p-0"
      data-testid="planning-hub-cluster-inspector"
    >
      <div className="border-b border-[var(--border)] px-3 py-2.5">
        <p className="text-xs font-semibold text-[var(--foreground)]">
          Gleichzeitig · {summary.activityCount} Aktivitäten
        </p>
        {summary.timeLabel && (
          <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted)]">{summary.timeLabel}</p>
        )}
      </div>
      <ul
        ref={listRef}
        className="max-h-[min(60vh,22rem)] overflow-y-auto overflow-x-hidden py-1"
        role="listbox"
      >
        {sorted.map((item) => {
          const hasConflict = item.conflicts.length > 0;
          const resources = schedulerResourceCodes(item, 4);
          const semantic = activityVisualStyle(item.type);
          return (
            <li key={item.id} role="none">
              <button
                type="button"
                role="option"
                className={cn(
                  "flex w-full min-w-0 gap-2 border-l-[3px] px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]/40",
                  semantic.listLeftEdgeClass,
                  hasConflict && "ring-1 ring-inset ring-amber-500/20",
                )}
                onClick={() => {
                  onOpenChange(false);
                  onActivateItem(item);
                }}
              >
                <span
                  className={cn("mt-1.5 h-2 w-0.5 shrink-0 rounded-full", semantic.markerClass)}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {schedulerDisplayIdentity(item)}
                  </p>
                  <p className="mt-0.5 truncate text-xs tabular-nums text-[var(--text-2)]">
                    {formatTimeRange(item.startAt, item.endAt, locale, timezone)}
                  </p>
                  {resources && (
                    <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{resources}</p>
                  )}
                </div>
                {hasConflict && (
                  <span className="shrink-0 self-center" title="Ressourcenkonflikt">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600/90" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </PopoverContent>
  );
}
