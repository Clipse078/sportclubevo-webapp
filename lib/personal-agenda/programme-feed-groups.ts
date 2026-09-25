import { format } from "date-fns";
import { de, enUS, fr, it } from "date-fns/locale";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import { startOfLocalDay } from "@/lib/tasks/management-deadline";
import { sortPersonalProgrammeItems } from "./programme-sort";
import type { PersonalProgrammeItem } from "./personal-programme-types";
import { personalProgrammeDayKey } from "./programme-day-key";
import type { PersonalProgrammeRange } from "./programme-range";

export type ProgrammeFeedGroupLabelKind = "today" | "tomorrow" | "date";

export type ProgrammeFeedGroup = {
  dayKey: string;
  labelKind: ProgrammeFeedGroupLabelKind;
  /** Locale-formatted heading when labelKind is `date`. */
  dateLabel?: string;
  items: PersonalProgrammeItem[];
};

const LOCALE_MAP: Record<string, Locale> = {
  de: de,
  "de-CH": de,
  en: enUS,
  "en-US": enUS,
  fr: fr,
  "fr-CH": fr,
  it: it,
  "it-CH": it,
};

type Locale = typeof de;

function resolveDateFnsLocale(locale: string): Locale {
  const base = locale.split("-")[0] ?? locale;
  return LOCALE_MAP[locale] ?? LOCALE_MAP[base] ?? de;
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function filterProgrammeItemsToRange(
  items: PersonalProgrammeItem[],
  range: PersonalProgrammeRange,
): PersonalProgrammeItem[] {
  const start = range.rangeStart.getTime();
  const end = range.rangeEnd.getTime();
  return items.filter((item) => {
    const ts = item.startsAt.getTime();
    return ts >= start && ts <= end;
  });
}

/**
 * Groups programme rows for Mein Programm (chronological day sections).
 * Uses tenant-local day keys; labels are resolved client-side via i18n for today/tomorrow.
 */
export function buildProgrammeFeedGroups(input: {
  items: PersonalProgrammeItem[];
  timeZone: string;
  locale: string;
  now?: Date;
}): ProgrammeFeedGroup[] {
  const now = input.now ?? new Date();
  const todayKey = matchDayKeyInTimezone(now, input.timeZone);
  const tomorrowRef = addUtcDays(startOfLocalDay(now, input.timeZone), 1);
  const tomorrowKey = matchDayKeyInTimezone(tomorrowRef, input.timeZone);
  const dateFnsLocale = resolveDateFnsLocale(input.locale);

  const byDay = new Map<string, PersonalProgrammeItem[]>();
  for (const item of sortPersonalProgrammeItems(input.items)) {
    const key = personalProgrammeDayKey(item.startsAt, input.timeZone);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  const dayKeys = [...byDay.keys()].sort();
  return dayKeys.map((dayKey) => {
    let labelKind: ProgrammeFeedGroupLabelKind = "date";
    let dateLabel: string | undefined;

    if (dayKey === todayKey) {
      labelKind = "today";
    } else if (dayKey === tomorrowKey) {
      labelKind = "tomorrow";
    } else {
      const ref = getDayWindow(dayKey).start;
      dateLabel = format(ref, "EEEE, d. MMMM", { locale: dateFnsLocale });
    }

    return {
      dayKey,
      labelKind,
      dateLabel,
      items: sortPersonalProgrammeItems(byDay.get(dayKey) ?? []),
    };
  });
}

/** Dashboard Mein Programm preview cap (presentation only; full universe stays loaded). */
export const DASHBOARD_PROGRAMME_PREVIEW_ITEM_LIMIT = 3;

/** SCE-VISUAL-05 cockpit card preview cap (presentation only). */
export const DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT = 5;

/**
 * Limits grouped feed rows to the first N upcoming items in canonical day order.
 * Does not alter the underlying programme loader or calendar dataset.
 */
export function limitProgrammeFeedGroupsToPreview(
  groups: ProgrammeFeedGroup[],
  limit = DASHBOARD_PROGRAMME_PREVIEW_ITEM_LIMIT,
): ProgrammeFeedGroup[] {
  if (limit <= 0) return [];
  let remaining = limit;
  const preview: ProgrammeFeedGroup[] = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    const items = group.items.slice(0, remaining);
    if (items.length === 0) continue;
    remaining -= items.length;
    preview.push({ ...group, items });
  }
  return preview;
}

export function defaultProgrammeFeedDayKeys(now: Date, timeZone: string): {
  todayKey: string;
  tomorrowKey: string;
} {
  const todayKey = matchDayKeyInTimezone(now, timeZone);
  const tomorrowDay = formatIsoDay(
    addUtcDays(startOfLocalDay(now, timeZone), 1),
  );
  return { todayKey, tomorrowKey: tomorrowDay };
}
