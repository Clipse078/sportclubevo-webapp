import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";

const SEMANTIC_ORDER: Record<string, number> = {
  TRAINING: 0,
  MATCH: 1,
  TOURNAMENT: 2,
  EVENT: 3,
  MEETING: 4,
  TASK: 5,
};

/**
 * Deterministic personal calendar ordering:
 * startAt ascending → semanticType → stable id.
 */
export function sortNormalizedCalendarItems(
  items: NormalizedCalendarItem[],
): NormalizedCalendarItem[] {
  return [...items].sort((a, b) => {
    const byStart = a.startAt.getTime() - b.startAt.getTime();
    if (byStart !== 0) return byStart;
    const bySemantic =
      (SEMANTIC_ORDER[a.semanticType] ?? 99) - (SEMANTIC_ORDER[b.semanticType] ?? 99);
    if (bySemantic !== 0) return bySemantic;
    return a.id.localeCompare(b.id);
  });
}
