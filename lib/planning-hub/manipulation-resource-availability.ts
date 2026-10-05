import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { resourceOccupancyWindowsOverlap } from "@/lib/facilities/resource-occupancy-window";
import {
  collectWeekplannerOccupiedResources,
  type OccupiedWeekplannerResource,
} from "@/lib/weekplanner/conflict-detection";
import { facilityResourcesShareConflictCapacity } from "@/lib/weekplanner/pitch-capacity-overlap";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

export type ManipulationResourceAvailabilityState = "AVAILABLE" | "PARTIAL" | "OCCUPIED";

export type ManipulationResourceAvailabilityConflict = {
  activityId: string;
  activityLabel: string;
  startAt: Date;
  endAt: Date;
  overlapStartAt: Date;
  overlapEndAt: Date;
};

export type ManipulationResourceAvailability = {
  resourceId: string;
  resourceRef: WeekplannerResourceRef;
  state: ManipulationResourceAvailabilityState;
  isCurrent: boolean;
  isRecommended: boolean;
  requestedStartAt: Date;
  requestedEndAt: Date;
  conflicts: ManipulationResourceAvailabilityConflict[];
};

export type ManipulationResourceKind = "PITCH_HALL" | "DRESSING_ROOM";

type OccupantRow = OccupiedWeekplannerResource & {
  itemId: string;
  itemTitle: string;
};

function collectOccupantsForKind(
  allItems: readonly WeekplannerItem[],
  excludeItemId: string,
  kind: ManipulationResourceKind,
): OccupantRow[] {
  const rows: OccupantRow[] = [];
  for (const item of allItems) {
    if (item.id === excludeItemId) continue;
    for (const occupied of collectWeekplannerOccupiedResources(item)) {
      if (occupied.resourceKind !== kind) continue;
      rows.push({
        ...occupied,
        itemId: item.id,
        itemTitle: item.title,
      });
    }
  }
  return rows;
}

function overlapsRequestedWindow(
  queryStart: Date,
  queryEnd: Date,
  occupant: Pick<OccupiedWeekplannerResource, "effectiveStartAt" | "effectiveEndAt">,
): boolean {
  return resourceOccupancyWindowsOverlap(
    { effectiveStartAt: queryStart, effectiveEndAt: queryEnd },
    occupant,
  );
}

function conflictStateForWindow(
  queryStart: Date,
  queryEnd: Date,
  conflicts: ManipulationResourceAvailabilityConflict[],
): ManipulationResourceAvailabilityState {
  if (conflicts.length === 0) return "AVAILABLE";
  if (conflicts.length > 1) return "OCCUPIED";

  const only = conflicts[0]!;
  const fullyInsideOccupancy =
    only.startAt.getTime() <= queryStart.getTime() && only.endAt.getTime() >= queryEnd.getTime();
  if (fullyInsideOccupancy) return "OCCUPIED";

  const overlapCoversFullRequest =
    only.overlapStartAt.getTime() <= queryStart.getTime() &&
    only.overlapEndAt.getTime() >= queryEnd.getTime();
  if (overlapCoversFullRequest) return "OCCUPIED";

  return "PARTIAL";
}

function findConflictsForCandidate(
  candidate: WeekplannerResourceRef,
  queryStart: Date,
  queryEnd: Date,
  occupants: OccupantRow[],
): ManipulationResourceAvailabilityConflict[] {
  const conflicts: ManipulationResourceAvailabilityConflict[] = [];
  for (const occupant of occupants) {
    if (!facilityResourcesShareConflictCapacity(candidate, occupant)) continue;
    if (!overlapsRequestedWindow(queryStart, queryEnd, occupant)) continue;

    const overlapStart = new Date(
      Math.max(queryStart.getTime(), occupant.effectiveStartAt.getTime()),
    );
    const overlapEnd = new Date(Math.min(queryEnd.getTime(), occupant.effectiveEndAt.getTime()));

    conflicts.push({
      activityId: occupant.itemId,
      activityLabel: occupant.itemTitle,
      startAt: occupant.effectiveStartAt,
      endAt: occupant.effectiveEndAt,
      overlapStartAt: overlapStart,
      overlapEndAt: overlapEnd,
    });
  }
  conflicts.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return conflicts;
}

/**
 * Deterministic recommendation (informational only):
 * 1. AVAILABLE
 * 2. same physical facility as current resource
 * 3. same resource type (FULL_PITCH / HALF_PITCH / DRESSING_ROOM)
 * 4. stable index order in resourceOptions as tie-breaker
 */
