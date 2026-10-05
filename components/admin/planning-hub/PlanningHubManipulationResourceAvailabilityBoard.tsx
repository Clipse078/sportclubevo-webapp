"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import {
  buildPlanningResourceGroupsFromFacilityGroups,
  formatManipulationResourceLabel,
  type PlanningResourceGroup,
} from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import {
  formatManipulationReservationWindow,
  manipulationResourceAvailabilityAccessibleName,
  manipulationResourceAvailabilityBoardLines,
  manipulationResourceAvailabilityCellSelectable,
  manipulationResourceAvailabilitySecondaryLine,
  manipulationResourceAvailabilityStatusText,
  type ManipulationResourceAvailability,
  type ManipulationResourceKind,
} from "@/lib/planning-hub/manipulation-resource-availability";
import {
  buildManipulationAvailabilitySiteGroups,
  deriveManipulationResourceAvailabilityPresentationMode,
  filterManipulationAvailabilityGroups,
  formatManipulationAlternativeLabel,
  formatManipulationSiteGroupSummaryLine,
  manipulationAvailabilityInventoryHeading,
  manipulationAvailabilityPresentationUsesAdaptiveControls,
  manipulationAvailabilitySiteGroupsDefaultCollapsed,
  pickBestManipulationAlternatives,
  summarizeManipulationPhysicalGroups,
  type ManipulationResourceAvailabilityPresentationMode,
} from "@/lib/planning-hub/manipulation-resource-availability-presentation";
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

