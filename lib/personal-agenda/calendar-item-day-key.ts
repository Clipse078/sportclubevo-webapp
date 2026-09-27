import { personalProgrammeDayKey } from "./programme-day-key";
import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";

/** Tenant-local calendar day key for any normalized personal calendar item. */
export function normalizedCalendarItemDayKey(
  item: NormalizedCalendarItem,
  timeZone: string,
): string {
  return personalProgrammeDayKey(item.startAt, timeZone);
}

export function groupNormalizedCalendarItemsByDay(
  items: NormalizedCalendarItem[],
  timeZone: string,
): Map<string, NormalizedCalendarItem[]> {
  const map = new Map<string, NormalizedCalendarItem[]>();
  for (const item of items) {
    const key = normalizedCalendarItemDayKey(item, timeZone);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
