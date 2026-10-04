"use client";

import { useId, useMemo, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import {
  buildPlanningResourceGroupsFromFacilityGroups,
  type PlanningResourceGroup,
} from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import {
  formatManipulationReservationWindow,
  manipulationResourceAvailabilityAccessibleName,
  manipulationResourceAvailabilityBoardLines,
  manipulationResourceAvailabilityCellSelectable,
  manipulationResourceAvailabilitySecondaryLine,
  type ManipulationResourceAvailability,
  type ManipulationResourceKind,
} from "@/lib/planning-hub/manipulation-resource-availability";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerItem;
  resourceKind: ManipulationResourceKind;
  availabilityEntries: readonly ManipulationResourceAvailability[];
  facilityGroups: FacilityGroup[];
  planningResourceGroups?: readonly PlanningResourceGroup[];
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  reservationStartAt: Date;
  reservationEndAt: Date;
  timezone: string;
  testId?: string;
};

function formatConflictTimeRange(start: Date, end: Date, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  return `${start.toLocaleTimeString("de-CH", opts)}–${end.toLocaleTimeString("de-CH", opts)}`;
}

function OccupiedConflictDetails({
  entry,
  timezone,
  detailButtonLabel,
}: {
  entry: ManipulationResourceAvailability;
  timezone: string;
  detailButtonLabel: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  const conflicts = entry.conflicts;
  const summary =
    conflicts.length > 1
      ? `${conflicts.length} Konflikte`
      : (manipulationResourceAvailabilitySecondaryLine(entry) ?? "Belegt");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mt-0.5 max-w-full truncate text-left text-[10px] font-medium text-[var(--text-2)] underline decoration-dotted underline-offset-2 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${detailButtonLabel}: ${summary}`}
        data-testid={`planning-hub-manipulation-board-occupied-detail-${entry.resourceId}`}
        onClick={() => setOpen((v) => !v)}
      >
        {conflicts.length > 1 ? `${conflicts.length} Konflikte` : "Details"}
      </button>
      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        role="dialog"
        id={popoverId}
        matchAnchorWidth={false}
        maxHeight={240}
        className="min-w-[12rem] px-3 py-2"
      >
        <ul className="space-y-2 text-xs text-[var(--foreground)]">
          {conflicts.map((c) => (
            <li key={`${c.activityId}-${c.startAt.toISOString()}`}>
              <span className="block font-semibold">{c.activityLabel}</span>
              <span className="text-[var(--text-2)]">
                {formatConflictTimeRange(c.startAt, c.endAt, timezone)}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </>
  );
}

function AvailabilityBoardCell({
  entry,
  item,
  facilityLabel,
  segmentLabel,
  selected,
  onSelect,
  timezone,
}: {
  entry: ManipulationResourceAvailability;
  item: WeekplannerItem;
  facilityLabel: string;
  segmentLabel: string;
  selected: boolean;
  onSelect: (resourceId: string) => void;
  timezone: string;
}) {
  const lines = manipulationResourceAvailabilityBoardLines(entry, item);
  const selectable = manipulationResourceAvailabilityCellSelectable(entry);
  const accessibleName = manipulationResourceAvailabilityAccessibleName(
    entry,
    item,
    facilityLabel,
    segmentLabel,
  );
  const detailLabel = `${facilityLabel} ${segmentLabel}`;

  const stateClasses = cn(
    "flex min-h-[3.25rem] flex-col justify-center rounded-md border px-1.5 py-1 text-center text-[11px] leading-tight transition",
    entry.isCurrent &&
      "border-[var(--sce-primary)] bg-[var(--sce-primary-light)]/35 font-semibold text-[var(--foreground)]",
    !entry.isCurrent &&
      entry.isRecommended &&
      entry.state === "AVAILABLE" &&
      "border-[var(--sce-primary)]/50 bg-[var(--sce-primary-light)]/20",
    !entry.isCurrent &&
      !entry.isRecommended &&
      entry.state === "AVAILABLE" &&
      "border-emerald-600/35 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100",
    entry.state === "PARTIAL" &&
      !entry.isCurrent &&
      "border-amber-600/35 bg-amber-50/70 text-amber-950 dark:bg-amber-950/20",
    entry.state === "OCCUPIED" &&
      !entry.isCurrent &&
      "border-[var(--border)] bg-[var(--surface-2)]/80 text-[var(--text-2)]",
    selected &&
      selectable &&
      "ring-2 ring-[var(--sce-primary)] ring-offset-1 ring-offset-[var(--surface)]",
  );

  const content = (
    <>
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
      {(entry.state === "OCCUPIED" || entry.state === "PARTIAL") && entry.conflicts.length > 0 ? (
        <OccupiedConflictDetails entry={entry} timezone={timezone} detailButtonLabel={detailLabel} />
      ) : null}
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        className={cn(stateClasses, "cursor-pointer hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]")}
        aria-label={accessibleName}
        aria-pressed={selected}
        data-testid={`planning-hub-manipulation-board-cell-${entry.resourceId}`}
        onClick={() => onSelect(entry.resourceId)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={stateClasses}
      data-testid={`planning-hub-manipulation-board-cell-${entry.resourceId}`}
      aria-label={accessibleName}
    >
      {content}
    </div>
  );
}

function PitchAvailabilityGrid({
  groups,
  entryById,
  item,
  selectedResourceId,
  onSelectResourceId,
  timezone,
}: {
  groups: readonly PlanningResourceGroup[];
  entryById: Map<string, ManipulationResourceAvailability>;
  item: WeekplannerItem;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  timezone: string;
}) {
  const visibleGroups = groups.filter((g) =>
    g.segments.some((s) => entryById.has(s.resourceId)),
  );
  if (visibleGroups.length === 0) return null;

  const maxSegments = Math.max(...visibleGroups.map((g) => g.segments.length), 1);
  const headerSegments = visibleGroups.find((g) => g.segments.length === maxSegments)?.segments ?? [];

  return (
    <div className="overflow-x-auto" data-testid="planning-hub-manipulation-pitch-board-grid">
      <div
        className="min-w-[18rem]"
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(5.5rem, 1.15fr) repeat(${maxSegments}, minmax(3.25rem, 1fr))`,
          gap: "0.35rem 0.35rem",
        }}
      >
        <div aria-hidden className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]" />
        {headerSegments.map((seg) => (
          <div
            key={`hdr-${seg.resourceId}`}
            className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
            data-testid={`planning-hub-manipulation-board-segment-header-${seg.segmentLabel}`}
          >
            {seg.segmentLabel}
          </div>
        ))}

        {visibleGroups.map((group) => (
          <PitchFacilityRow
            key={group.groupKey}
            group={group}
            maxSegments={maxSegments}
            entryById={entryById}
            item={item}
            selectedResourceId={selectedResourceId}
            onSelectResourceId={onSelectResourceId}
            timezone={timezone}
          />
        ))}
      </div>
    </div>
  );
}