function ConflictDetailPopover({
  entry,
  timezone,
  open,
  onOpenChange,
  popoverId,
  anchorRef,
}: {
  entry: ManipulationResourceAvailability;
  timezone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  popoverId: string;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  return (
    <PopoverContent
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      role="dialog"
      id={popoverId}
      matchAnchorWidth={false}
      maxHeight={240}
      className="min-w-[12rem] px-3 py-2"
    >
      <ul className="space-y-2 text-xs text-[var(--foreground)]">
        {entry.conflicts.map((c) => (
          <li key={`${c.activityId}-${c.startAt.toISOString()}`}>
            <span className="block font-semibold">{c.activityLabel}</span>
            <span className="text-[var(--text-2)]">
              {formatConflictTimeRange(c.startAt, c.endAt, timezone)}
            </span>
          </li>
        ))}
      </ul>
    </PopoverContent>
  );
}

function OccupiedAvailabilityCell({
  entry,
  item,
  facilityLabel,
  segmentLabel,
  timezone,
  stateClasses,
  lines,
  accessibleName,
}: {
  entry: ManipulationResourceAvailability;
  item: WeekplannerItem;
  facilityLabel: string;
  segmentLabel: string;
  timezone: string;
  stateClasses: string;
  lines: string[];
  accessibleName: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const conflicts = entry.conflicts;
  const conflictHint =
    conflicts.length > 1 ? `${conflicts.length} Konflikte` : manipulationResourceAvailabilitySecondaryLine(entry);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          stateClasses,
          "cursor-default text-left hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]",
        )}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${accessibleName}. Belegungsdetails anzeigen`}
        data-testid={`planning-hub-manipulation-board-cell-${entry.resourceId}`}
        data-occupancy-detail="true"
        onClick={() => setOpen((v) => !v)}
      >
        {lines.map((line) => (
          <span key={line} className="block text-center">
            {line}
          </span>
        ))}
        {conflictHint ? (
          <span className="mt-0.5 block text-center text-[10px] font-medium text-[var(--text-2)]">
            {conflicts.length > 1 ? `${conflicts.length} Konflikte` : conflictHint}
          </span>
        ) : null}
      </button>
      <ConflictDetailPopover
        entry={entry}
        timezone={timezone}
        open={open}
        onOpenChange={setOpen}
        popoverId={popoverId}
        anchorRef={triggerRef}
      />
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

  const showOccupancyDetail =
    !selectable && (entry.state === "OCCUPIED" || entry.state === "PARTIAL") && entry.conflicts.length > 0;

  if (showOccupancyDetail) {
    return (
      <OccupiedAvailabilityCell
        entry={entry}
        item={item}
        facilityLabel={facilityLabel}
        segmentLabel={segmentLabel}
        timezone={timezone}
        stateClasses={stateClasses}
        lines={lines}
        accessibleName={accessibleName}
      />
    );
  }

  const content = (
    <>
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        className={cn(
          stateClasses,
          "cursor-pointer hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]",
        )}
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
  const visibleGroups = groups.filter((g) => g.segments.some((s) => entryById.has(s.resourceId)));
  if (visibleGroups.length === 0) return null;

  const maxSegments = Math.max(...visibleGroups.map((g) => g.segments.length), 1);
  const headerSegments =
    visibleGroups.find((g) => g.segments.length === maxSegments)?.segments ?? [];

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
        <div
          aria-hidden
          className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
        />
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

function BestAlternativesSection({
  alternatives,
  groups,
  item,
  reservationLabel,
  selectedResourceId,
  onSelectResourceId,
}: {
  alternatives: readonly ManipulationResourceAvailability[];
  groups: readonly PlanningResourceGroup[];
  item: WeekplannerItem;
  reservationLabel: string;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
}) {
  return (
    <div
      className="mb-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/60 px-2 py-2"
      data-testid="planning-hub-manipulation-board-best-alternatives"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]">
        Beste freie Alternativen
      </p>
      {alternatives.length === 0 ? (
        <p
          className="mt-1 text-xs text-[var(--text-2)]"
          data-testid="planning-hub-manipulation-board-no-free-alternative"
        >
          Keine konfliktfreie Alternative für {reservationLabel}
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {alternatives.map((entry) => {
            const label = formatManipulationAlternativeLabel(entry, groups);
            const lines = manipulationResourceAvailabilityBoardLines(entry, item);
            const selected = selectedResourceId === entry.resourceId;
            return (
              <li key={entry.resourceId}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border border-emerald-600/30 bg-emerald-50/70 px-2 py-1.5 text-left text-xs transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)] dark:bg-emerald-950/20",
                    entry.isRecommended && "border-[var(--sce-primary)]/50",
                    selected && "ring-2 ring-[var(--sce-primary)] ring-offset-1",
                  )}
                  aria-pressed={selected}
                  data-testid={`planning-hub-manipulation-board-alternative-${entry.resourceId}`}
                  onClick={() => onSelectResourceId(entry.resourceId)}
                >
                  <span className="font-semibold text-[var(--foreground)]">
                    {entry.isRecommended ? "Empfohlen · " : null}
                    {label}
                  </span>
                  <span className="text-[var(--text-2)]">{lines.join(" · ")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InventoryControls({
  searchQuery,
  onSearchQueryChange,
  freeOnly,
  onFreeOnlyChange,
  siteFilter,
  onSiteFilterChange,
  siteOptions,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  freeOnly: boolean;
  onFreeOnlyChange: (value: boolean) => void;
  siteFilter: string;
  onSiteFilterChange: (value: string) => void;
  siteOptions: readonly { key: string; label: string }[];
}) {
  const searchId = useId();
  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-2"
      data-testid="planning-hub-manipulation-board-inventory-controls"
    >
      <label className="sr-only" htmlFor={searchId}>
        Ressourcen suchen
      </label>
      <input
        id={searchId}
        type="search"
        placeholder="Suche …"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        className="min-w-[8rem] flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs"
        data-testid="planning-hub-manipulation-board-search"
      />
      <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
        <input
          type="checkbox"
          checked={freeOnly}
          onChange={(event) => onFreeOnlyChange(event.target.checked)}
          data-testid="planning-hub-manipulation-board-free-only"
        />
        Nur freie
      </label>
      {siteOptions.length > 1 ? (
        <select
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
          value={siteFilter}
          onChange={(event) => onSiteFilterChange(event.target.value)}
          aria-label="Anlage filtern"
          data-testid="planning-hub-manipulation-board-site-filter"
        >
          <option value="">Alle Anlagen</option>
          {siteOptions.map((site) => (
            <option key={site.key} value={site.key}>
              {site.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function CurrentResourceContextBanner({
  entry,
  item,
  groups,
}: {
  entry: ManipulationResourceAvailability;
  item: WeekplannerItem;
  groups: readonly PlanningResourceGroup[];
}) {
  const label = formatManipulationResourceLabel(entry.resourceId, groups, entry.resourceRef.name);
  const status = manipulationResourceAvailabilityStatusText(entry, item);
  return (
    <p
      className="mb-2 rounded-md border border-[var(--sce-primary)]/35 bg-[var(--sce-primary-light)]/20 px-2 py-1 text-xs text-[var(--foreground)]"
      data-testid="planning-hub-manipulation-board-current-resource"
    >
      <span className="font-semibold">Aktuelle Ressource:</span> {label} · {status}
    </p>
  );
}

function CollapsibleSiteInventorySection({
  siteLabel,
  siteKey,
  summaryLine,
  expanded,
  onToggle,
  children,
}: {
  siteLabel: string;
  siteKey: string;
  summaryLine: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="border-b border-[var(--border)] pb-2 last:border-b-0"
      data-testid={`planning-hub-manipulation-board-site-${siteKey}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]"
        aria-expanded={expanded}
        data-testid={`planning-hub-manipulation-board-site-toggle-${siteKey}`}
        onClick={onToggle}
      >
        <span>
          <span className="block font-semibold text-[var(--foreground)]">{siteLabel}</span>
          <span className="text-[var(--text-2)]">{summaryLine}</span>
        </span>
        <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--muted)]">
          {expanded ? "Zuklappen" : "Aufklappen"}
        </span>
      </button>
      {expanded ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

function DressingAvailabilityRow({
  entry,
  item,
  selectedResourceId,
  onSelectResourceId,
  timezone,
}: {
  entry: ManipulationResourceAvailability;
  item: WeekplannerItem;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  timezone: string;
}) {
  const lines = manipulationResourceAvailabilityBoardLines(entry, item);
  const label = entry.resourceRef.name;
  const accessibleName = manipulationResourceAvailabilityAccessibleName(entry, item, label, label);
  const selected = selectedResourceId === entry.resourceId;
  const selectable = manipulationResourceAvailabilityCellSelectable(entry);

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
      </span>
    </>
  );

  if (!selectable && entry.conflicts.length > 0) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const popoverId = useId();
    const conflictHint =
      entry.conflicts.length > 1
        ? `${entry.conflicts.length} Konflikte`
        : (manipulationResourceAvailabilitySecondaryLine(entry) ?? "Belegt");

    return (
      <li key={entry.resourceId}>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "flex w-full flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]",
            entry.isCurrent && "border-[var(--sce-primary)] bg-[var(--sce-primary-light)]/35",
          )}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`${accessibleName}. Belegungsdetails anzeigen`}
          data-testid={`planning-hub-manipulation-board-cell-${entry.resourceId}`}
          data-occupancy-detail="true"
          onClick={() => setOpen((v) => !v)}
        >
          {rowBody}
          <span className="text-[10px] font-medium">{conflictHint}</span>
        </button>
        <ConflictDetailPopover
          entry={entry}
          timezone={timezone}
          open={open}
          onOpenChange={setOpen}
          popoverId={popoverId}
          anchorRef={triggerRef}
        />
      </li>
    );
  }

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
    <ul className="space-y-1.5" data-testid="planning-hub-manipulation-dressing-board-list">
      {rows.map((entry) => (
        <DressingAvailabilityRow
          key={entry.resourceId}
          entry={entry}
          item={item}
          selectedResourceId={selectedResourceId}
          onSelectResourceId={onSelectResourceId}
          timezone={timezone}
        />
      ))}
    </ul>
  );
}