export function pickRecommendedManipulationResourceId(
  entries: readonly ManipulationResourceAvailability[],
  currentResourceRef: WeekplannerResourceRef | null,
): string | null {
  const available = entries.filter((e) => e.state === "AVAILABLE" && !e.isCurrent);
  if (available.length === 0) return null;

  const currentFacilityId = currentResourceRef?.facilityId ?? null;
  const currentType = currentResourceRef?.resourceType ?? null;

  let best: ManipulationResourceAvailability | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (entry.state !== "AVAILABLE" || entry.isCurrent) continue;

    const sameFacility =
      currentFacilityId !== null && entry.resourceRef.facilityId === currentFacilityId ? 0 : 1;
    const sameType =
      currentType !== null && entry.resourceRef.resourceType === currentType ? 0 : 1;
    const rank = sameFacility * 10 + sameType * 5 + index;

    if (rank < bestIndex) {
      bestIndex = rank;
      best = entry;
    }
  }

  return best?.resourceId ?? null;
}

export function buildManipulationResourceAvailabilityList(input: {
  allItems: readonly WeekplannerItem[];
  editingItem: WeekplannerItem;
  currentResourceId: string;
  resourceOptions: readonly WeekplannerResourceRef[];
  reservationStartAt: Date;
  reservationEndAt: Date;
  resourceKind: ManipulationResourceKind;
}): ManipulationResourceAvailability[] {
  const {
    allItems,
    editingItem,
    currentResourceId,
    resourceOptions,
    reservationStartAt,
    reservationEndAt,
    resourceKind,
  } = input;

  const occupants = collectOccupantsForKind(allItems, editingItem.id, resourceKind);
  const currentRef =
    resourceOptions.find((r) => r.facilityResourceId === currentResourceId) ?? null;

  const baseEntries: ManipulationResourceAvailability[] = resourceOptions.map((resourceRef) => {
    const conflicts = findConflictsForCandidate(
      resourceRef,
      reservationStartAt,
      reservationEndAt,
      occupants,
    );
    const state = conflictStateForWindow(reservationStartAt, reservationEndAt, conflicts);
    return {
      resourceId: resourceRef.facilityResourceId,
      resourceRef,
      state,
      isCurrent: resourceRef.facilityResourceId === currentResourceId,
      isRecommended: false,
      requestedStartAt: reservationStartAt,
      requestedEndAt: reservationEndAt,
      conflicts,
    };
  });

  const recommendedId = pickRecommendedManipulationResourceId(baseEntries, currentRef);
  return baseEntries.map((entry) => ({
    ...entry,
    isRecommended: recommendedId !== null && entry.resourceId === recommendedId,
  }));
}

export function sortManipulationResourceAvailabilityForPicker(
  entries: readonly ManipulationResourceAvailability[],
): ManipulationResourceAvailability[] {
  const stateRank: Record<ManipulationResourceAvailabilityState, number> = {
    AVAILABLE: 0,
    PARTIAL: 1,
    OCCUPIED: 2,
  };

  const indexById = new Map(entries.map((e, index) => [e.resourceId, index]));

  return [...entries].sort((a, b) => {
    const aGroup =
      a.isRecommended && a.state === "AVAILABLE"
        ? -1
        : stateRank[a.state] + (a.isCurrent ? 0.05 : 0);
    const bGroup =
      b.isRecommended && b.state === "AVAILABLE"
        ? -1
        : stateRank[b.state] + (b.isCurrent ? 0.05 : 0);
    if (aGroup !== bGroup) return aGroup - bGroup;
    return (indexById.get(a.resourceId) ?? 0) - (indexById.get(b.resourceId) ?? 0);
  });
}

export function manipulationResourceAvailabilityStatusText(
  entry: ManipulationResourceAvailability,
  editingItem: WeekplannerItem,
): string {
  if (entry.isCurrent) {
    if (editingItem.conflicts.length > 0) {
      const primary = editingItem.conflicts[0]!;
      return `Aktuell · Konflikt mit ${primary.partnerTitle}`;
    }
    return "Aktuell";
  }

  if (entry.state === "AVAILABLE") return "Frei";
  if (entry.state === "PARTIAL") {
    const first = entry.conflicts[0];
    if (first && first.startAt.getTime() > entry.requestedStartAt.getTime()) {
      return "Teilweise belegt";
    }
    return "Teilweise belegt";
  }

  if (entry.conflicts.length > 1) return `Belegt · ${entry.conflicts.length} Konflikte`;
  return "Belegt";
}

