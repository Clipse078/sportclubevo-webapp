/**
 * SCE-PLANNER-UX-08-06 — operational Liste agenda (search, status, resource line).
 * Reuses canonical week item presentation; no parallel activity model.
 */

import {
  aggregateInspectionSearchHaystack,
  itemInspectionDressingLabel,
  itemInspectionPitchLabel,
} from "@/lib/planning-hub/aggregate-inspection";
import { applyPlanningHubFilters, filterWeekplannerItem } from "@/lib/planning-hub/filters";
import { weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";
import { schedulerResourceLabel } from "@/lib/planning-hub/scheduler-display-label";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerItem, WeekplannerResourceRef, WeekplannerWeek } from "@/lib/weekplanner/types";

export type ListOperationalRowStatus = "ready" | "open" | "conflict" | "incomplete";

export function listOperationalMissingAllocationLabels(item: WeekplannerItem): string[] {
  const missing: string[] = [];
  if (item.pitchAllocations.length === 0) missing.push("Spielfeld");
  if (item.type === "MATCH") {
    if (item.dressingRoomAllocations.length === 0) missing.push("Heimkabine");
    if (item.awayDressingRoomAllocations.length === 0) missing.push("Gastkabine");
  }
  if (item.type === "TRAINING" && item.dressingRoomAllocations.length === 0) {
    missing.push("Garderobe");
  }
  return missing;
}

export function listOperationalRowStatus(item: WeekplannerItem): ListOperationalRowStatus {
  if (item.conflicts.length > 0) return "conflict";
  if (listOperationalMissingAllocationLabels(item).length > 0) return "incomplete";
  if (weekplannerMatchRequiresEndTimeAction(item)) return "open";
  return "ready";
}

export function listOperationalStatusLabel(status: ListOperationalRowStatus): string {
  switch (status) {
    case "conflict":
      return "Konflikt";
    case "incomplete":
      return "Unvollständig";
    case "open":
      return "Offen";
    case "ready":
    default:
      return "Bereit";
  }
}

function collectPlanningResourceRefs(item: WeekplannerItem): WeekplannerResourceRef[] {
  const refs = [...item.pitchAllocations, ...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }
  return refs;
}

/** Canonical display fragments for progressive-disclosure resource line. */
export function listOperationalResourceParts(item: WeekplannerItem): string[] {
  const pitch = itemInspectionPitchLabel(item);
  const dressing = itemInspectionDressingLabel(item);
  const parts: string[] = [];
  if (pitch !== "—") parts.push(pitch);
  if (dressing !== "—") parts.push(dressing);
  return parts;
}

export function listOperationalResourceLine(item: WeekplannerItem, maxSegments = 2): string {
  const parts = listOperationalResourceParts(item);
  if (parts.length === 0) return "—";
  if (parts.length <= maxSegments) return parts.join(" · ");
  const shown = parts.slice(0, maxSegments);
  return `${shown.join(" · ")} · +${parts.length - maxSegments}`;
}

export function listOperationalResourceTitle(item: WeekplannerItem): string | undefined {
  const parts = listOperationalResourceParts(item);
  if (parts.length <= 2) return undefined;
  return parts.join(" · ");
}

export function listOperationalSearchHaystack(item: WeekplannerItem): string {
  const base = aggregateInspectionSearchHaystack(item);
  const extra: string[] = [];
  if (item.type === "MATCH" && item.opponentName) {
    extra.push(item.opponentName);
  }
  for (const ref of collectPlanningResourceRefs(item)) {
    if (ref.facilityName) extra.push(ref.facilityName);
    extra.push(schedulerResourceLabel(ref));
    // Stable codes are not primary UI labels — omit STADION_* from intentional search UX.
    if (ref.code && !/^STADION/i.test(ref.code)) {
      extra.push(ref.code.replace(/_/g, " "));
    }
  }
  return `${base} ${extra.join(" ")}`.trim().toLocaleLowerCase("de-CH");
}

export function listOperationalItemMatchesSearch(item: WeekplannerItem, rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase("de-CH");
  if (!query) return true;
  const haystack = listOperationalSearchHaystack(item);
  if (haystack.includes(query)) return true;

  // Parent facility semantics: "Hauptfeld" matches Hauptfeld / Hauptfeld A / Hauptfeld B via facilityName.
  for (const ref of collectPlanningResourceRefs(item)) {
    const facility = ref.facilityName?.trim().toLocaleLowerCase("de-CH") ?? "";
    const label = schedulerResourceLabel(ref).toLocaleLowerCase("de-CH");
    if (facility && query.length >= 3 && facility.includes(query)) return true;
    if (label.includes(query)) return true;
  }
  return false;
}

export function formatListOperationalDayHeading(
  dayKey: string,
  locale: string,
  timeZone: string,
): string {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone }).format(date);
  const rest = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
  return `${weekday.toLocaleUpperCase("de-CH")}, ${rest.toLocaleUpperCase("de-CH")}`;
}

export type ListOperationalFilterState = Pick<
  PlanningHubUrlState,
  "activity" | "team" | "facility" | "conflictsOnly"
> & {
  search: string;
};

export function applyListOperationalFilters(
  week: WeekplannerWeek,
  state: ListOperationalFilterState,
): WeekplannerWeek {
  const hubFiltered = applyPlanningHubFilters(week, state);
  const search = state.search.trim();
  if (!search) return hubFiltered;

  return {
    ...hubFiltered,
    days: hubFiltered.days.map((day) => ({
      ...day,
      items: day.items.filter((item) => listOperationalItemMatchesSearch(item, search)),
    })),
  };
}

export function planningHubFiltersActive(state: Pick<
  PlanningHubUrlState,
  "activity" | "team" | "facility" | "conflictsOnly"
>): boolean {
  return (
    state.activity !== "alle" ||
    !!state.team ||
    !!state.facility ||
    state.conflictsOnly
  );
}

export function listOperationalVisibleItemCount(week: WeekplannerWeek): number {
  return week.days.reduce((sum, day) => sum + day.items.length, 0);
}

export function listOperationalWeekHasAnyItems(week: WeekplannerWeek): boolean {
  return week.days.some((day) => day.items.length > 0);
}

/** Composed filter check for tests — mirrors client pipeline order. */
export function listOperationalItemVisible(
  item: WeekplannerItem,
  state: ListOperationalFilterState,
): boolean {
  if (!filterWeekplannerItem(item, state)) return false;
  return listOperationalItemMatchesSearch(item, state.search);
}
