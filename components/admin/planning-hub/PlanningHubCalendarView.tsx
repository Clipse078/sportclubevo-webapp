"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  allDayLaneRowCount,
  collectAllDayLaneSegments,
  isTimedCalendarItem,
} from "@/lib/planning-hub/all-day-lane";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import {
  daypartVisibleRange,
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
  CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX,
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
import { useWeekplannerVisibleTimeRange } from "./WeekplannerVisibleTimeRangeContext";
import { dayKeyInTimeZone, zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubAllDayLane from "./PlanningHubAllDayLane";
import PlanningHubActivityBlock from "./PlanningHubActivityBlock";
import PlanningHubCalendarClusterBlock from "./PlanningHubCalendarClusterBlock";
import PlanningHubDaypartSwitcher from "./PlanningHubDaypartSwitcher";
import { usePlanningHubCalendarZeit } from "@/hooks/use-planning-hub-calendar-zeit";
import {
  effectiveItemTimes,
  projectedItemForRender,
  usePlanningHubManipulation,
} from "./PlanningHubManipulationContext";
import { isoToLocalTime } from "@/lib/planning-hub/planner-time";

type PlanningHubCalendarViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  todayDayKey: string;
  onItemActivate: (item: WeekplannerItem) => void;
  onItemOpen?: (item: WeekplannerItem) => void;
  onItemEdit?: (item: WeekplannerItem) => void;
  canEditItem?: (item: WeekplannerItem) => boolean;
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
  onItemOpen,
  onItemEdit,
  canEditItem,
}: PlanningHubCalendarViewProps) {
  const openClusterItem = onItemOpen ?? onItemActivate;
  const editClusterItem = onItemEdit ?? onItemActivate;
  const manipulation = usePlanningHubManipulation();
  const { visibleRange: userVisibleRange } = useWeekplannerVisibleTimeRange();
  const { urlState: calendarUrlState, setCalendarZeit } = usePlanningHubCalendarZeit(urlState, {
    timeZone: timezone,
  });
  const onSelectDaypart = useCallback(
    (daypart: PlanningHubCalendarDaypart) => setCalendarZeit(daypart),
    [setCalendarZeit],
  );
  const onSelectFullDay = useCallback(() => setCalendarZeit("ganz"), [setCalendarZeit]);

  const filtered = applyPlanningHubFilters(week, calendarUrlState);
  const allDaySegments = useMemo(
    () => collectAllDayLaneSegments(week, calendarUrlState, timezone),
    [week, calendarUrlState, timezone],
  );
  const allDayRows = allDayLaneRowCount(allDaySegments);
  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredGridWidthPx, setMeasuredGridWidthPx] = useState<number | null>(null);

  const viewport = useMemo(
    () => resolveCalendarViewport(calendarUrlState.calendarZeit, new Date(), timezone),
    [calendarUrlState.calendarZeit, timezone],
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

  const timeRange = useMemo((): VisibleTimeRange => {
    if (!isFullDay) {
      return daypartVisibleRange(activeDaypart);
    }
    return userVisibleRange;
  }, [isFullDay, activeDaypart, userVisibleRange]);

  const pixelsPerMinute = isFullDay ? CALENDAR_PIXELS_PER_MINUTE : CALENDAR_DAYPART_PIXELS_PER_MINUTE;
  const layoutAggregateBelow = isFullDay
    ? CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX
    : CALENDAR_DAYPART_AGGREGATE_BELOW_WIDTH_PX;
  const minActivityWidth = isFullDay
    ? CALENDAR_MIN_ACTIVITY_WIDTH_PX
    : CALENDAR_DAYPART_MIN_ACTIVITY_WIDTH_PX;

  const columnWidthPx = estimateDayColumnWidthPx(DAY_MIN_WIDTH_PX, measuredGridWidthPx ?? undefined);
  const weekDayKeys = useMemo(() => filtered.days.map((d) => d.dayKey), [filtered.days]);

  useEffect(() => {
    manipulation?.setCalendarDragLayout({
      dayColumnWidthPx: columnWidthPx,
      weekDayKeys,
    });
  }, [manipulation, columnWidthPx, weekDayKeys]);

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
      <PlanningHubDaypartSwitcher
        urlState={calendarUrlState}
        activeDaypart={activeDaypart}
        fullDayActive={isFullDay}
        showNowCueInActiveDaypart={showNowLine}
        showAdvancedFullDay
        onSelectDaypart={onSelectDaypart}
        onSelectFullDay={onSelectFullDay}
      />

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

        <PlanningHubAllDayLane
          segments={allDaySegments}
          rowCount={allDayRows}
          dayMinWidthPx={DAY_MIN_WIDTH_PX}
          timeGutterWidthPx={TIME_GUTTER_WIDTH_PX}
          onItemActivate={onItemActivate}
        />

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
            const dayItems = day.items.filter(isTimedCalendarItem);
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
                        dayKey={day.dayKey}
                        locale={locale}
                        timezone={timezone}
                        onOpenItem={openClusterItem}
                        onEditItem={editClusterItem}
                        canEditItem={canEditItem}
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
                      onMove?: (clientX: number, clientY: number) => void;
                      onResize?: (edge: "start" | "end", clientX: number, clientY: number) => void;
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
                            ? (clientX, clientY) => pointerHandlers.onMove!(clientX, clientY)
                            : undefined
                        }
                        onPointerDownResize={
                          pointerHandlers?.onResize
                            ? (edge, clientX, clientY) =>
                                pointerHandlers.onResize!(edge, clientX, clientY)
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
                    const previewVariant =
                      manipulation.dragConflictPreview?.status === "warning"
                        ? "preview-warning"
                        : "preview";
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
                          onMove: (clientX, clientY) =>
                            manipulation.beginCalendarMove(item, clientX, clientY),
                          onResize: (edge, clientX, clientY) =>
                            manipulation.beginCalendarResize(item, edge, clientX, clientY),
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
