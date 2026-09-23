import { toLocalDateKey } from "@/lib/publishing/time/temporal-grouping";
import type { PersonalProgrammeItem } from "./personal-programme-types";

/** Tenant-local calendar day key (`yyyy-MM-dd`) for a programme timestamp. */
export function personalProgrammeDayKey(startsAt: Date, timeZone: string): string {
  return toLocalDateKey(startsAt, timeZone);
}

export function groupPersonalProgrammeItemsByDay(
  items: PersonalProgrammeItem[],
  timeZone: string,
): Map<string, PersonalProgrammeItem[]> {
  const map = new Map<string, PersonalProgrammeItem[]>();
  for (const item of items) {
    const key = personalProgrammeDayKey(item.startsAt, timeZone);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
