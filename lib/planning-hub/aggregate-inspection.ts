import { weekplannerActivityTypeLabel } from "@/lib/planning-hub/item-presenters";
import { schedulerDisplayIdentity, schedulerResourceLabel } from "@/lib/planning-hub/scheduler-display-label";
import { weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type AggregateInspectionSortKey =
  | "start-asc"
  | "start-desc"
  | "team"
  | "facility";

export type AggregateInspectionMetrics = {
  activityCount: number;
  trainingCount: number;
  conflictActivityCount: number;
  uniqueFacilityCount: number;
  uniqueDressingRoomCount: number;
};

export type AggregateTimeWindow = {
  startAt: Date;
  endAt: Date;
};

export function computeAggregateTimeWindow(items: readonly WeekplannerItem[]): AggregateTimeWindow | null {
  if (items.length === 0) return null;
  const startMs = Math.min(...items.map((i) => i.startAt.getTime()));
  const endMs = Math.max(...items.map((i) => i.endAt.getTime()));
  return { startAt: new Date(startMs), endAt: new Date(endMs) };
}

function dressingRoomIdsForItem(item: WeekplannerItem): string[] {
  const ids = item.dressingRoomAllocations.map((r) => r.facilityResourceId);
  if (item.type === "MATCH") {
    ids.push(...item.awayDressingRoomAllocations.map((r) => r.facilityResourceId));
  }
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      ids.push(...participant.dressingRoomAllocations.map((r) => r.facilityResourceId));
    }
  }
  return ids;
}

export function computeAggregateInspectionMetrics(
  items: readonly WeekplannerItem[],
): AggregateInspectionMetrics {
  const facilityIds = new Set<string>();
  const dressingIds = new Set<string>();
  let trainingCount = 0;
  let conflictActivityCount = 0;

  for (const item of items) {
    if (item.type === "TRAINING") trainingCount += 1;
    if (item.conflicts.length > 0) conflictActivityCount += 1;
    for (const ref of item.pitchAllocations) {
      if (ref.facilityResourceId) facilityIds.add(ref.facilityResourceId);
    }
    for (const id of dressingRoomIdsForItem(item)) {
      if (id) dressingIds.add(id);
    }
  }

  return {
    activityCount: items.length,
    trainingCount,
    conflictActivityCount,
    uniqueFacilityCount: facilityIds.size,
    uniqueDressingRoomCount: dressingIds.size,
  };
}

export function formatAggregateInspectionDayHeading(
  dayKey: string,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

export function formatAggregateInspectionTimeRange(
  window: AggregateTimeWindow,
  locale: string,
  timeZone: string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(window.startAt)}–${fmt.format(window.endAt)}`;
}

export function itemInspectionPitchLabel(item: WeekplannerItem): string {
  const labels = item.pitchAllocations.map((r) => schedulerResourceLabel(r)).filter(Boolean);
  const unique = [...new Set(labels)];
  return unique.length > 0 ? unique.join(" · ") : "—";
}

export function itemInspectionDressingLabel(item: WeekplannerItem): string {
  const labels: string[] = [];
  for (const ref of item.dressingRoomAllocations) {
    labels.push(schedulerResourceLabel(ref));
  }
  if (item.type === "MATCH") {
    for (const ref of item.awayDressingRoomAllocations) {
      labels.push(schedulerResourceLabel(ref));
    }
  }
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      for (const ref of participant.dressingRoomAllocations) {
        labels.push(schedulerResourceLabel(ref));
      }
    }
  }
  const unique = [...new Set(labels.filter(Boolean))];
  return unique.length > 0 ? unique.join(" · ") : "—";
}

export function aggregateInspectionSearchHaystack(item: WeekplannerItem): string {
  const parts = [
    schedulerDisplayIdentity(item),
    item.title,
    ...item.teamNames,
    weekplannerActivityTypeLabel(item.type),
    itemInspectionPitchLabel(item),
    itemInspectionDressingLabel(item),
    ...item.conflicts.map((c) => c.facilityResourceName),
  ];
  return parts.join(" ").toLocaleLowerCase("de-CH");
}

export function filterAggregateInspectionItems(
  items: readonly WeekplannerItem[],
  options: {
    query: string;
    conflictsOnly: boolean;
    sortKey: AggregateInspectionSortKey;
  },
): WeekplannerItem[] {
  const normalizedQuery = options.query.trim().toLocaleLowerCase("de-CH");
  let filtered = [...items];

  if (options.conflictsOnly) {
    filtered = filtered.filter((item) => item.conflicts.length > 0);
  }

  if (normalizedQuery) {
    filtered = filtered.filter((item) =>
      aggregateInspectionSearchHaystack(item).includes(normalizedQuery),
    );
  }

  filtered.sort((a, b) => compareAggregateInspectionItems(a, b, options.sortKey));
  return filtered;
}

function compareAggregateInspectionItems(
  a: WeekplannerItem,
  b: WeekplannerItem,
  sortKey: AggregateInspectionSortKey,
): number {
  switch (sortKey) {
    case "start-desc":
      return b.startAt.getTime() - a.startAt.getTime() || a.id.localeCompare(b.id);
    case "team":
      return (
        schedulerDisplayIdentity(a).localeCompare(schedulerDisplayIdentity(b), "de-CH") ||
        a.startAt.getTime() - b.startAt.getTime()
      );
    case "facility":
      return (
        itemInspectionPitchLabel(a).localeCompare(itemInspectionPitchLabel(b), "de-CH") ||
        a.startAt.getTime() - b.startAt.getTime()
      );
    case "start-asc":
    default:
      return a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id);
  }
}

export function defaultAggregateSelectionId(items: readonly WeekplannerItem[]): string | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
  );
  const conflictFirst = sorted.find((item) => item.conflicts.length > 0);
  return (conflictFirst ?? sorted[0])!.id;
}

export function resolveAggregateSelectionId(
  visibleItems: readonly WeekplannerItem[],
  currentId: string | null,
): string | null {
  if (visibleItems.length === 0) return null;
  if (currentId && visibleItems.some((item) => item.id === currentId)) {
    return currentId;
  }
  return defaultAggregateSelectionId(visibleItems);
}

export type AggregateInspectionRowStatus = "conflict" | "end-time-action" | "planned";

export function aggregateInspectionRowStatus(item: WeekplannerItem): AggregateInspectionRowStatus {
  if (item.conflicts.length > 0) return "conflict";
  if (weekplannerMatchRequiresEndTimeAction(item)) return "end-time-action";
  return "planned";
}

export function aggregateInspectionStatusLabel(status: AggregateInspectionRowStatus): string {
  if (status === "conflict") return "Konflikt";
  if (status === "end-time-action") return "Endzeit fehlt";
  return "Geplant";
}

export function conflictPartnerDisplayTitle(
  conflict: { partnerItemId?: string; partnerTitle?: string },
  itemsById: Map<string, WeekplannerItem>,
): string {
  if (conflict.partnerItemId) {
    const partner = itemsById.get(conflict.partnerItemId);
    if (partner) return schedulerDisplayIdentity(partner);
  }
  return conflict.partnerTitle?.trim() || "—";
}
