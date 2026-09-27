import type { CalendarItemSemanticType, NormalizedCalendarItem } from "./normalized-calendar-item-types";

const MARKER_ORDER: CalendarItemSemanticType[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "EVENT",
  "MEETING",
  "TASK",
];

/** Up to three semantic markers for compact mobile day cells (deterministic order). */
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
