import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import type { ProgrammeItem } from "./types";

export function programmeItemDayKey(item: ProgrammeItem, timeZone: string): string {
  return matchDayKeyInTimezone(item.startsAt, timeZone);
}

export function groupProgrammeItemsByDay(
  items: readonly ProgrammeItem[],
  timeZone: string,
): Map<string, ProgrammeItem[]> {
  const map = new Map<string, ProgrammeItem[]>();
  for (const item of items) {
    const key = programmeItemDayKey(item, timeZone);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}
