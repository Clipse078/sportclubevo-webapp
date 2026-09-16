"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import { buildPlanningHubHref, type PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import {
  daypartVisibleRange,
  defaultDaypartForLocalTime,
  resolveCalendarViewport,
  type PlanningHubCalendarDaypart,
} from "@/lib/planning-hub/planning-dayparts";
import {
  calendarHeightPxForClippedActivity,
  calendarTopPxForClippedActivity,
  clipActivityToVisibleWindow,
} from "@/lib/planning-hub/scheduler/activity-window";
import { laneHorizontalStyle } from "@/lib/planning-hub/scheduler/interval-lanes";
import {
  CALENDAR_DAYPART_AGGREGATE_BELOW_WIDTH_PX,
  CALENDAR_DAYPART_MIN_ACTIVITY_WIDTH_PX,
  CALENDAR_MIN_ACTIVITY_WIDTH_PX,
  estimateDayColumnWidthPx,
  laneWidthPx,
  planCalendarDayLayout,
} from "@/lib/planning-hub/scheduler/calendar-day-layout";
import {
  CALENDAR_DAYPART_PIXELS_PER_MINUTE,
  CALENDAR_PIXELS_PER_MINUTE,
  minutesToCalendarTopPx,
  type VisibleTimeRange,
} from "@/lib/planning-hub/scheduler/time-scale";
import { resolveCalendarTimeRange } from "@/lib/planning-hub/scheduler/time-range-focus";
import { dayKeyInTimeZone, zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubActivityBlock from "./PlanningHubActivityBlock";
import PlanningHubCalendarClusterBlock from "./PlanningHubCalendarClusterBlock";
import PlanningHubDaypartSwitcher from "./PlanningHubDaypartSwitcher";
import {
  effectiveItemTimes,
  projectedItemForRender,
  usePlanningHubManipulation,
} from "./PlanningHubManipulationContext";
import { evaluateManipulationConflicts } from "@/lib/planning-hub/manipulation-projection";
import { isoToLocalTime } from "@/lib/planning-hub/planner-time";

type PlanningHubCalendarViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  todayDayKey: string;
  onItemActivate: (item: WeekplannerItem) => void;
};

const TIME_GUTTER_WIDTH_PX = 48;
const DAY_MIN_WIDTH_PX = 120;

function clipItemMinutes(
  startAt: Date,
  endAt: Date,
  window: VisibleTimeRange,
  timezone: string,
) {
  const startMin = zonedMinutesFromMidnight(startAt, timezone);
  const endMin = Math.max(startMin + 15, zonedMinutesFromMidnight(endAt, timezone));
  return clipActivityToVisibleWindow(startMin, endMin, window);
}

