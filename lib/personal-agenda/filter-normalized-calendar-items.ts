import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";
import { normalizedCalendarItemToProgrammeItem } from "./normalize-calendar-item";
import {
  filterPersonalProgrammeItems,
  type PersonalProgrammeClientFilters,
  personalProgrammeFiltersActive,
} from "./filter-personal-programme-items";
import { groupNormalizedCalendarItemsByDay } from "./calendar-item-day-key";

export function filterNormalizedCalendarItemsForProgrammeFilters(
  items: NormalizedCalendarItem[],
  filters: PersonalProgrammeClientFilters,
  timeZone: string,
): NormalizedCalendarItem[] {
  if (!personalProgrammeFiltersActive(filters)) return items;

  return items.filter((item) => {
    if (item.semanticType === "TASK") return true;
    const programme = normalizedCalendarItemToProgrammeItem(item);
    if (!programme) return false;
    return filterPersonalProgrammeItems([programme], filters).length > 0;
  });
}

export function recordFromFilteredCalendarItems(
  items: NormalizedCalendarItem[],
  timeZone: string,
): Record<string, NormalizedCalendarItem[]> {
  const out: Record<string, NormalizedCalendarItem[]> = {};
  for (const [key, list] of groupNormalizedCalendarItemsByDay(items, timeZone)) {
    out[key] = list;
  }
  return out;
}
