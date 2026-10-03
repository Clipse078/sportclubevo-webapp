"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import {
  buildPlanningHubHref,
  resolvePlanningHubResourceDay,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import {
  buildResourceSegmentsForDay,
  groupSegmentsByResource,
  type ResourceOccupancySegment,
} from "@/lib/planning-hub/scheduler/resource-segments";
import {
  buildAdaptiveResourceTimeline,
  pickFacilityGroupsForCategory,
  RESOURCE_TIMELINE_LABEL_MIN_WIDTH_PX,
  RESOURCE_TIMELINE_MIN_TIMELINE_WIDTH_PX,
  type ResourceTimelineLane,
} from "@/lib/planning-hub/resource-timeline/adaptive-lanes";
import {
  collectCollapsedPitchGroupSegments,
  countVisibleResourceTimelineRows,
  pitchGroupDisclosureKey,
  resolveAutoExpandedPitchGroupKeys,
  shouldUsePitchGroupCollapse,
  summarizePitchGroupOverview,
} from "@/lib/planning-hub/resource-timeline/pitch-group-disclosure";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  minutesToResourceLeftPx,
  RESOURCE_PIXELS_PER_MINUTE,
} from "@/lib/planning-hub/scheduler/time-scale";
import { useWeekplannerVisibleTimeRange } from "./WeekplannerVisibleTimeRangeContext";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { usePlanningHubManipulation } from "./PlanningHubManipulationContext";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";
import PlanningHubResourceLaneRow, {
  buildRowFromLane,
  mergedRowFromSegments,
} from "./PlanningHubResourceLaneRow";

type PlanningHubResourceDayViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  todayDayKey: string;
  onItemActivate: (item: WeekplannerItem) => void;
  resourceCatalogGroups?: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

const RESOURCE_LABEL_WIDTH_PX = RESOURCE_TIMELINE_LABEL_MIN_WIDTH_PX;

function dressingRefOnItem(
  item: WeekplannerItem,
  resourceId: string,
): WeekplannerResourceRef | undefined {
  const refs = [...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }
  return refs.find((r) => r.facilityResourceId === resourceId);
}

function segmentLabelForExpandedLane(lane: ResourceTimelineLane): {
  primary: string;
  secondary: string | null;
  tier: "primary" | "secondary";
} {
  if (lane.presentationRole === "segment") {
    return {
      primary: lane.presentationPrimaryLabel,
      secondary: lane.presentationSecondaryLabel,
      tier: "secondary",
    };
  }
  if (lane.presentationRole === "whole") {
    return { primary: "Gesamt", secondary: null, tier: "secondary" };
  }
  return {
    primary: lane.presentationPrimaryLabel,
    secondary: lane.presentationSecondaryLabel,
    tier: lane.presentationTier,
  };
}