function AdaptivePitchInventory({
  mode,
  groups,
  siteGroups,
  entryById,
  item,
  selectedResourceId,
  onSelectResourceId,
  timezone,
  expandedSiteKeys,
  onToggleSite,
}: {
  mode: ManipulationResourceAvailabilityPresentationMode;
  groups: readonly PlanningResourceGroup[];
  siteGroups: ReturnType<typeof buildManipulationAvailabilitySiteGroups>;
  entryById: Map<string, ManipulationResourceAvailability>;
  item: WeekplannerItem;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  timezone: string;
  expandedSiteKeys: ReadonlySet<string>;
  onToggleSite: (siteKey: string) => void;
}) {
  const visibleGroupKeys = useMemo(() => new Set(groups.map((g) => g.groupKey)), [groups]);

  if (groups.length === 0) {
    return (
      <p className="text-xs text-[var(--text-2)]" data-testid="planning-hub-manipulation-board-empty-filter">
        Keine Ressource für die aktuelle Filterung gefunden.
      </p>
    );
  }

  if (mode === "LARGE_INVENTORY") {
    return (
      <div data-testid="planning-hub-manipulation-board-large-inventory">
        {siteGroups.map((site) => {
          const visibleSiteGroups = site.groups.filter((g) => visibleGroupKeys.has(g.groupKey));
          if (visibleSiteGroups.length === 0) return null;
          const summary = summarizeManipulationPhysicalGroups(visibleSiteGroups, entryById);
          const summaryLine = formatManipulationSiteGroupSummaryLine(summary, "PITCH_HALL");
          const expanded = expandedSiteKeys.has(site.siteKey);
          return (
            <CollapsibleSiteInventorySection
              key={site.siteKey}
              siteKey={site.siteKey}
              siteLabel={site.siteLabel}
              summaryLine={summaryLine}
              expanded={expanded}
              onToggle={() => onToggleSite(site.siteKey)}
            >
              <PitchAvailabilityGrid
                groups={visibleSiteGroups}
                entryById={entryById}
                item={item}
                selectedResourceId={selectedResourceId}
                onSelectResourceId={onSelectResourceId}
                timezone={timezone}
              />
            </CollapsibleSiteInventorySection>
          );
        })}
      </div>
    );
  }

  return (
    <PitchAvailabilityGrid
      groups={groups}
      entryById={entryById}
      item={item}
      selectedResourceId={selectedResourceId}
      onSelectResourceId={onSelectResourceId}
      timezone={timezone}
    />
  );
}

