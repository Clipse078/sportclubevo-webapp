"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import { buildPlanningHubHref, type PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { laneHorizontalStyle } from "@/lib/planning-hub/scheduler/interval-lanes";
import {
  CALENDAR_MIN_ACTIVITY_WIDTH_PX,
  estimateDayColumnWidthPx,
  laneWidthPx,
  planCalendarDayLayout,
} from "@/lib/planning-hub/scheduler/calendar-day-layout";
import {
  CALENDAR_PIXELS_PER_MINUTE,
  durationToCalendarHeightPx,
  minutesToCalendarTopPx,
} from "@/lib/planning-hub/scheduler/time-scale";
import { resolveCalendarTimeRange } from "@/lib/planning-hub/scheduler/time-range-focus";
import { dayKeyInTimeZone, zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubActivityBlock from "./PlanningHubActivityBlock";
import PlanningHubCalendarClusterBlock from "./PlanningHubCalendarClusterBlock";
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

  const timeRangeResult = useMemo(
    () => resolveCalendarTimeRange(activityIntervals, timezone, urlState.calendarTimeRange),
    [activityIntervals, timezone, urlState.calendarTimeRange],
  );
  const timeRange = timeRangeResult.range;
  const columnWidthPx = estimateDayColumnWidthPx(DAY_MIN_WIDTH_PX, measuredGridWidthPx ?? undefined);

  const gridHeightPx = timeRange.totalMinutes * CALENDAR_PIXELS_PER_MINUTE;
  const hourMarks: number[] = [];
  for (let m = timeRange.startMinutes; m <= timeRange.endMinutes; m += 30) {
    hourMarks.push(m);
  }

  const now = new Date();
  const nowMinutes =
    week.days.some((d) => d.dayKey === todayDayKey) ? zonedMinutesFromMidnight(now, timezone) : null;
  const showNowLine =
    nowMinutes !== null &&
    nowMinutes >= timeRange.startMinutes &&
    nowMinutes <= timeRange.endMinutes;

  return (
    <div
      className="overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] [scrollbar-width:thin]"
      data-testid="planning-hub-calendar"
    >
      {(timeRangeResult.hasEarlierActivities || timeRangeResult.hasLaterActivities) && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-[var(--border)]/60 px-2 py-1 text-[11px] text-[var(--text-2)]"
          data-testid="planning-hub-calendar-range-hint"
        >
          {timeRangeResult.hasEarlierActivities && (
            <span>Aktivitäten vor {String(Math.floor(timeRange.startMinutes / 60)).padStart(2, "0")}:00</span>
          )}
          {timeRangeResult.hasLaterActivities && (
            <span>Aktivitäten nach {String(Math.floor(timeRange.endMinutes / 60)).padStart(2, "0")}:00</span>
          )}
          <Link
            href={buildPlanningHubHref(urlState, { calendarTimeRange: "full" })}
            className="font-semibold text-[var(--sce-primary)] hover:underline"
            data-testid="planning-hub-calendar-show-full-range"
          >
            Ganzer Tag
          </Link>
        </div>
      )}
      {urlState.calendarTimeRange === "full" && activityIntervals.length > 0 && (
        <div className="flex justify-end border-b border-[var(--border)]/60 px-2 py-1">
          <Link
            href={buildPlanningHubHref(urlState, { calendarTimeRange: "focused" })}
            className="text-[11px] font-semibold text-[var(--text-2)] hover:text-[var(--foreground)]"
            data-testid="planning-hub-calendar-show-focused-range"
          >
            Betriebszeiten
          </Link>
        </div>
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
                  isToday && "bg-[var(--sce-primary-light)]/40",
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
            {hourMarks.map((minutes) => (
              <div
                key={minutes}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--muted)]"
                style={{
                  top: minutesToCalendarTopPx(minutes, timeRange, CALENDAR_PIXELS_PER_MINUTE),
                }}
              >
                {minutes % 60 === 0
                  ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`
                  : null}
              </div>
            ))}
          </div>

          {filtered.days.map((day) => {
            const dayItems = day.items.filter(
              (item) => dayKeyInTimeZone(item.startAt, timezone) === day.dayKey,
            );
            const intervals = dayItems.map((item) => ({
              id: item.id,
              startMs: item.startAt.getTime(),
              endMs: item.endAt.getTime(),
            }));
            const layoutSegments = planCalendarDayLayout(intervals, columnWidthPx);
            const itemsById = new Map(dayItems.map((item) => [item.id, item]));
            const isToday = day.dayKey === todayDayKey;

            return (
              <div
                key={day.dayKey}
                className={cn(
                  "relative border-l border-[var(--border)]",
                  isToday && "bg-[var(--sce-primary-light)]/15",
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
                        : "border-[var(--border)]/40 border-dashed",
                    )}
                    style={{
                      top: minutesToCalendarTopPx(minutes, timeRange, CALENDAR_PIXELS_PER_MINUTE),
                    }}
                  />
                ))}

                {showNowLine && isToday && nowMinutes !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 border-t border-[var(--sce-primary)]/40"
                    style={{
                      top: minutesToCalendarTopPx(nowMinutes, timeRange, CALENDAR_PIXELS_PER_MINUTE),
                    }}
                    data-testid="planning-hub-calendar-now-line"
                  />
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
                    const top = minutesToCalendarTopPx(startMin, timeRange, CALENDAR_PIXELS_PER_MINUTE);
                    const height = durationToCalendarHeightPx(
                      startMin,
                      endMin,
                      timeRange,
                      CALENDAR_PIXELS_PER_MINUTE,
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
                    const startMin = zonedMinutesFromMidnight(startAt, timezone);
                    const endMin = Math.max(startMin + 15, zonedMinutesFromMidnight(endAt, timezone));
                    const top = minutesToCalendarTopPx(startMin, timeRange, CALENDAR_PIXELS_PER_MINUTE);
                    const height = durationToCalendarHeightPx(
                      startMin,
                      endMin,
                      timeRange,
                      CALENDAR_PIXELS_PER_MINUTE,
                    );
                    const laneW = laneWidthPx(layout.totalLanes, columnWidthPx);
                    const compact = height < 48 || laneW < CALENDAR_MIN_ACTIVITY_WIDTH_PX;
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