export default function PlanningHubResourceDayView({
  week,
  urlState,
  locale,
  timezone,
  todayDayKey,
  onItemActivate,
  resourceCatalogGroups,
}: PlanningHubResourceDayViewProps) {
  const manipulation = usePlanningHubManipulation();
  const { visibleRange: userVisibleRange } = useWeekplannerVisibleTimeRange();
  const isDressingCategory = urlState.resourceCategory === "dressing";
  const filtered = applyPlanningHubFilters(week, urlState);
  const weekDayKeys = filtered.days.map((d) => d.dayKey);
  const selectedDay = resolvePlanningHubResourceDay(weekDayKeys, urlState.day, todayDayKey);
  const day = filtered.days.find((d) => d.dayKey === selectedDay) ?? filtered.days[0];

  const segments = useMemo(
    () => (day ? buildResourceSegmentsForDay(day.items, urlState.resourceCategory) : []),
    [day, urlState.resourceCategory],
  );

  const segmentRows = useMemo(() => groupSegmentsByResource(segments), [segments]);

  const timelineGroups = useMemo(() => {
    const catalog = resourceCatalogGroups
      ? pickFacilityGroupsForCategory(resourceCatalogGroups, urlState.resourceCategory)
      : [];
    if (catalog.length === 0) {
      return segmentRows.map((row) => ({
        facilityId: row.resourceId,
        facilityName: row.facilityName,
        lanes: [
          {
            resourceId: row.resourceId,
            name: row.name,
            facilityId: row.resourceId,
            facilityName: row.facilityName,
            segments: row.segments,
            presentationGroupKey: row.resourceId,
            presentationPrimaryLabel: row.name,
            presentationSecondaryLabel: row.facilityName,
            presentationTier: "primary" as const,
            presentationRole: "standalone" as const,
          },
        ],
      }));
    }
    return buildAdaptiveResourceTimeline({
      catalogGroups: catalog,
      segmentRows,
      facilityFilterId: urlState.facility,
      resourceFilterIds: urlState.resourceFilterIds,
      resourceCategory: urlState.resourceCategory,
    });
  }, [
    resourceCatalogGroups,
    segmentRows,
    urlState.resourceCategory,
    urlState.facility,
    urlState.resourceFilterIds,
  ]);

  const autoExpandedKeys = useMemo(
    () =>
      resolveAutoExpandedPitchGroupKeys(
        timelineGroups,
        urlState.resourceFilterIds,
        urlState.resourceCategory,
      ),
    [timelineGroups, urlState.resourceFilterIds, urlState.resourceCategory],
  );

  const [manualExpandedKeys, setManualExpandedKeys] = useState<Set<string>>(() => new Set());
  const [manualCollapsedKeys, setManualCollapsedKeys] = useState<Set<string>>(() => new Set());

  const isPitchGroupExpanded = useCallback(
    (groupKey: string) => {
      if (autoExpandedKeys.has(groupKey)) return true;
      if (manualCollapsedKeys.has(groupKey)) return false;
      return manualExpandedKeys.has(groupKey);
    },
    [autoExpandedKeys, manualCollapsedKeys, manualExpandedKeys],
  );

  const togglePitchGroup = useCallback((groupKey: string) => {
    setManualExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
    setManualCollapsedKeys((prev) => {
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  }, []);

  const collapsePitchGroup = useCallback((groupKey: string) => {
    setManualCollapsedKeys((prev) => new Set(prev).add(groupKey));
    setManualExpandedKeys((prev) => {
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  }, []);

  useEffect(() => {
    setManualExpandedKeys(new Set());
    setManualCollapsedKeys(new Set());
  }, [urlState.resourceCategory]);

  useEffect(() => {
    setManualExpandedKeys(new Set());
    setManualCollapsedKeys(new Set());
  }, [selectedDay]);

  useEffect(() => {
    setManualCollapsedKeys((prev) => {
      if (prev.size === 0 || autoExpandedKeys.size === 0) return prev;
      const next = new Set(prev);
      for (const key of autoExpandedKeys) {
        next.delete(key);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [autoExpandedKeys]);

  const expandedKeysForCount = useMemo(() => {
    const keys = new Set<string>();
    for (const group of timelineGroups) {
      if (shouldUsePitchGroupCollapse(urlState.resourceCategory, group)) {
        const key = pitchGroupDisclosureKey(group);
        if (isPitchGroupExpanded(key)) keys.add(key);
      }
    }
    return keys;
  }, [timelineGroups, urlState.resourceCategory, isPitchGroupExpanded]);

  function groupWantsSiteHeader(group: (typeof timelineGroups)[number]): boolean {
    if (shouldUsePitchGroupCollapse(urlState.resourceCategory, group)) return false;
    if (group.lanes.length <= 1) return false;
    if (group.lanes.some((l) => l.presentationRole === "segment" || l.presentationRole === "whole")) {
      return false;
    }
    return true;
  }

  const perspectiveTestId =
    urlState.perspective === "garderobe"
      ? "planning-hub-garderobe-day"
      : "planning-hub-spielfeld-day";

  const timeRange = userVisibleRange;
  const timelineWidthPx = timeRange.totalMinutes * RESOURCE_PIXELS_PER_MINUTE;
  const halfHourMarks: number[] = [];
  for (let m = timeRange.startMinutes; m <= timeRange.endMinutes; m += 30) {
    halfHourMarks.push(m);
  }

  const laneCount = countVisibleResourceTimelineRows(
    timelineGroups,
    urlState.resourceCategory,
    expandedKeysForCount,
  );

  const sharedLaneProps = {
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
    labelWidthPx: RESOURCE_LABEL_WIDTH_PX,
  };

  function renderCollapsedPitchGroup(group: (typeof timelineGroups)[number]) {
    const groupKey = pitchGroupDisclosureKey(group);
    const summary = summarizePitchGroupOverview(group.lanes);
    const collapsedSegments = collectCollapsedPitchGroupSegments(group.lanes);
    const segmentList: ResourceOccupancySegment[] = collapsedSegments.map((c) => c.segment);
    const hintMap = new Map(
      collapsedSegments.map((c) => [c.segment.segmentId, c.segmentHint] as const),
    );
    const syntheticLane: ResourceTimelineLane = {
      resourceId: `__collapsed__${groupKey}`,
      name: group.facilityName,
      facilityId: group.facilityId,
      facilityName: group.facilityName,
      segments: segmentList,
      presentationGroupKey: groupKey,
      presentationPrimaryLabel: group.facilityName,
      presentationSecondaryLabel: null,
      presentationTier: "primary",
      presentationRole: "whole",
    };

    const panelId = `pitch-group-segments-${groupKey}`;

    return (
      <div
        key={groupKey}
        data-testid="planning-hub-pitch-group"
        data-pitch-group-key={groupKey}
        data-pitch-group-expanded="false"
      >
        <div className="flex border-b border-[var(--border)]/60 bg-[var(--sce-surface-dense)]">
          <div
            className="sticky left-0 z-10 flex shrink-0 items-start gap-1 border-r border-[var(--border)] px-2 py-2"
            style={{ width: RESOURCE_LABEL_WIDTH_PX }}
          >
            <button
              type="button"
              className="mt-0.5 rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)]"
              aria-expanded={false}
              aria-controls={panelId}
              aria-label={`${group.facilityName} aufklappen`}
              data-testid="planning-hub-pitch-group-toggle"
              onClick={() => togglePitchGroup(groupKey)}
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--foreground)]">{group.facilityName}</p>
              <p
                className={cn(
                  "text-[10px] tabular-nums",
                  summary.kind === "conflict"
                    ? "font-semibold text-amber-700 dark:text-amber-400"
                    : "text-[var(--muted)]",
                )}
                data-testid="planning-hub-pitch-group-summary"
              >
                {summary.label}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1" id={panelId}>
            <PlanningHubResourceLaneRow
              {...sharedLaneProps}
              lane={syntheticLane}
              row={mergedRowFromSegments(groupKey, segmentList)}
              labelPrimary=""
              labelSecondary={null}
              labelTier="primary"
              segmentHints={hintMap}
              rowTestId="planning-hub-pitch-group-collapsed-row"
              hideLabelColumn
            />
          </div>
        </div>
      </div>
    );
  }

  function renderExpandedPitchGroup(group: (typeof timelineGroups)[number]) {
    const groupKey = pitchGroupDisclosureKey(group);
    const summary = summarizePitchGroupOverview(group.lanes);
    const panelId = `pitch-group-segments-${groupKey}`;

    const headerId = `pitch-group-header-${groupKey}`;

    return (
      <div
        key={groupKey}
        role="group"
        aria-labelledby={headerId}
        data-testid="planning-hub-pitch-group"
        data-pitch-group-key={groupKey}
        data-pitch-group-expanded="true"
      >
        <div className="flex border-b border-[var(--border)]/80 bg-[var(--surface-2)]/40">
          <div
            id={headerId}
            className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-[var(--border)] px-2 py-1.5"
            style={{ width: RESOURCE_LABEL_WIDTH_PX }}
          >
            <button
              type="button"
              className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)]"
              aria-expanded={true}
              aria-controls={panelId}
              aria-label={`${group.facilityName} zuklappen`}
              data-testid="planning-hub-pitch-group-toggle"
              onClick={() => collapsePitchGroup(groupKey)}
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-90" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-tight text-[var(--foreground)]">
                {group.facilityName}
              </p>
              {summary.kind !== "free" ? (
                <p className="text-[10px] font-medium text-[var(--muted)]">{summary.label}</p>
              ) : null}
            </div>
          </div>
          <div className="flex-1" aria-hidden />
        </div>
        <div id={panelId}>
          {group.lanes.map((lane) => {
            const labels = segmentLabelForExpandedLane(lane);
            const isSegmentLane =
              lane.presentationRole === "segment" || lane.presentationRole === "whole";
            return (
              <PlanningHubResourceLaneRow
                key={lane.resourceId}
                {...sharedLaneProps}
                lane={lane}
                row={buildRowFromLane(lane)}
                labelPrimary={labels.primary}
                labelSecondary={labels.secondary}
                labelTier={labels.tier}
                pitchSegmentLane={isSegmentLane}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={perspectiveTestId}
      data-planning-hub-resource-day
      className="flex min-h-0 flex-col"
      style={{ minHeight: "min(72vh, calc(100dvh - 14rem))" }}
    >
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
              href={buildPlanningHubHref(urlState, { day: d.dayKey })}
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

      {laneCount === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
          Keine passenden Ressourcen für diese Filter.
        </p>
      ) : (
        <div
          className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)] [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]"
          data-planning-hub-resource-scroll
          data-sce-planner-scroll-root
        >
          <div style={{ minWidth: RESOURCE_TIMELINE_MIN_TIMELINE_WIDTH_PX }}>
            <div
              className="sticky top-0 z-10 flex border-b border-[var(--border)] bg-[var(--sce-surface-dense)]"
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

            {timelineGroups.map((group) => (
              <Fragment key={group.facilityId}>
                {groupWantsSiteHeader(group) ? (
                  <div
                    className="border-b border-[var(--border)]/80 bg-[var(--surface-2)]/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
                    data-testid="planning-hub-resource-facility-group"
                    data-facility-id={group.facilityId}
                  >
                    {group.facilityName}
                  </div>
                ) : null}
                {shouldUsePitchGroupCollapse(urlState.resourceCategory, group) ? (
                  isPitchGroupExpanded(pitchGroupDisclosureKey(group)) ? (
                    renderExpandedPitchGroup(group)
                  ) : (
                    renderCollapsedPitchGroup(group)
                  )
                ) : (
                  group.lanes.map((lane) => (
                    <PlanningHubResourceLaneRow
                      key={lane.resourceId}
                      {...sharedLaneProps}
                      lane={lane}
                      row={buildRowFromLane(lane)}
                      labelPrimary={lane.presentationPrimaryLabel}
                      labelSecondary={lane.presentationSecondaryLabel}
                      labelTier={lane.presentationTier}
                    />
                  ))
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
