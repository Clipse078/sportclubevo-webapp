"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { PlanningResourceGroup } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import { formatManipulationResourceLabel } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import {
  buildManipulationResourceAvailabilityList,
  manipulationResourceAvailabilitySecondaryLine,
  manipulationResourceAvailabilityStatusText,
  sortManipulationResourceAvailabilityForPicker,
  type ManipulationResourceAvailability,
  type ManipulationResourceKind,
} from "@/lib/planning-hub/manipulation-resource-availability";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerItem;
  allItems: readonly WeekplannerItem[];
  resourceKind: ManipulationResourceKind;
  resourceOptions: readonly WeekplannerResourceRef[];
  facilityGroups: FacilityGroup[];
  planningResourceGroups?: readonly PlanningResourceGroup[];
  currentResourceId: string;
  selectedResourceId: string;
  onSelectResourceId: (resourceId: string) => void;
  reservationStartAt: Date;
  reservationEndAt: Date;
  timezone: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  testId?: string;
};

function formatReservationWindow(start: Date, end: Date, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  return `${start.toLocaleTimeString("de-CH", opts)}–${end.toLocaleTimeString("de-CH", opts)}`;
}

function resourceMatchesSearch(
  entry: ManipulationResourceAvailability,
  groups: readonly PlanningResourceGroup[] | undefined,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const label = groups?.length
    ? formatManipulationResourceLabel(entry.resourceId, groups, entry.resourceRef.name)
    : `${entry.resourceRef.facilityName} ${entry.resourceRef.name}`;
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

function AvailabilityRow({
  entry,
  item,
  label,
  selected,
  onSelect,
  activeDescendantId,
}: {
  entry: ManipulationResourceAvailability;
  item: WeekplannerItem;
  label: string;
  selected: boolean;
  onSelect: () => void;
  activeDescendantId: string | null;
}) {
  const rowId = `manipulation-resource-option-${entry.resourceId}`;
  const status = manipulationResourceAvailabilityStatusText(entry, item);
  const secondary = manipulationResourceAvailabilitySecondaryLine(entry);
  const isFree = entry.state === "AVAILABLE";
  const isPartial = entry.state === "PARTIAL";
  const isOccupied = entry.state === "OCCUPIED";

  return (
    <button
      type="button"
      id={rowId}
      role="option"
      aria-selected={selected}
      data-active={activeDescendantId === rowId ? "true" : undefined}
      data-testid={`planning-hub-manipulation-resource-option-${entry.resourceId}`}
      className={cn(
        "flex w-full flex-col rounded-md px-2 py-2 text-left text-sm transition",
        "hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--sce-primary)]",
        selected && "bg-[var(--sce-primary-light)]/60 ring-1 ring-[var(--sce-primary)]/30",
      )}
      onClick={onSelect}
    >
      <span className="flex flex-wrap items-center gap-1.5 font-medium text-[var(--foreground)]">
        {isFree && !entry.isCurrent ? (
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
        ) : null}
        {(isOccupied || isPartial) && !entry.isCurrent ? (
          <span className="text-amber-700" aria-hidden>
            !
          </span>
        ) : null}
        <span>{label}</span>
        {entry.isRecommended ? (
          <span className="rounded-full border border-[var(--sce-primary)]/40 bg-[var(--sce-primary-light)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sce-primary)]">
            Empfohlen
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "mt-0.5 text-xs",
          isFree ? "text-emerald-700/90" : isPartial ? "text-amber-800/90" : "text-amber-800/90",
        )}
      >
        {status}
      </span>
      {secondary ? (
        <span className="text-xs text-[var(--text-2)]">{secondary}</span>
      ) : null}
    </button>
  );
}

export default function PlanningHubManipulationResourceAvailabilityPicker({
  item,
  allItems,
  resourceKind,
  resourceOptions,
  facilityGroups,
  planningResourceGroups,
  currentResourceId,
  selectedResourceId,
  onSelectResourceId,
  reservationStartAt,
  reservationEndAt,
  timezone,
  initialFocusRef,
  testId = "planning-hub-manipulation-resource-picker",
}: Props) {
  const labelId = useId();
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const availabilityEntries = useMemo(() => {
    const list = buildManipulationResourceAvailabilityList({
      allItems,
      editingItem: item,
      currentResourceId,
      resourceOptions,
      reservationStartAt,
      reservationEndAt,
      resourceKind,
    });
    return sortManipulationResourceAvailabilityForPicker(list);
  }, [
    allItems,
    item,
    currentResourceId,
    selectedResourceId,
    resourceOptions,
    reservationStartAt,
    reservationEndAt,
    resourceKind,
  ]);

  const filtered = useMemo(
    () =>
      availabilityEntries.filter((entry) =>
        resourceMatchesSearch(entry, planningResourceGroups, query),
      ),
    [availabilityEntries, planningResourceGroups, query],
  );

  const recommended = filtered.filter((e) => e.isRecommended && e.state === "AVAILABLE");
  const freeOthers = filtered.filter((e) => e.state === "AVAILABLE" && !e.isRecommended);
  const partial = filtered.filter((e) => e.state === "PARTIAL");
  const occupied = filtered.filter((e) => e.state === "OCCUPIED");

  const flatVisible = useMemo(
    () => [...recommended, ...freeOthers, ...partial, ...occupied],
    [recommended, freeOthers, partial, occupied],
  );

  const selectedEntry =
    availabilityEntries.find((e) => e.resourceId === selectedResourceId) ?? availabilityEntries[0];

  const selectedLabel = selectedEntry
    ? planningResourceGroups?.length
      ? formatManipulationResourceLabel(
          selectedEntry.resourceId,
          planningResourceGroups,
          selectedEntry.resourceRef.name,
        )
      : selectedEntry.resourceRef.name
    : "Ressource wählen";

  const selectedStatus = selectedEntry
    ? manipulationResourceAvailabilityStatusText(selectedEntry, item)
    : "";

  const pickerTitle =
    resourceKind === "PITCH_HALL" ? "Spielfeld auswählen" : "Garderobe auswählen";

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const selectAt = useCallback(
    (index: number) => {
      const entry = flatVisible[index];
      if (!entry) return;
      onSelectResourceId(entry.resourceId);
      close();
    },
    [close, flatVisible, onSelectResourceId],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatVisible.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectAt(activeIndex);
    }
  };

  const activeDescendantId =
    flatVisible[activeIndex] != null
      ? `manipulation-resource-option-${flatVisible[activeIndex]!.resourceId}`
      : null;

  const renderSection = (
    title: string,
    entries: ManipulationResourceAvailability[],
    sectionTestId: string,
  ) => {
    if (entries.length === 0) return null;
    return (
      <div className="space-y-0.5" data-testid={sectionTestId}>
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        {entries.map((entry) => {
          const label = planningResourceGroups?.length
            ? formatManipulationResourceLabel(
                entry.resourceId,
                planningResourceGroups,
                entry.resourceRef.name,
              )
            : entry.resourceRef.name;
          return (
            <AvailabilityRow
              key={entry.resourceId}
              entry={entry}
              item={item}
              label={label}
              selected={entry.resourceId === selectedResourceId}
              onSelect={() => {
                onSelectResourceId(entry.resourceId);
                close();
              }}
              activeDescendantId={activeDescendantId}
            />
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (!initialFocusRef) return;
    initialFocusRef.current = triggerRef.current;
    triggerRef.current?.focus();
  }, [initialFocusRef]);

  return (
    <div data-testid={testId}>
      <label className="block text-xs font-semibold text-[var(--muted)]" htmlFor={`${labelId}-trigger`}>
        Ressource
      </label>
      <button
        id={`${labelId}-trigger`}
        ref={triggerRef}
        type="button"
        className="mt-1 flex w-full items-start justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-left text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-testid={`${testId}-trigger`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-[var(--foreground)]">{selectedLabel}</span>
          {selectedStatus ? (
            <span className="block truncate text-xs text-[var(--text-2)]">{selectedStatus}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-[10px] text-[var(--muted)]" aria-hidden>
          ▾
        </span>
      </button>

      <PopoverContent
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        anchorRef={triggerRef}
        role="listbox"
        id={listboxId}
        aria-labelledby={labelId}
        matchAnchorWidth
        maxHeight={360}
        className="p-2"
      >
        <p id={labelId} className="px-2 text-xs font-semibold text-[var(--foreground)]">
          {pickerTitle}
        </p>
        <p className="px-2 text-[11px] text-[var(--text-2)]">
          Für Reservierung {formatReservationWindow(reservationStartAt, reservationEndAt, timezone)}
        </p>
        {facilityGroups.length > 0 ? (
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Ressourcen durchsuchen …"
            className="mx-2 mt-2 w-[calc(100%-1rem)] rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            data-testid={`${testId}-search`}
            aria-label="Ressourcen durchsuchen"
          />
        ) : null}
        <div className="mt-2 max-h-64 space-y-2 overflow-auto" onKeyDown={handleKeyDown}>
          {renderSection("Empfohlen / Frei", [...recommended, ...freeOthers], `${testId}-section-free`)}
          {renderSection("Teilweise belegt", partial, `${testId}-section-partial`)}
          {renderSection("Weitere Ressourcen", occupied, `${testId}-section-occupied`)}
          {flatVisible.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[var(--text-2)]">Keine Treffer.</p>
          ) : null}
        </div>
      </PopoverContent>
    </div>
  );
}