export default function PlanningHubCalendarView({
  week,
  urlState,
  locale,
  timezone,
  todayDayKey,
  onItemActivate,
}: PlanningHubCalendarViewProps) {
  const manipulation = usePlanningHubManipulation();
  const filtered = applyPlanningHubFilters(week, urlState);
  const allItems = week.days.flatMap((d) => d.items);
  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredGridWidthPx, setMeasuredGridWidthPx] = useState<number | null>(null);

  const viewport = useMemo(
    () => resolveCalendarViewport(urlState.calendarZeit, new Date(), timezone),
    [urlState.calendarZeit, timezone],
  );

  const isFullDay = viewport.mode === "full";
  const activeDaypart: PlanningHubCalendarDaypart =
    viewport.mode === "daypart" ? viewport.daypart : "morgen";

  useEffect(() => {
    const node = gridRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setMeasuredGridWidthPx(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const activityIntervals = useMemo(
    () =>
      filtered.days.flatMap((day) =>
        day.items.map((item) => ({ startAt: item.startAt, endAt: item.endAt })),
      ),
    [filtered.days],
  );

  const timeRange = useMemo((): VisibleTimeRange => {
    if (isFullDay) {
      return resolveCalendarTimeRange(activityIntervals, timezone, "full").range;
    }
    return daypartVisibleRange(activeDaypart);
  }, [activityIntervals, timezone, isFullDay, activeDaypart]);

  const pixelsPerMinute = isFullDay ? CALENDAR_PIXELS_PER_MINUTE : CALENDAR_DAYPART_PIXELS_PER_MINUTE;
  const layoutAggregateBelow = isFullDay
    ? undefined
    : CALENDAR_DAYPART_AGGREGATE_BELOW_WIDTH_PX;
  const minActivityWidth = isFullDay
    ? CALENDAR_MIN_ACTIVITY_WIDTH_PX
    : CALENDAR_DAYPART_MIN_ACTIVITY_WIDTH_PX;

  const columnWidthPx = estimateDayColumnWidthPx(DAY_MIN_WIDTH_PX, measuredGridWidthPx ?? undefined);

  const gridHeightPx = timeRange.totalMinutes * pixelsPerMinute;
  const hourMarks: number[] = [];
  for (let m = timeRange.startMinutes; m <= timeRange.endMinutes; m += 30) {
    hourMarks.push(m);
  }

  const now = new Date();
  const nowMinutes =
    week.days.some((d) => d.dayKey === todayDayKey) ? zonedMinutesFromMidnight(now, timezone) : null;
  const showNowLine =
    !isFullDay &&
    nowMinutes !== null &&
    nowMinutes >= timeRange.startMinutes &&
    nowMinutes < timeRange.endMinutes;

  const formatGridLabel = (minutes: number) => {
    if (minutes >= 24 * 60) return "00:00";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${String(h).padStart(2, "0")}:00`;
    return null;
  };

  return (
    <div
      className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]"
      data-testid="planning-hub-calendar"
    >
      {isFullDay ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/60 px-2 py-1.5"
          data-testid="planning-hub-calendar-full-day-bar"
        >
          <span className="text-[11px] font-medium text-[var(--text-2)]">Ganzer Tag</span>
          <Link
            href={buildPlanningHubHref(urlState, {
              calendarZeit: defaultDaypartForLocalTime(new Date(), timezone),
            })}
            className="text-[11px] font-semibold text-[var(--text-2)] hover:text-[var(--foreground)]"
            data-testid="planning-hub-calendar-exit-full-day"
          >
            Tagesabschnitte
          </Link>
        </div>
      ) : (
        <PlanningHubDaypartSwitcher
          urlState={urlState}
          activeDaypart={activeDaypart}
          showAdvancedFullDay
        />
      )}

      <div ref={gridRef} className="min-w-[720px]">
        <div
          className="sticky top-0 z-20 grid border-b border-[var(--border)] bg-[var(--surface)]"
          style={{
            gridTemplateColumns: `${TIME_GUTTER_WIDTH_PX}px repeat(7, minmax(${DAY_MIN_WIDTH_PX}px, 1fr))`,
          }}
        >
          <div />
          {filtered.days.map((day) => {
            const isToday = day.dayKey === todayDayKey;
            return (
              <div
                key={day.dayKey}
                className={cn(
                  "border-l border-[var(--border)] px-1.5 py-1.5 text-center",
                  isToday && "bg-[var(--sce-primary-light)]/35",
                )}
                data-testid="planning-hub-calendar-day-header"
                data-day={day.dayKey}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-2)]">
                  {new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: timezone }).format(
                    new Date(`${day.dayKey}T12:00:00.000Z`),
                  )}
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {new Intl.DateTimeFormat(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: timezone,
                  }).format(new Date(`${day.dayKey}T12:00:00.000Z`))}
                </p>
                {isToday && (
                  <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">Heute</p>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: `${TIME_GUTTER_WIDTH_PX}px repeat(7, minmax(${DAY_MIN_WIDTH_PX}px, 1fr))`,
          }}
        >
          <div className="relative border-r border-[var(--border)]" style={{ height: gridHeightPx }}>
            {hourMarks.map((minutes) => {
              const label = formatGridLabel(minutes);
              return (
                <div
                  key={minutes}
                  className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--muted)]"
                  style={{
                    top: minutesToCalendarTopPx(minutes, timeRange, pixelsPerMinute),
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {filtered.days.map((day) => {
            const dayItems = day.items.filter(
              (item) => dayKeyInTimeZone(item.startAt, timezone) === day.dayKey,
            );
            const intervals = dayItems
              .map((item) => {
                const { startAt, endAt } = effectiveItemTimes(
                  item,
                  manipulation?.previewDraft?.itemId === item.id ? manipulation.previewDraft : null,
                );
                const clip = clipItemMinutes(startAt, endAt, timeRange, timezone);
                if (!clip) return null;
                const startMin = zonedMinutesFromMidnight(startAt, timezone);
                const startMs =
                  startAt.getTime() + (clip.visibleStartMinutes - startMin) * 60_000;
                const endMs =
                  startAt.getTime() + (clip.visibleEndMinutes - startMin) * 60_000;
                return { id: item.id, startMs, endMs };
              })
              .filter((i): i is { id: string; startMs: number; endMs: number } => Boolean(i));

            const layoutSegments = planCalendarDayLayout(intervals, columnWidthPx, {
              aggregateBelowPx: layoutAggregateBelow,
            });
            const itemsById = new Map(dayItems.map((item) => [item.id, item]));
            const isToday = day.dayKey === todayDayKey;

            return (
              <div
                key={day.dayKey}
                className={cn(
                  "relative border-l border-[var(--border)]",
                  isToday && "bg-[var(--sce-primary-light)]/12",
                )}
                style={{ height: gridHeightPx }}
                data-testid="planning-hub-calendar-day-column"
                data-day={day.dayKey}
              >
                {hourMarks.map((minutes) => (
                  <div
                    key={minutes}
                    className={cn(
                      "absolute left-0 right-0 border-t",
                      minutes % 60 === 0
                        ? "border-[var(--border)]"
                        : "border-[var(--border)]/35 border-dashed",
                    )}
                    style={{
                      top: minutesToCalendarTopPx(minutes, timeRange, pixelsPerMinute),
                    }}
                  />
                ))}

                {showNowLine && isToday && nowMinutes !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 border-t border-[var(--sce-primary)]/50"
                    style={{
                      top: minutesToCalendarTopPx(nowMinutes, timeRange, pixelsPerMinute),
                    }}
                    data-testid="planning-hub-calendar-now-line"
                  >
                    <span
                      className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[var(--sce-primary)]/70"
                      aria-hidden
                    />
                  </div>
                )}

                {layoutSegments.map((segment) => {
                  if (segment.kind === "aggregate") {
                    const clusterItems = segment.itemIds
                      .map((id) => itemsById.get(id))
                      .filter((item): item is WeekplannerItem => Boolean(item));
                    const startMin = zonedMinutesFromMidnight(
                      new Date(segment.startMs),
                      timezone,
                    );
                    const endMin = Math.max(
                      startMin + 15,
                      zonedMinutesFromMidnight(new Date(segment.endMs), timezone),
                    );
                    const clip = clipActivityToVisibleWindow(startMin, endMin, timeRange);
                    if (!clip) return null;
                    const top = calendarTopPxForClippedActivity(
                      clip.visibleStartMinutes,
                      timeRange,
                      pixelsPerMinute,
                    );
                    const height = calendarHeightPxForClippedActivity(
                      clip.visibleStartMinutes,
                      clip.visibleEndMinutes,
                      pixelsPerMinute,
                    );
                    return (
                      <PlanningHubCalendarClusterBlock
                        key={`cluster-${segment.clusterId}`}
                        items={clusterItems}
                        locale={locale}
                        timezone={timezone}
                        onActivateItem={onItemActivate}
                        style={{
                          top,
                          height,
                          left: 2,
                          width: "calc(100% - 4px)",
                        }}
                      />
                    );
                  }

                  const item = itemsById.get(segment.itemId);
                  if (!item) return null;
                  const layout = segment.layout;
                  const { leftPercent, widthPercent } = laneHorizontalStyle(layout);
                  const caps = manipulation?.getCapabilities(item);
                  const activeDraft =
                    manipulation?.previewDraft?.itemId === item.id ? manipulation.previewDraft : null;

                  const renderBlock = (
                    blockItem: typeof item,
                    startAt: Date,
                    endAt: Date,
                    variant: "default" | "ghost" | "preview" | "preview-warning",
                    keySuffix: string,
                    pointerHandlers?: {
                      canDrag: boolean;
                      canResize: boolean;
                      onMove?: (clientY: number) => void;
                      onResize?: (clientY: number) => void;
                    },
                  ) => {
                    const clip = clipItemMinutes(startAt, endAt, timeRange, timezone);
                    if (!clip) return null;
                    const top = calendarTopPxForClippedActivity(
                      clip.visibleStartMinutes,
                      timeRange,
                      pixelsPerMinute,
                    );
                    const height = calendarHeightPxForClippedActivity(
                      clip.visibleStartMinutes,
                      clip.visibleEndMinutes,
                      pixelsPerMinute,
                    );
                    const laneW = laneWidthPx(layout.totalLanes, columnWidthPx);
                    const compact = height < 52 || laneW < minActivityWidth;
                    const timeLabel = `${isoToLocalTime(startAt, timezone)}–${isoToLocalTime(endAt, timezone)}`;
                    return (
                      <PlanningHubActivityBlock
                        key={`${item.id}${keySuffix}`}
                        item={blockItem}
                        locale={locale}
                        timezone={timezone}
                        compact={compact}
                        visualVariant={variant}
                        dragTimeLabel={timeLabel}
                        continuesFromBefore={clip.continuesFromBefore}
                        continuesAfter={clip.continuesAfter}
                        canDrag={pointerHandlers?.canDrag ?? false}
                        canResize={pointerHandlers?.canResize ?? false}
                        onPointerDownMove={
                          pointerHandlers?.onMove
                            ? (event) => pointerHandlers.onMove!(event.clientY)
                            : undefined
                        }
                        onPointerDownResize={
                          pointerHandlers?.onResize
                            ? (event) => pointerHandlers.onResize!(event.clientY)
                            : undefined
                        }
                        onActivate={() => {
                          if (manipulation?.isDragging) return;
                          onItemActivate(item);
                        }}
                        style={{
                          top,
                          height,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                        }}
                      />
                    );
                  };

                  if (activeDraft && manipulation?.isDragging) {
                    const projected = projectedItemForRender(
                      item,
                      activeDraft,
                      urlState.resourceCategory,
                      manipulation.resolveResourceRef,
                    );
                    const targetRef = activeDraft.proposedResourceId
                      ? manipulation.resolveResourceRef(activeDraft.proposedResourceId)
                      : null;
                    const conflict = evaluateManipulationConflicts(
                      allItems,
                      activeDraft,
                      targetRef,
                      urlState.resourceCategory,
                    );
                    const previewVariant =
                      conflict.status === "warning" ? "preview-warning" : "preview";
                    return (
                      <Fragment key={item.id}>
                        {renderBlock(item, activeDraft.originalStart, activeDraft.originalEnd, "ghost", "-ghost")}
                        {renderBlock(
                          projected,
                          activeDraft.proposedStart,
                          activeDraft.proposedEnd,
                          previewVariant,
                          "-preview",
                        )}
                      </Fragment>
                    );
                  }

                  const { startAt, endAt } = effectiveItemTimes(item, activeDraft);
                  const displayItem = activeDraft
                    ? projectedItemForRender(
                        item,
                        activeDraft,
                        urlState.resourceCategory,
                        manipulation!.resolveResourceRef,
                      )
                    : item;

                  return renderBlock(
                    displayItem,
                    startAt,
                    endAt,
                    "default",
                    "",
                    manipulation?.enabled && caps
                      ? {
                          canDrag: caps.canMoveTime,
                          canResize: caps.canResize,
                          onMove: (clientY) => manipulation.beginCalendarMove(item, clientY),
                          onResize: (clientY) => manipulation.beginCalendarResize(item, clientY),
                        }
                      : undefined,
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