/** Compact board cell lines (text + semantics; not color-only). */
export function manipulationResourceAvailabilityBoardLines(
  entry: ManipulationResourceAvailability,
  editingItem: WeekplannerItem,
): string[] {
  if (entry.isCurrent) {
    if (editingItem.conflicts.length > 0) return ["Aktuell", "Konflikt"];
    return ["Aktuell"];
  }
  if (entry.isRecommended && entry.state === "AVAILABLE") return ["Empfohlen", "Frei"];
  if (entry.state === "AVAILABLE") return ["Frei"];
  if (entry.state === "PARTIAL") return ["Teilweise"];
  return ["Belegt"];
}

export function manipulationResourceAvailabilityCellSelectable(
  entry: ManipulationResourceAvailability,
): boolean {
  return entry.state === "AVAILABLE" && !entry.isCurrent;
}

export function manipulationResourceAvailabilityAccessibleName(
  entry: ManipulationResourceAvailability,
  editingItem: WeekplannerItem,
  facilityLabel: string,
  segmentLabel: string,
): string {
  const parts: string[] = [`${facilityLabel} ${segmentLabel}`];
  for (const line of manipulationResourceAvailabilityBoardLines(entry, editingItem)) {
    parts.push(line.toLowerCase());
  }
  return parts.join(", ");
}

export function formatManipulationReservationWindow(
  start: Date,
  end: Date,
  timezone: string,
): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  return `${start.toLocaleTimeString("de-CH", opts)}–${end.toLocaleTimeString("de-CH", opts)}`;
}

export function manipulationResourceAvailabilitySecondaryLine(
  entry: ManipulationResourceAvailability,
): string | null {
  if (entry.state === "PARTIAL" && entry.conflicts[0]) {
    const first = entry.conflicts[0];
    if (first.startAt.getTime() > entry.requestedStartAt.getTime()) {
      return `Belegt ab ${formatDeTime(first.startAt)}`;
    }
  }
  if (entry.state === "OCCUPIED" && entry.conflicts.length === 1) {
    const c = entry.conflicts[0]!;
    return `${c.activityLabel} · ${formatDeTime(c.startAt)}–${formatDeTime(c.endAt)}`;
  }
  return null;
}

function formatDeTime(date: Date): string {
  return date.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

export function toResourceAvailabilityAnnotation(
  entry: ManipulationResourceAvailability,
  editingItem: WeekplannerItem,
): ResourceAvailabilityAnnotation {
  const primary = manipulationResourceAvailabilityStatusText(entry, editingItem);
  const isCurrent = entry.isCurrent;

  if (entry.state === "AVAILABLE" && !isCurrent) {
    return { status: "FREE", occupancyPresentation: "FREE" };
  }

  if (isCurrent && editingItem.conflicts.length === 0 && entry.state === "AVAILABLE") {
    return { status: "FREE", occupancyPresentation: "CURRENT" };
  }

  const first = entry.conflicts[0];
  const conflictLabel =
    entry.conflicts.length > 1
      ? `${entry.conflicts.length} Konflikte`
      : first?.activityLabel ?? primary;

  return {
    status: entry.state === "AVAILABLE" ? "FREE" : "OCCUPIED",
    conflictLabel,
    conflictStartAt: first?.startAt.toISOString() ?? null,
    conflictEndAt: first?.endAt.toISOString() ?? null,
    conflicts: entry.conflicts.map((c) => ({
      label: c.activityLabel,
      startAt: c.startAt.toISOString(),
      endAt: c.endAt.toISOString(),
    })),
    occupancyPresentation: isCurrent ? "CURRENT" : entry.state === "AVAILABLE" ? "FREE" : "OCCUPIED",
  };
}

export function buildManipulationAvailabilityAnnotationMap(
  entries: readonly ManipulationResourceAvailability[],
  editingItem: WeekplannerItem,
): Map<string, ResourceAvailabilityAnnotation> {
  const map = new Map<string, ResourceAvailabilityAnnotation>();
  for (const entry of entries) {
    map.set(entry.resourceId, toResourceAvailabilityAnnotation(entry, editingItem));
  }
  return map;
}
