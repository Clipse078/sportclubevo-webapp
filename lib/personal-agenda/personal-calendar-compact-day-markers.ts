import type { CalendarItemSemanticType, NormalizedCalendarItem } from "./normalized-calendar-item-types";
import { mapCalendarSemanticTypeToProgrammeSource } from "./map-calendar-semantic-to-programme-source";
import { resolvePersonalCalendarDayMarkerSlots } from "./personal-calendar-day-marker-slots";
import type { PersonalProgrammeSourceType } from "./personal-programme-types";

const MARKER_ORDER: CalendarItemSemanticType[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "EVENT",
  "MEETING",
  "TASK",
];

/** @deprecated Distinct-type markers — use resolvePersonalCalendarCompactDayMarkerSlots. */
export function resolvePersonalCalendarCompactDayMarkers(
  items: NormalizedCalendarItem[],
  maxMarkers = 3,
): CalendarItemSemanticType[] {
  const present = new Set<CalendarItemSemanticType>();
  for (const item of items) {
    present.add(item.semanticType);
  }
  const ordered: CalendarItemSemanticType[] = [];
  for (const type of MARKER_ORDER) {
    if (present.has(type)) {
      ordered.push(type);
    }
    if (ordered.length >= maxMarkers) break;
  }
  return ordered;
}

export type PersonalCalendarCompactDayMarkerSlots = {
  markerSlots: PersonalProgrammeSourceType[];
  overflowCount: number;
};

/** Type-aware marker slots for compact personal kalender day cells. */
export function resolvePersonalCalendarCompactDayMarkerSlots(
  items: NormalizedCalendarItem[],
): PersonalCalendarCompactDayMarkerSlots {
  const mappedTypes: PersonalProgrammeSourceType[] = [];
  for (const item of items) {
    const mapped = mapCalendarSemanticTypeToProgrammeSource(item.semanticType);
    if (mapped) mappedTypes.push(mapped);
  }

  const { markerSlots, overflowCount } = resolvePersonalCalendarDayMarkerSlots(
    mappedTypes.length > 0 ? mappedTypes : items.map(() => "MEETING" as const),
    items.length,
  );

  return { markerSlots, overflowCount };
}
