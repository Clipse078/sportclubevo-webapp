"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import {
  buildPlanningHubHref,
  resolvePlanningHubResourceDay,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import { assignIntervalLanes } from "@/lib/planning-hub/scheduler/interval-lanes";
import {
  buildResourceSegmentsForDay,
  groupSegmentsByResource,
} from "@/lib/planning-hub/scheduler/resource-segments";
import {
  computeVisibleTimeRange,
  durationToResourceWidthPx,
  minutesToResourceLeftPx,
  RESOURCE_PIXELS_PER_MINUTE,
} from "@/lib/planning-hub/scheduler/time-scale";
import { zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubActivityBlock from "./PlanningHubActivityBlock";
import {
  projectedItemForRender,
  usePlanningHubManipulation,
} from "./PlanningHubManipulationContext";
import { evaluateManipulationConflicts } from "@/lib/planning-hub/manipulation-projection";
import { isoToLocalTime } from "@/lib/planning-hub/planner-time";

type PlanningHubResourceDayViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  todayDayKey: string;
  onItemActivate: (item: WeekplannerItem) => void;
};

const RESOURCE_LABEL_WIDTH_PX = 168;
const ROW_BASE_HEIGHT_PX = 44;

export default function PlanningHubResourceDayView({
  week,
  urlState,
  locale,
  timezone,
  todayDayKey,
  onItemActivate,
}: PlanningHubResourceDayViewProps) {
  const manipulation = usePlanningHubManipulation();
  const filtered = applyPlanningHubFilters(week, urlState);
  const allItems = week.days.flatMap((d) => d.items);
  const weekDayKeys = filtered.days.map((d) => d.dayKey);
  const selectedDay = resolvePlanningHubResourceDay(weekDayKeys, urlState.day, todayDayKey);
  const day = filtered.days.find((d) => d.dayKey === selectedDay) ?? filtered.days[0];

  const segments = useMemo(
    () => (day ? buildResourceSegmentsForDay(day.items, urlState.resourceCategory) : []),
    [day, urlState.resourceCategory],
  );

  const rows = useMemo(() => groupSegmentsByResource(segments), [segments]);

  const timeRange = useMemo(
    () =>
      computeVisibleTimeRange(
        segments.map((s) => ({ startAt: s.startAt, endAt: s.endAt })),
        timezone,
      ),
    [segments, timezone],
  );

  const timelineWidthPx = timeRange.totalMinutes * RESOURCE_PIXELS_PER_MINUTE;
  const halfHourMarks: number[] = [];
  for (let m = timeRange.startMinutes; m <= timeRange.endMinutes; m += 30) {
    halfHourMarks.push(m);
  }

  return (
    <div data-testid="planning-hub-resource-day">
      <div
        className="flex flex-wrap gap-1 border-b border-[var(--border)] px-3 py-2"
        data-testid="planning-hub-resource-day-selector"
      >
        {filtered.days.map((d) => {
          const isSelected = d.dayKey === selectedDay;
          const label = new Intl.DateTimeFormat(locale, {
            weekday: "short",
            day: "2-digit",
            timeZone: timezone,
          }).format(new Date(`${d.dayKey}T12:00:00.000Z`));
          return (
            <Link
              key={d.dayKey}
              href={buildPlanningHubHref(urlState, { day: d.dayKey, perspective: "ressourcen" })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                isSelected
                  ? "bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
              )}
              data-day={d.dayKey}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
          Keine Ressourcenbelegungen an diesem Tag.
        </p>
      ) : (
        <div className="overflow-auto">
          <div className="min-w-[640px]">
            <div
              className="sticky top-0 z-10 flex border-b border-[var(--border)] bg-[var(--surface)]"
              style={{ paddingLeft: RESOURCE_LABEL_WIDTH_PX }}
            >
              <div className="relative h-8 shrink-0" style={{ width: timelineWidthPx }}>
                {halfHourMarks.map((minutes) => (
                  <div
                    key={minutes}
                    className="absolute top-0 flex h-full flex-col justify-end border-l border-[var(--border)]/50 pb-0.5 pl-1 text-[10px] tabular-nums text-[var(--muted)]"
                    style={{
                      left: minutesToResourceLeftPx(minutes, timeRange, RESOURCE_PIXELS_PER_MINUTE),
                    }}
                  >
                    {minutes % 60 === 0
                      ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`
                      : null}
                  </div>
                ))}
              </div>
            </div>

            {rows.map((row) => {
              const intervals = row.segments.map((s) => ({
                id: s.segmentId,
                startMs: s.startAt.getTime(),
                endMs: s.endAt.getTime(),
              }));
              const lanes = assignIntervalLanes(intervals);
              const maxLane =
                row.segments.reduce(
                  (max, s) => Math.max(max, (lanes.get(s.segmentId)?.lane ?? 0) + 1),
                  1,
                ) ?? 1;
              const rowHeight = ROW_BASE_HEIGHT_PX * maxLane;

              return (
                <div
                  key={row.resourceId}
                  className={cn(
                    "flex border-b border-[var(--border)]/60",
                    manipulation?.hoverResourceId === row.resourceId &&
                      manipulation.isDragging &&
                      "bg-[var(--sce-primary-light)]/25",
                  )}
                  data-testid="planning-hub-resource-row"
                  data-planning-resource-id={row.resourceId}
                >
                  <div
                    className="sticky left-0 z-10 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    style={{ width: RESOURCE_LABEL_WIDTH_PX }}
                  >
                    <p className="text-xs font-semibold text-[var(--foreground)]">{row.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">{row.facilityName}</p>
                  </div>
                  <div
                    className="relative shrink-0"
                    style={{ width: timelineWidthPx, height: rowHeight }}
                  >
                    {halfHourMarks.map((minutes) => (
                      <div
                        key={minutes}
                        className={cn(
                          "absolute top-0 bottom-0 border-l",
                          minutes % 60 === 0
                            ? "border-[var(--border)]"
                            : "border-[var(--border)]/30 border-dashed",
                        )}
                        style={{
                          left: minutesToResourceLeftPx(minutes, timeRange, RESOURCE_PIXELS_PER_MINUTE),
                        }}
                      />
                    ))}
                    {row.segments.map((segment) => {
                      const activeDraft =
                        manipulation?.previewDraft?.segmentId === segment.segmentId
                          ? manipulation.previewDraft
                          : null;
                      const caps = manipulation?.getCapabilities(segment.item);

                      const renderSegment = (
                        segItem: typeof segment.item,
                        startAt: Date,
                        endAt: Date,
                        variant: "default" | "ghost" | "preview" | "preview-warning",
                        keySuffix: string,
                        interactive: boolean,
                      ) => {
                        const startMin = zonedMinutesFromMidnight(startAt, timezone);
                        const endMin = Math.max(
                          startMin + 15,
                          zonedMinutesFromMidnight(endAt, timezone),
                        );
                        const layout = lanes.get(segment.segmentId) ?? { lane: 0, totalLanes: 1 };
                        const leftPx = minutesToResourceLeftPx(
                          startMin,
                          timeRange,
                          RESOURCE_PIXELS_PER_MINUTE,
                        );
                        const widthPx = durationToResourceWidthPx(
                          startMin,
                          endMin,
                          timeRange,
                          RESOURCE_PIXELS_PER_MINUTE,
                        );
                        const laneHeight = rowHeight / maxLane;
                        const timeLabel = `${isoToLocalTime(startAt, timezone)}–${isoToLocalTime(endAt, timezone)}`;

                        return (
                          <PlanningHubActivityBlock
                            key={`${segment.segmentId}${keySuffix}`}
                            item={segItem}
                            locale={locale}
                            timezone={timezone}
                            resourceId={row.resourceId}
                            compact
                            visualVariant={variant}
                            dragTimeLabel={timeLabel}
                            canDrag={interactive && (caps?.canMoveTime || caps?.canChangePrimaryResource || caps?.canChangeDressingRoom)}
                            onPointerDownMove={
                              interactive && manipulation
                                ? (event) =>
                                    manipulation.beginResourceMove(
                                      segment.item,
                                      segment.segmentId,
                                      row.resourceId,
                                      event.clientX,
                                      event.clientY,
                                    )
                                : undefined
                            }
                            onActivate={() => {
                              if (manipulation?.isDragging) return;
                              onItemActivate(segment.item);
                            }}
                            style={{
                              top: layout.lane * laneHeight + 2,
                              height: laneHeight - 4,
                              left: leftPx + 2,
                              width: Math.max(24, widthPx - 4),
                            }}
                            className="!absolute"
                          />
                        );
                      };

                      if (activeDraft && manipulation?.isDragging) {
                        const proposedResourceId =
                          activeDraft.proposedResourceId ?? activeDraft.originalResourceId;
                        const onOriginalRow = row.resourceId === activeDraft.originalResourceId;
                        const onProposedRow = row.resourceId === proposedResourceId;
                        if (!onOriginalRow && !onProposedRow) return null;

                        const projected = projectedItemForRender(
                          segment.item,
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
                          <Fragment key={segment.segmentId}>
                            {onOriginalRow &&
                              renderSegment(
                                segment.item,
                                activeDraft.originalStart,
                                activeDraft.originalEnd,
                                "ghost",
                                "-ghost",
                                false,
                              )}
                            {onProposedRow &&
                              renderSegment(
                                projected,
                                activeDraft.proposedStart,
                                activeDraft.proposedEnd,
                                previewVariant,
                                "-preview",
                                false,
                              )}
                          </Fragment>
                        );
                      }

                      if (
                        activeDraft &&
                        row.resourceId !== (activeDraft.proposedResourceId ?? activeDraft.originalResourceId) &&
                        row.resourceId !== activeDraft.originalResourceId
                      ) {
                        return null;
                      }

                      const displayItem = activeDraft
                        ? projectedItemForRender(
                            segment.item,
                            activeDraft,
                            urlState.resourceCategory,
                            manipulation!.resolveResourceRef,
                          )
                        : segment.item;
                      const startAt = activeDraft?.proposedStart ?? segment.startAt;
                      const endAt = activeDraft?.proposedEnd ?? segment.endAt;

                      return renderSegment(
                        displayItem,
                        startAt,
                        endAt,
                        "default",
                        "",
                        !!manipulation?.enabled,
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
