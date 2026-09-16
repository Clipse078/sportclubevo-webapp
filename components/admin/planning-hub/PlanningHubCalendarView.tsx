"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { assignIntervalLanes, laneHorizontalStyle } from "@/lib/planning-hub/scheduler/interval-lanes";
import {
  CALENDAR_PIXELS_PER_MINUTE,
  computeVisibleTimeRange,
  durationToCalendarHeightPx,
  minutesToCalendarTopPx,
} from "@/lib/planning-hub/scheduler/time-scale";
import { dayKeyInTimeZone, zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubActivityBlock from "./PlanningHubActivityBlock";

type PlanningHubCalendarViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  todayDayKey: string;
  onItemActivate: (item: WeekplannerItem) => void;
};

const TIME_GUTTER_WIDTH_PX = 52;
const DAY_MIN_WIDTH_PX = 108;

export default function PlanningHubCalendarView({
  week,
  urlState,
  locale,
  timezone,
  todayDayKey,
  onItemActivate,
}: PlanningHubCalendarViewProps) {
  const filtered = applyPlanningHubFilters(week, urlState);

  const timeRange = useMemo(
    () =>
      computeVisibleTimeRange(
        filtered.days.flatMap((day) =>
          day.items.map((item) => ({ startAt: item.startAt, endAt: item.endAt })),
        ),
        timezone,
      ),
    [filtered.days, timezone],
  );

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
      className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]"
      data-testid="planning-hub-calendar"
    >
      <div className="min-w-[720px]">
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
                  "border-l border-[var(--border)] px-2 py-2 text-center",
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
            const intervals = day.items.map((item) => ({
              id: item.id,
              startMs: item.startAt.getTime(),
              endMs: item.endAt.getTime(),
            }));
            const lanes = assignIntervalLanes(intervals);
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
                    className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-[var(--sce-primary)]/50"
                    style={{
                      top: minutesToCalendarTopPx(nowMinutes, timeRange, CALENDAR_PIXELS_PER_MINUTE),
                    }}
                    data-testid="planning-hub-calendar-now-line"
                  />
                )}

                {day.items.map((item) => {
                  const startMin = zonedMinutesFromMidnight(item.startAt, timezone);
                  const endMin = Math.max(
                    startMin + 15,
                    zonedMinutesFromMidnight(item.endAt, timezone),
                  );
                  if (dayKeyInTimeZone(item.startAt, timezone) !== day.dayKey) {
                    return null;
                  }
                  const layout = lanes.get(item.id) ?? { lane: 0, totalLanes: 1 };
                  const { leftPercent, widthPercent } = laneHorizontalStyle(layout);
                  const top = minutesToCalendarTopPx(startMin, timeRange, CALENDAR_PIXELS_PER_MINUTE);
                  const height = durationToCalendarHeightPx(
                    startMin,
                    endMin,
                    timeRange,
                    CALENDAR_PIXELS_PER_MINUTE,
                  );
                  const compact = height < 48;

                  return (
                    <PlanningHubActivityBlock
                      key={item.id}
                      item={item}
                      locale={locale}
                      timezone={timezone}
                      compact={compact}
                      onActivate={() => onItemActivate(item)}
                      style={{
                        top,
                        height,
                        left: `calc(${leftPercent}% + 2px)`,
                        width: `calc(${widthPercent}% - 4px)`,
                      }}
                    />
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
