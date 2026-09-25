"use client";

import { cn } from "@/lib/cn";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";
import type { AllDayLaneSegment } from "@/lib/planning-hub/all-day-lane";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type PlanningHubAllDayLaneProps = {
  segments: AllDayLaneSegment[];
  rowCount: number;
  dayMinWidthPx: number;
  timeGutterWidthPx: number;
  onItemActivate: (item: WeekplannerItem) => void;
};

const ROW_HEIGHT_PX = 22;
const LANE_PAD_Y = 4;

export default function PlanningHubAllDayLane({
  segments,
  rowCount,
  dayMinWidthPx,
  timeGutterWidthPx,
  onItemActivate,
}: PlanningHubAllDayLaneProps) {
  if (rowCount === 0) return null;

  const heightPx = rowCount * ROW_HEIGHT_PX + LANE_PAD_Y * 2;

  return (
    <div
      className="grid border-b border-[var(--border)] bg-[var(--sce-surface-dense)]"
      style={{
        gridTemplateColumns: `${timeGutterWidthPx}px repeat(7, minmax(${dayMinWidthPx}px, 1fr))`,
        minHeight: heightPx,
      }}
      data-testid="planning-hub-all-day-lane"
    >
      <div className="flex items-center justify-end border-r border-[var(--border)] px-1">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Ganztägig
        </span>
      </div>
      <div
        className="relative col-span-7 grid"
        style={{
          gridTemplateColumns: `repeat(7, minmax(${dayMinWidthPx}px, 1fr))`,
        }}
      >
        {segments.map((segment) => {
          const semantic = activityVisualStyle("VERANSTALTUNG");
          return (
            <button
              key={`${segment.item.id}-${segment.startDayIndex}-${segment.lane}`}
              type="button"
              onClick={() => onItemActivate(segment.item)}
              data-testid="planning-hub-all-day-segment"
              className={cn(
                "absolute truncate rounded px-1.5 text-left text-[11px] font-medium leading-[20px] transition hover:brightness-110",
                semantic.subtleSurfaceClass,
                semantic.listLeftEdgeClass,
                "border-l-[3px]",
              )}
              style={{
                top: LANE_PAD_Y + segment.lane * ROW_HEIGHT_PX,
                left: `calc(${(segment.startDayIndex / 7) * 100}% + 2px)`,
                width: `calc(${(segment.spanDays / 7) * 100}% - 4px)`,
                height: ROW_HEIGHT_PX,
              }}
              title={segment.item.title}
            >
              {segment.item.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