function PitchFacilityRow({
  group,
  maxSegments,
  entryById,
  item,
  selectedResourceId,
  onSelectResourceId,
  timezone,
}: {
  group: PlanningResourceGroup;
  maxSegments: number;
  entryById: Map<string, ManipulationResourceAvailability>;
  item: WeekplannerItem;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  timezone: string;
}) {
  return (
    <>
      <div
        className="flex items-center pr-1 text-xs font-semibold text-[var(--foreground)]"
        data-testid={`planning-hub-manipulation-board-facility-${group.groupKey}`}
      >
        {group.label}
      </div>
      {group.segments.map((seg) => {
        const entry = entryById.get(seg.resourceId);
        if (!entry) {
          return <div key={seg.resourceId} aria-hidden />;
        }
        return (
          <AvailabilityBoardCell
            key={seg.resourceId}
            entry={entry}
            item={item}
            facilityLabel={group.label}
            segmentLabel={seg.segmentLabel}
            selected={selectedResourceId === entry.resourceId}
            onSelect={onSelectResourceId}
            timezone={timezone}
          />
        );
      })}
      {group.segments.length < maxSegments
        ? Array.from({ length: maxSegments - group.segments.length }).map((_, i) => (
            <div key={`pad-${group.groupKey}-${i}`} aria-hidden />
          ))
        : null}
    </>
  );
}

