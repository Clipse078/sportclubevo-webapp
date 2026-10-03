"use client";

import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { assignIntervalLanes } from "@/lib/planning-hub/scheduler/interval-lanes";
import type { ResourceOccupancySegment, ResourceRow } from "@/lib/planning-hub/scheduler/resource-segments";
import {
  durationToResourceWidthPx,
  minutesToResourceLeftPx,
  RESOURCE_PIXELS_PER_MINUTE,
} from "@/lib/planning-hub/scheduler/time-scale";
import { zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";
import PlanningHubActivityBlock from "./PlanningHubActivityBlock";
import { projectedItemForRender, usePlanningHubManipulation } from "./PlanningHubManipulationContext";
import { isoToLocalTime } from "@/lib/planning-hub/planner-time";
import { resourceSegmentDisplayWindow } from "@/lib/planning-hub/scheduler/resource-segment-display";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { ResourceTimelineLane } from "@/lib/planning-hub/resource-timeline/adaptive-lanes";

const ROW_BASE_HEIGHT_PX = 38;

export type PlanningHubResourceLaneRowProps = {
  lane: ResourceTimelineLane;
  row: ResourceRow;
  labelPrimary: string;
  labelSecondary: string | null;
  labelTier: "primary" | "secondary";
  timelineWidthPx: number;
  halfHourMarks: number[];
  timeRange: { startMinutes: number; endMinutes: number; totalMinutes: number };
  locale: string;
  timezone: string;
  isDressingCategory: boolean;
  urlState: PlanningHubUrlState;
  manipulation: ReturnType<typeof usePlanningHubManipulation>;
  onItemActivate: (item: WeekplannerItem) => void;
  dressingRefOnItem: (item: WeekplannerItem, resourceId: string) => WeekplannerResourceRef | undefined;
  segmentHints?: Map<string, string | null>;
  labelWidthPx: number;
  rowTestId?: string;
  hideLabelColumn?: boolean;
  /** Subordinate Gesamt/A/B lane inside an expanded physical-pitch group (R3 hierarchy). */
  pitchSegmentLane?: boolean;
};

export default function PlanningHubResourceLaneRow({
  lane,
  row,
  labelPrimary,
  labelSecondary,
  labelTier,
  timelineWidthPx,
  halfHourMarks,
  timeRange,
  locale,
  timezone,
  isDressingCategory,
  urlState,
  manipulation,
  onItemActivate,
  dressingRefOnItem,
  segmentHints,
  labelWidthPx,
  rowTestId = "planning-hub-resource-row",
  hideLabelColumn = false,
  pitchSegmentLane = false,
}: PlanningHubResourceLaneRowProps) {
  const intervals = row.segments.map((s) => ({
    id: s.segmentId,
    startMs: s.startAt.getTime(),
    endMs: s.endAt.getTime(),
  }));
  const laneLayout = assignIntervalLanes(intervals);
  const maxLane =
    row.segments.reduce(
      (max, s) => Math.max(max, (laneLayout.get(s.segmentId)?.lane ?? 0) + 1),
      1,
    ) ?? 1;
  const rowHeight = ROW_BASE_HEIGHT_PX * maxLane;

  return (
    <div
      className={cn(
        "flex border-b border-[var(--border)]/60",
        pitchSegmentLane && "bg-[var(--surface-2)]/20",
        manipulation?.hoverResourceId === row.resourceId &&
          manipulation.isDragging &&
          "bg-[var(--sce-primary-light)]/25",
      )}
      data-testid={rowTestId}
      data-planning-resource-id={row.resourceId}
    >
      {hideLabelColumn ? null : (
        <div
          className={cn(
            "sticky left-0 z-10 shrink-0 border-r border-[var(--border)] py-2",
            pitchSegmentLane
              ? "border-l-2 border-l-[var(--border)] bg-[var(--surface-2)]/25 pl-8 pr-3"
              : cn(
                  "bg-[var(--sce-surface-dense)]",
                  labelTier === "secondary" ? "pl-6 pr-3" : "px-3",
                ),
          )}
          style={{ width: labelWidthPx }}
          data-planning-resource-tier={labelTier}
          data-planning-pitch-segment-lane={pitchSegmentLane ? "true" : undefined}
        >
          <p
            className={cn(
              pitchSegmentLane
                ? "text-[10px] font-normal tracking-wide text-[var(--muted)]"
                : "text-[var(--foreground)]",
              !pitchSegmentLane &&
                (labelTier === "secondary" ? "text-[11px] font-medium" : "text-xs font-semibold"),
            )}
          >
            {labelPrimary}
          </p>
          {labelSecondary ? (
            <p className="text-[10px] text-[var(--muted)]">{labelSecondary}</p>
          ) : null}
        </div>
      )}
      <div
        className="relative shrink-0 bg-[var(--sce-surface-dense)]"
        style={{ width: timelineWidthPx, height: rowHeight }}
      >
        {halfHourMarks.map((minutes) => (
          <div
            key={minutes}
            className={cn(
              "absolute top-0 bottom-0 border-l",
              minutes % 60 === 0 ? "border-[var(--border)]" : "border-[var(--border)]/30 border-dashed",
            )}
            style={{
              left: minutesToResourceLeftPx(minutes, timeRange, RESOURCE_PIXELS_PER_MINUTE),
            }}
          />
        ))}
        {row.segments.map((segment) => {
          const resourceId = segment.resource.facilityResourceId;
          const activeDraft =
            manipulation?.previewDraft?.segmentId === segment.segmentId
              ? manipulation.previewDraft
              : null;
          const caps = manipulation?.getCapabilities(segment.item);
          const segmentHint = segmentHints?.get(segment.segmentId) ?? null;

          const renderSegment = (
            segItem: typeof segment.item,
            activityStart: Date,
            activityEnd: Date,
            variant: "default" | "ghost" | "preview" | "preview-warning",
            keySuffix: string,
            interactive: boolean,
            occupancyOverride?: { startAt: Date; endAt: Date },
          ) => {
            const resourceRef = dressingRefOnItem(segItem, resourceId) ?? segment.resource;
            const displayWindow = occupancyOverride
              ? occupancyOverride
              : resourceSegmentDisplayWindow(activityStart, activityEnd, resourceRef);
            const startAt = displayWindow.startAt;
            const endAt = displayWindow.endAt;

            const segmentSpanMs = endAt.getTime() - startAt.getTime();
            let nominalBand: { leftPercent: number; widthPercent: number } | undefined;
            if (segmentSpanMs > 0 && (isDressingCategory || urlState.resourceCategory === "pitch")) {
              const nominalStart = activityStart.getTime();
              const nominalEnd = activityEnd.getTime();
              const leftMs = Math.max(0, nominalStart - startAt.getTime());
              const widthMs = Math.max(
                0,
                Math.min(nominalEnd, endAt.getTime()) - Math.max(nominalStart, startAt.getTime()),
              );
              nominalBand = {
                leftPercent: (leftMs / segmentSpanMs) * 100,
                widthPercent: (widthMs / segmentSpanMs) * 100,
              };
            }

            const startMin = zonedMinutesFromMidnight(startAt, timezone);
            const endMin = Math.max(startMin + 15, zonedMinutesFromMidnight(endAt, timezone));
            const layout = laneLayout.get(segment.segmentId) ?? { lane: 0, totalLanes: 1 };
            const leftPx = minutesToResourceLeftPx(startMin, timeRange, RESOURCE_PIXELS_PER_MINUTE);
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
                resourceId={resourceId}
                compact
                visualVariant={variant}
                dragTimeLabel={timeLabel}
                laneSegmentHint={segmentHint ?? undefined}
                canDrag={
                  interactive &&
                  (caps?.canMoveTime ||
                    caps?.canMoveResourceOccupancy ||
                    caps?.canChangePrimaryResource ||
                    caps?.canChangeDressingRoom)
                }
                canResize={
                  interactive &&
                  (!!caps?.canResize ||
                    caps?.canChangeResourceOccupancyStart ||
                    caps?.canChangeResourceOccupancyEnd)
                }
                resizeOrientation="horizontal"
                onPointerDownMove={
                  interactive && manipulation
                    ? (clientX, clientY) =>
                        manipulation.beginResourceMove(
                          segment.item,
                          segment.segmentId,
                          resourceId,
                          clientX,
                          clientY,
                        )
                    : undefined
                }
                onPointerDownResize={
                  interactive && manipulation
                    ? (edge, clientX, clientY) =>
                        manipulation.beginResourceResize(
                          segment.item,
                          segment.segmentId,
                          resourceId,
                          edge,
                          clientX,
                          clientY,
                        )
                    : undefined
                }
                onOpenManipulationEdit={
                  interactive &&
                  manipulation &&
                  (caps?.canMoveResourceOccupancy ||
                    caps?.canChangePrimaryResource ||
                    caps?.canChangeDressingRoom)
                    ? () =>
                        manipulation.openManipulationEditor(
                          segment.item,
                          segment.segmentId,
                          resourceId,
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
                nominalActivityBand={nominalBand}
              />
            );
          };

          if (activeDraft && manipulation?.isDragging) {
            const proposedResourceId =
              activeDraft.proposedResourceId ?? activeDraft.originalResourceId;
            const onOriginalRow = resourceId === activeDraft.originalResourceId;
            const onProposedRow = resourceId === proposedResourceId;
            if (!onOriginalRow && !onProposedRow) return null;

            const projected = projectedItemForRender(
              segment.item,
              activeDraft,
              urlState.resourceCategory,
              manipulation.resolveResourceRef,
            );
            const previewVariant =
              manipulation.dragConflictPreview?.status === "warning" ? "preview-warning" : "preview";

            return (
              <Fragment key={segment.segmentId}>
                {onOriginalRow &&
                  renderSegment(
                    segment.item,
                    segment.item.startAt,
                    segment.item.endAt,
                    "ghost",
                    "-ghost",
                    false,
                    activeDraft.timeTarget === "resourceOccupancy"
                      ? { startAt: activeDraft.originalStart, endAt: activeDraft.originalEnd }
                      : undefined,
                  )}
                {onProposedRow &&
                  renderSegment(
                    projected,
                    projected.startAt,
                    projected.endAt,
                    previewVariant,
                    "-preview",
                    false,
                    activeDraft.timeTarget === "resourceOccupancy"
                      ? { startAt: activeDraft.proposedStart, endAt: activeDraft.proposedEnd }
                      : undefined,
                  )}
              </Fragment>
            );
          }

          if (
            activeDraft &&
            resourceId !== (activeDraft.proposedResourceId ?? activeDraft.originalResourceId) &&
            resourceId !== activeDraft.originalResourceId
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
          return renderSegment(
            displayItem,
            displayItem.startAt,
            displayItem.endAt,
            "default",
            "",
            !!manipulation?.enabled,
            activeDraft?.timeTarget === "resourceOccupancy"
              ? { startAt: activeDraft.proposedStart, endAt: activeDraft.proposedEnd }
              : undefined,
          );
        })}
      </div>
    </div>
  );
}

export function buildRowFromLane(lane: ResourceTimelineLane): ResourceRow {
  return {
    resourceId: lane.resourceId,
    name: lane.name,
    facilityName: lane.facilityName,
    segments: lane.segments,
  };
}

export function mergedRowFromSegments(
  groupKey: string,
  segments: readonly ResourceOccupancySegment[],
): ResourceRow {
  return {
    resourceId: `__collapsed__${groupKey}`,
    name: "",
    facilityName: "",
    segments: [...segments],
  };
}
