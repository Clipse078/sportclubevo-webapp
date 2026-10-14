import type { WeekplannerItem } from "@/lib/weekplanner/types";

function formatTime(value: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(value);
}

function formatTimeRange(startAt: Date, endAt: Date, locale: string, timeZone: string): string {
  const start = formatTime(startAt, locale, timeZone);
  const end = formatTime(endAt, locale, timeZone);
  return start === end ? start : `${start} – ${end}`;
}

export function isWeekplannerItemPlanOverridden(item: WeekplannerItem): boolean {
  const resourceOverridden =
    item.pitchOverridden ||
    item.dressingRoomOverridden ||
    (item.type === "TOURNAMENT" &&
      item.participantAllocations.some((participant) => participant.dressingRoomOverridden));
  return item.timeOverridden || resourceOverridden;
}

export function formatWeekplannerStandardPlanSummary(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): string {
  const parts = [formatTimeRange(item.canonicalStartAt, item.canonicalEndAt, locale, timeZone)];
  for (const ref of item.canonicalPitchAllocations) {
    parts.push(ref.name);
  }
  for (const ref of item.canonicalDressingRoomAllocations) {
    parts.push(ref.name);
  }
  return parts.join(" · ");
}