function DressingAvailabilityList({
  groups,
  entryById,
  item,
  selectedResourceId,
  onSelectResourceId,
  timezone,
}: {
  groups: readonly PlanningResourceGroup[];
  entryById: Map<string, ManipulationResourceAvailability>;
  item: WeekplannerItem;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  timezone: string;
}) {
  const rows = groups.flatMap((g) =>
    g.segments
      .map((s) => entryById.get(s.resourceId))
      .filter((e): e is ManipulationResourceAvailability => e != null),
  );
  if (rows.length === 0) return null;

  return (
    <ul
      className="space-y-1.5"
      data-testid="planning-hub-manipulation-dressing-board-list"
    >
      {rows.map((entry) => {
        const selectable = manipulationResourceAvailabilityCellSelectable(entry);
        const lines = manipulationResourceAvailabilityBoardLines(entry, item);
        const label = entry.resourceRef.name;
        const accessibleName = manipulationResourceAvailabilityAccessibleName(
          entry,
          item,
          label,
          label,
        );
        const selected = selectedResourceId === entry.resourceId;

        const rowBody = (
          <>
            <span className="min-w-[2.5rem] font-semibold text-[var(--foreground)]">{label}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-2)]">
              {lines.map((line, index) => (
                <span key={line}>
                  {index > 0 ? " · " : null}
                  {line}
                </span>
              ))}
              {(entry.state === "OCCUPIED" || entry.state === "PARTIAL") &&
              entry.conflicts.length > 0 ? (
                <OccupiedConflictDetails
                  entry={entry}
                  timezone={timezone}
                  detailButtonLabel={label}
                />
              ) : null}
            </span>
          </>
        );

        if (selectable) {
          return (
            <li key={entry.resourceId}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-wrap items-baseline justify-between gap-2 rounded-md border border-emerald-600/30 bg-emerald-50/60 px-2 py-1.5 text-left transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)] dark:bg-emerald-950/15",
                  entry.isRecommended && "border-[var(--sce-primary)]/45 bg-[var(--sce-primary-light)]/25",
                  entry.isCurrent && "border-[var(--sce-primary)] bg-[var(--sce-primary-light)]/35",
                  selected && "ring-2 ring-[var(--sce-primary)] ring-offset-1",
                )}
                aria-label={accessibleName}
                aria-pressed={selected}
                data-testid={`planning-hub-manipulation-board-cell-${entry.resourceId}`}
                onClick={() => onSelectResourceId(entry.resourceId)}
              >
                {rowBody}
              </button>
            </li>
          );
        }

        return (
          <li
            key={entry.resourceId}
            className={cn(
              "flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 px-2 py-1.5",
              entry.isCurrent && "border-[var(--sce-primary)] bg-[var(--sce-primary-light)]/35",
            )}
            data-testid={`planning-hub-manipulation-board-cell-${entry.resourceId}`}
            aria-label={accessibleName}
          >
            {rowBody}
          </li>
        );
      })}
    </ul>
  );
}

export default function PlanningHubManipulationResourceAvailabilityBoard({
  item,
  resourceKind,
  availabilityEntries,
  facilityGroups,
  planningResourceGroups,
  selectedResourceId,
  onSelectResourceId,
  reservationStartAt,
  reservationEndAt,
  timezone,
  testId = "planning-hub-manipulation-resource-board",
}: Props) {
  const entryById = useMemo(
    () => new Map(availabilityEntries.map((e) => [e.resourceId, e])),
    [availabilityEntries],
  );

  const groups = useMemo(() => {
    if (planningResourceGroups?.length) return planningResourceGroups;
    const category = resourceKind === "PITCH_HALL" ? "pitch" : "dressing";
    return buildPlanningResourceGroupsFromFacilityGroups(facilityGroups, category);
  }, [planningResourceGroups, facilityGroups, resourceKind]);

  const headerTitle =
    resourceKind === "PITCH_HALL" ? "Spielfeld-Verfügbarkeit" : "Garderoben-Verfügbarkeit";
  const reservationLabel = formatManipulationReservationWindow(
    reservationStartAt,
    reservationEndAt,
    timezone,
  );

  return (
    <section className="mt-3" data-testid={testId} aria-labelledby={`${testId}-heading`}>
      <h3
        id={`${testId}-heading`}
        className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground)]"
      >
        {headerTitle}
      </h3>
      <p
        className="mt-0.5 text-[11px] text-[var(--text-2)]"
        data-testid={`${testId}-reservation-window`}
      >
        Für Reservierung {reservationLabel}
      </p>

      <div className="mt-2">
        {resourceKind === "PITCH_HALL" ? (
          <PitchAvailabilityGrid
            groups={groups}
            entryById={entryById}
            item={item}
            selectedResourceId={selectedResourceId}
            onSelectResourceId={onSelectResourceId}
            timezone={timezone}
          />
        ) : (
          <DressingAvailabilityList
            groups={groups}
            entryById={entryById}
            item={item}
            selectedResourceId={selectedResourceId}
            onSelectResourceId={onSelectResourceId}
            timezone={timezone}
          />
        )}
      </div>
    </section>
  );
}
