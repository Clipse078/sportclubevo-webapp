"use client";

/**
 * PLANNING-UX-05R2 — compact operational resource selector (Training / Match /
 * Tournament create & record edit). Uses semantic green pitch/hall and blue
 * dressing-room glyphs (FacilityResourceIdentity) without large PitchVisual
 * diagrams. Wochenplaner surfaces keep VisualResourceAvailabilityPicker.
 */

import { useCallback, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { FacilityResourceType } from "@prisma/client";
import { cn } from "@/lib/cn";
import type {
  FacilityGroup,
  ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { FacilityResourceGlyph } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import {
  RESOURCE_CARD_DRESSING_SELECTED_CLASSES,
  RESOURCE_CARD_PITCH_SELECTED_CLASSES,
  RESOURCE_SEMANTIC_DRESSING_ICON_CLASS,
  RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
} from "@/components/admin/shared/planning/resource-card-selection-style";
import {
  formatResourceOccupancyPrimaryLine,
  resolveResourceOccupancyPresentationKind,
} from "@/lib/planning/resource-occupancy-presentation";

export type CompactOperationalResourceKind = "pitch_hall" | "dressing_room" | "other";

export type CompactOperationalResourceSelectorProps = {
  kind: CompactOperationalResourceKind;
  facilityGroups: FacilityGroup[];
  selectedResourceIds: Set<string>;
  onSelect: (resourceId: string) => void;
  onDeselect: (resourceId: string) => void;
  disabled?: boolean;
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  singleSelect?: boolean;
  label?: string;
  testId?: string;
  emptyMessage?: string;
  layout?: "default" | "aggregated";
  availableLabel?: string;
  occupiedLabel?: string;
};

type FlatResource = {
  id: string;
  name: string;
  resourceType: FacilityResourceType;
  facilityType?: string;
  facilityName: string;
  availability?: ResourceAvailabilityAnnotation;
};

function formatClockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function flattenResources(facilityGroups: FacilityGroup[]): FlatResource[] {
  const items: FlatResource[] = [];
  for (const fg of facilityGroups) {
    for (const r of fg.resources) {
      items.push({
        id: r.id,
        name: r.name,
        resourceType: r.type,
        facilityType: r.facilityType ?? fg.facilityType,
        facilityName: fg.facilityName,
      });
    }
  }
  return items;
}

function availabilityLine(
  annotation: ResourceAvailabilityAnnotation | undefined,
  isSelected: boolean,
): string | null {
  const line = formatResourceOccupancyPrimaryLine(annotation, { isSelected });
  if (!line) return null;
  if (
    annotation?.status === "OCCUPIED" &&
    annotation.conflictStartAt &&
    annotation.conflictEndAt &&
    annotation.occupancyPresentation !== "CURRENT" &&
    annotation.occupancyPresentation !== "SHARED"
  ) {
    return `${line} · ${formatClockTime(annotation.conflictStartAt)}–${formatClockTime(annotation.conflictEndAt)}`;
  }
  return line;
}

function ResourceChip({
  resource,
  kind,
  isSelected,
  disabled,
  onToggle,
  testId,
}: {
  resource: FlatResource;
  kind: CompactOperationalResourceKind;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
  testId?: string;
}) {
  const [pendingOccupiedConfirm, setPendingOccupiedConfirm] = useState(false);
  const isPitchKind = kind === "pitch_hall";
  const isOtherKind = kind === "other";
  const selectedClasses = isPitchKind
    ? RESOURCE_CARD_PITCH_SELECTED_CLASSES
    : isOtherKind
      ? "border-[var(--border)] bg-[var(--surface-2)] ring-[var(--border)]"
      : RESOURCE_CARD_DRESSING_SELECTED_CLASSES;
  const iconAccent = isPitchKind
    ? RESOURCE_SEMANTIC_PITCH_ICON_CLASS
    : isOtherKind
      ? "text-[var(--muted)]"
      : RESOURCE_SEMANTIC_DRESSING_ICON_CLASS;
  const availLine = availabilityLine(resource.availability, isSelected);
  const presentationKind = resolveResourceOccupancyPresentationKind(resource.availability, { isSelected });
  const isOccupied = presentationKind === "OCCUPIED";
  const isShared = presentationKind === "SHARED";

  const handleClick = () => {
    if (disabled) return;
    if (isSelected) {
      onToggle();
      return;
    }
    if (isOccupied && !isShared && !pendingOccupiedConfirm) {
      setPendingOccupiedConfirm(true);
      return;
    }
    setPendingOccupiedConfirm(false);
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      data-testid={testId ? `${testId}-option-${resource.id}` : undefined}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
        "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
        isSelected && selectedClasses,
        isSelected && "ring-1 ring-[var(--sce-primary)]/35",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] ring-1 ring-[var(--border)]",
          iconAccent,
        )}
        aria-hidden
      >
        <FacilityResourceGlyph
          resourceType={resource.resourceType}
          facilityType={resource.facilityType}
          className={iconAccent}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--foreground)]">{resource.name}</span>
        <span className="block truncate text-xs text-[var(--muted)]">{resource.facilityName}</span>
        {availLine ? (
          <span
            className={cn(
              "mt-0.5 block text-xs",
              isShared
                ? "text-[var(--text-2)]"
                : isOccupied
                  ? "text-amber-700/90"
                  : "text-emerald-600/90",
            )}
          >
            {availLine}
          </span>
        ) : null}
        {pendingOccupiedConfirm && !isSelected ? (
          <span className="mt-1 block text-xs font-medium text-[var(--sce-primary)]">
            Erneut tippen, um trotz Belegung zu wählen
          </span>
        ) : null}
      </span>
      {isSelected ? (
        <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--sce-primary)]" aria-hidden />
      ) : null}
    </button>
  );
}