function AdaptiveDressingInventory({
  mode,
  groups,
  siteGroups,
  entryById,
  item,
  selectedResourceId,
  onSelectResourceId,
  timezone,
  expandedSiteKeys,
  onToggleSite,
}: {
  mode: ManipulationResourceAvailabilityPresentationMode;
  groups: readonly PlanningResourceGroup[];
  siteGroups: ReturnType<typeof buildManipulationAvailabilitySiteGroups>;
  entryById: Map<string, ManipulationResourceAvailability>;
  item: WeekplannerItem;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  timezone: string;
  expandedSiteKeys: ReadonlySet<string>;
  onToggleSite: (siteKey: string) => void;
}) {
  const visibleGroupKeys = useMemo(() => new Set(groups.map((g) => g.groupKey)), [groups]);

  if (groups.length === 0) {
    return (
      <p className="text-xs text-[var(--text-2)]" data-testid="planning-hub-manipulation-board-empty-filter">
        Keine Ressource für die aktuelle Filterung gefunden.
      </p>
    );
  }

  if (mode === "LARGE_INVENTORY") {
    return (
      <div data-testid="planning-hub-manipulation-board-large-inventory">
        {siteGroups.map((site) => {
          const visibleSiteGroups = site.groups.filter((g) => visibleGroupKeys.has(g.groupKey));
          if (visibleSiteGroups.length === 0) return null;
          const summary = summarizeManipulationPhysicalGroups(visibleSiteGroups, entryById);
          const summaryLine = formatManipulationSiteGroupSummaryLine(summary, "DRESSING_ROOM");
          const expanded = expandedSiteKeys.has(site.siteKey);
          return (
            <CollapsibleSiteInventorySection
              key={site.siteKey}
              siteKey={site.siteKey}
              siteLabel={site.siteLabel}
              summaryLine={summaryLine}
              expanded={expanded}
              onToggle={() => onToggleSite(site.siteKey)}
            >
              <DressingAvailabilityList
                groups={visibleSiteGroups}
                entryById={entryById}
                item={item}
                selectedResourceId={selectedResourceId}
                onSelectResourceId={onSelectResourceId}
                timezone={timezone}
              />
            </CollapsibleSiteInventorySection>
          );
        })}
      </div>
    );
  }

  return (
    <DressingAvailabilityList
      groups={groups}
      entryById={entryById}
      item={item}
      selectedResourceId={selectedResourceId}
      onSelectResourceId={onSelectResourceId}
      timezone={timezone}
    />
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

  const presentationMode = useMemo(
    () => deriveManipulationResourceAvailabilityPresentationMode(groups.length),
    [groups.length],
  );

  const currentEntry = useMemo(
    () => availabilityEntries.find((e) => e.isCurrent) ?? null,
    [availabilityEntries],
  );
  const currentResourceId = currentEntry?.resourceId ?? selectedResourceId;

  const [searchQuery, setSearchQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [siteFilter, setSiteFilter] = useState("");
  const [expandedSiteKeys, setExpandedSiteKeys] = useState<Set<string>>(() => new Set());

  const siteGroups = useMemo(() => buildManipulationAvailabilitySiteGroups(groups), [groups]);

  const siteOptions = useMemo(
    () => siteGroups.map((s) => ({ key: s.siteKey, label: s.siteLabel })),
    [siteGroups],
  );

  const filteredGroups = useMemo(() => {
    let next = filterManipulationAvailabilityGroups({
      groups,
      entryById,
      searchQuery,
      freeOnly,
      currentResourceId,
    });
    if (siteFilter) {
      next = next.filter((g) => (g.facilityName.trim() || g.facilityId) === siteFilter);
    }
    return next;
  }, [groups, entryById, searchQuery, freeOnly, currentResourceId, siteFilter]);

  const bestAlternatives = useMemo(
    () =>
      pickBestManipulationAlternatives(
        availabilityEntries,
        currentEntry?.resourceRef ?? null,
      ),
    [availabilityEntries, currentEntry],
  );

  const reservationLabel = formatManipulationReservationWindow(
    reservationStartAt,
    reservationEndAt,
    timezone,
  );

  const usesAdaptiveControls = manipulationAvailabilityPresentationUsesAdaptiveControls(presentationMode);
  const filtersActive = usesAdaptiveControls && (searchQuery.trim().length > 0 || freeOnly || siteFilter);

  useEffect(() => {
    if (!manipulationAvailabilitySiteGroupsDefaultCollapsed(presentationMode)) return;
    setExpandedSiteKeys(new Set());
  }, [presentationMode, groups.length]);

  const headerTitle =
    resourceKind === "PITCH_HALL" ? "Spielfeld-Verfügbarkeit" : "Garderoben-Verfügbarkeit";
  const inventoryHeading = manipulationAvailabilityInventoryHeading(
    presentationMode,
    resourceKind,
    filteredGroups.length,
  );

  const toggleSite = (siteKey: string) => {
    setExpandedSiteKeys((prev) => {
      const next = new Set(prev);
      if (next.has(siteKey)) next.delete(siteKey);
      else next.add(siteKey);
      return next;
    });
  };

  const searchEmptyMessage =
    searchQuery.trim().length > 0 && filteredGroups.length === 0
      ? `Keine Ressource für "${searchQuery.trim()}" gefunden.`
      : null;

  return (
    <section
      className="mt-3"
      data-testid={testId}
      data-presentation-mode={presentationMode}
      aria-labelledby={`${testId}-heading`}
    >
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

      {usesAdaptiveControls && currentEntry ? (
        <div className="mt-2">
          {filtersActive ? (
            <CurrentResourceContextBanner entry={currentEntry} item={item} groups={groups} />
          ) : null}
          <BestAlternativesSection
            alternatives={bestAlternatives}
            groups={groups}
            item={item}
            reservationLabel={reservationLabel}
            selectedResourceId={selectedResourceId}
            onSelectResourceId={onSelectResourceId}
          />
          <InventoryControls
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            freeOnly={freeOnly}
            onFreeOnlyChange={setFreeOnly}
            siteFilter={siteFilter}
            onSiteFilterChange={setSiteFilter}
            siteOptions={siteOptions}
          />
          {inventoryHeading ? (
            <p
              className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
              data-testid="planning-hub-manipulation-board-inventory-heading"
            >
              {inventoryHeading}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2">
        {searchEmptyMessage ? (
          <p className="text-xs text-[var(--text-2)]" data-testid="planning-hub-manipulation-board-search-empty">
            {searchEmptyMessage}
          </p>
        ) : resourceKind === "PITCH_HALL" ? (
          <AdaptivePitchInventory
            mode={presentationMode}
            groups={filteredGroups}
            siteGroups={siteGroups}
            entryById={entryById}
            item={item}
            selectedResourceId={selectedResourceId}
            onSelectResourceId={onSelectResourceId}
            timezone={timezone}
            expandedSiteKeys={expandedSiteKeys}
            onToggleSite={toggleSite}
          />
        ) : (
          <AdaptiveDressingInventory
            mode={presentationMode}
            groups={filteredGroups}
            siteGroups={siteGroups}
            entryById={entryById}
            item={item}
            selectedResourceId={selectedResourceId}
            onSelectResourceId={onSelectResourceId}
            timezone={timezone}
            expandedSiteKeys={expandedSiteKeys}
            onToggleSite={toggleSite}
          />
        )}
      </div>
    </section>
  );
}
