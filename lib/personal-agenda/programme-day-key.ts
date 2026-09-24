import { toLocalDateKey } from "@/lib/publishing/time/temporal-grouping";
import type { PersonalProgrammeItem } from "./personal-programme-types";

/** Coerce RSC-serialized ISO strings back to instants for client-side grouping. */
export function coerceProgrammeInstant(startsAt: Date | string): Date {
  if (startsAt instanceof Date && !Number.isNaN(startsAt.getTime())) {
    return startsAt;
  }
  const parsed = new Date(startsAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid programme timestamp: ${String(startsAt)}`);
  }
  return parsed;
}

/** Tenant-local calendar day key (`yyyy-MM-dd`) for a programme timestamp. */
export function personalProgrammeDayKey(startsAt: Date | string, timeZone: string): string {
  return toLocalDateKey(coerceProgrammeInstant(startsAt), timeZone);
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