function ResourceGrid({
  resources,
  kind,
  selectedResourceIds,
  disabled,
  onSelect,
  onDeselect,
  singleSelect,
  testId,
}: {
  resources: FlatResource[];
  kind: CompactOperationalResourceKind;
  selectedResourceIds: Set<string>;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDeselect: (id: string) => void;
  singleSelect: boolean;
  testId?: string;
}) {
  const handleToggle = useCallback(
    (id: string) => {
      const isSelected = selectedResourceIds.has(id);
      if (isSelected) {
        onDeselect(id);
        return;
      }
      if (singleSelect) {
        for (const selected of selectedResourceIds) {
          onDeselect(selected);
        }
      }
      onSelect(id);
    },
    [onDeselect, onSelect, selectedResourceIds, singleSelect],
  );

  if (resources.length === 0) return null;

  return (
    <ul
      className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
      data-testid={testId ? `${testId}-grid` : undefined}
    >
      {resources.map((resource) => (
        <li key={resource.id} className="min-w-0">
          <ResourceChip
            resource={resource}
            kind={kind}
            isSelected={selectedResourceIds.has(resource.id)}
            disabled={disabled}
            onToggle={() => handleToggle(resource.id)}
            testId={testId}
          />
        </li>
      ))}
    </ul>
  );
}

export function CompactOperationalResourceSelector({
  kind,
  facilityGroups,
  selectedResourceIds,
  onSelect,
  onDeselect,
  disabled = false,
  availabilityByResourceId,
  singleSelect = false,
  label,
  testId,
  emptyMessage,
  layout = "default",
  availableLabel = "Verfügbar",
  occupiedLabel = "Belegt",
}: CompactOperationalResourceSelectorProps) {
  const flat = useMemo(() => {
    const base = flattenResources(facilityGroups);
    return base.map((r) => ({
      ...r,
      availability: availabilityByResourceId?.get(r.id),
    }));
  }, [availabilityByResourceId, facilityGroups]);

  if (flat.length === 0) {
    return (
      <p className="text-sm italic text-[var(--text-2)]" data-testid={testId ? `${testId}-empty` : undefined}>
        {emptyMessage ?? "Keine Ressourcen konfiguriert."}
      </p>
    );
  }

  const free = flat.filter((r) => !r.availability || r.availability.status === "FREE");
  const occupied = flat.filter((r) => r.availability?.status === "OCCUPIED");

  const gridProps = {
    kind,
    selectedResourceIds,
    disabled,
    onSelect,
    onDeselect,
    singleSelect,
    testId,
  };

  return (
    <div className="space-y-3" data-testid={testId}>
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      ) : null}
      {layout === "aggregated" ? (
        <div className="space-y-4">
          {free.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">{availableLabel}</p>
              <ResourceGrid resources={free} {...gridProps} />
            </div>
          ) : null}
          {occupied.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">{occupiedLabel}</p>
              <ResourceGrid resources={occupied} {...gridProps} />
            </div>
          ) : null}
        </div>
      ) : (
        <ResourceGrid resources={flat} {...gridProps} />
      )}
    </div>
  );
}

/** Drop-in alias for pitch/hall operational surfaces. */
export function CompactPitchHallResourceSelector(
  props: Omit<CompactOperationalResourceSelectorProps, "kind">,
) {
  return <CompactOperationalResourceSelector kind="pitch_hall" {...props} />;
}

/** Drop-in alias for dressing-room operational surfaces. */
export function CompactDressingRoomResourceSelector(
  props: Omit<CompactOperationalResourceSelectorProps, "kind">,
) {
  return <CompactOperationalResourceSelector kind="dressing_room" {...props} />;
}
