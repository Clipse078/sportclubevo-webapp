"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  activityVisualStyle,
  aggregateClusterSemanticType,
  PLANNING_HUB_CONFLICT_BLOCK_CLASS,
} from "@/lib/planning-hub/activity-visual-style";
import { parseBlockDimensionPx } from "@/lib/planning-hub/activity-clipped-detail";
import { summarizeAggregateCluster } from "@/lib/planning-hub/scheduler/aggregate-cluster";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import PlanningHubClusterInspector from "./PlanningHubClusterInspector";
import PlanningHubActivityClippedDetailSurface from "./PlanningHubActivityClippedDetailSurface";

type Props = {
  items: WeekplannerItem[];
  dayKey: string;
  locale: string;
  timezone: string;
  style?: CSSProperties;
  blockLayoutPx?: { width: number; height: number };
  onOpenItem: (item: WeekplannerItem) => void;
  onEditItem?: (item: WeekplannerItem) => void;
  canEditItem?: (item: WeekplannerItem) => boolean;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

export default function PlanningHubCalendarClusterBlock({
  items,
  dayKey,
  locale,
  timezone,
  style,
  blockLayoutPx,
  onOpenItem,
  onEditItem,
  canEditItem,
}: Props) {
  const [open, setOpen] = useState(false);
  const start = new Date(Math.min(...items.map((i) => i.startAt.getTime())));
  const end = new Date(Math.max(...items.map((i) => i.endAt.getTime())));
  const timeLabel = formatTimeRange(start, end, locale, timezone);
  const summary = summarizeAggregateCluster(items, timeLabel);
  const clusterSemantic = activityVisualStyle(aggregateClusterSemanticType(items));
  const blockWidthPx = parseBlockDimensionPx(style?.width, 240);
  const blockHeightPx = parseBlockDimensionPx(style?.height, 64);
  const clippedDetailGeometry = {
    blockWidthPx,
    blockHeightPx,
    compact: true,
    layoutWidthPx: blockLayoutPx?.width,
    layoutHeightPx: blockLayoutPx?.height,
  };

  function handleClose() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    if (items.length === 0) {
      setOpen(false);
    }
  }, [open, items.length]);

  return (
    <>
      <div
        style={style}
        className={cn(
          "group absolute overflow-hidden rounded-md border border-[var(--border)] text-left shadow-sm",
          "border-l-[3px] hover:border-[var(--sce-primary)]/30",
          clusterSemantic.leftAccentClass,
          clusterSemantic.subtleSurfaceClass,
          summary.conflictCount > 0 && PLANNING_HUB_CONFLICT_BLOCK_CLASS,
        )}
      >
        <PlanningHubActivityClippedDetailSurface
          aggregateItems={items}
          aggregateTimeLabel={timeLabel}
          locale={locale}
          timezone={timezone}
          geometry={clippedDetailGeometry}
        >
          {(referenceProps) => (
            <button
              type="button"
              {...referenceProps}
              data-testid="planning-hub-calendar-cluster"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={`${summary.headline}, ${summary.conflictCount} mit Ressourcenkonflikt`}
              onClick={() => setOpen(true)}
              className="block h-full w-full px-1.5 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-1"
            >
              <div data-planning-hub-activity-content="true">
                <p
                  className="truncate text-[11px] font-semibold text-[var(--foreground)]"
                  data-planning-hub-clipped-text="true"
                >
                  {summary.headline}
                </p>
                <p
                  className="truncate text-[10px] text-[var(--text-2)]"
                  data-planning-hub-clipped-text="true"
                >
                  {summary.identityPreview}
                </p>
                <p className="truncate text-[10px] tabular-nums text-[var(--muted)]">{timeLabel}</p>
                {summary.endTimeActionLabel && (
                  <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-amber-800/90">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
                    {summary.endTimeActionLabel}
                  </p>
                )}
                {summary.conflictLabel && (
                  <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-amber-800/90">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
                    {summary.conflictLabel}
                  </p>
                )}
              </div>
            </button>
          )}
        </PlanningHubActivityClippedDetailSurface>
      </div>

      <PlanningHubClusterInspector
        open={open}
        onClose={handleClose}
        items={items}
        dayKey={dayKey}
        locale={locale}
        timezone={timezone}
        onOpenItem={onOpenItem}
        onEditItem={onEditItem}
        canEditItem={canEditItem}
      />
    </>
  );
}
