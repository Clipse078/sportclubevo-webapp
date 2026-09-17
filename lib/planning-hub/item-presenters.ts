import {
  formatClubEventTimingLabel,
  formatClubEventListDateColumn,
} from "@/lib/events/club-event-scheduling";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export function weekplannerActivityTypeLabel(type: WeekplannerItem["type"]): string {
  switch (type) {
    case "TRAINING":
      return "Training";
    case "MATCH":
      return "Spiel";
    case "TOURNAMENT":
      return "Turnier";
    case "VERANSTALTUNG":
      return "Veranstaltung";
    default:
      return type;
  }
}

export function weekplannerPrimaryLabel(item: WeekplannerItem): string {
  if (item.type === "MATCH" && item.opponentName) {
    return `${item.teamNames[0] ?? item.title} vs. ${item.opponentName}`;
  }
  if (item.type === "TRAINING") return item.teamNames[0] ?? item.title;
  return item.title;
}

export function weekplannerTeamLine(item: WeekplannerItem): string | null {
  if (item.type === "TRAINING") return item.title;
  if (item.teamNames.length > 0) return item.teamNames.join(", ");
  return null;
}

export function weekplannerResourceSummary(item: WeekplannerItem, max = 3): string {
  const names: string[] = [];
  for (const ref of item.pitchAllocations) names.push(ref.name);
  for (const ref of item.dressingRoomAllocations) names.push(ref.name);
  if (item.type === "MATCH") {
    for (const ref of item.awayDressingRoomAllocations) names.push(ref.name);
  }
  const unique = [...new Set(names)];
  if (unique.length === 0) return "";
  if (unique.length <= max) return unique.join(" · ");
  return `${unique.slice(0, max).join(" · ")} +${unique.length - max}`;
}

export function weekplannerTimeColumnLabel(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
  contextDayKey?: string,
): string {
  if (item.type === "VERANSTALTUNG" && item.allDay) {
    return formatClubEventListDateColumn(
      {
        allDay: true,
        startAt: item.startAt,
        endAt: item.endAt,
        contextDayKey,
      },
      locale,
      timeZone,
    );
  }
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(item.startAt)}–${fmt.format(item.endAt)}`;
}

export function weekplannerTimingDetail(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): string {
  if (item.type === "VERANSTALTUNG") {
    return formatClubEventTimingLabel(
      { allDay: item.allDay, startAt: item.startAt, endAt: item.endAt },
      locale,
      timeZone,
    );
  }
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(item.startAt)}–${fmt.format(item.endAt)}`;
}

export function weekplannerAccessibleName(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): string {
  const time =
    item.type === "VERANSTALTUNG" && item.allDay
      ? "Ganztägig"
      : `${new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(item.startAt)} bis ${new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(item.endAt)}`;
  const resources = weekplannerResourceSummary(item, 5);
  const type = weekplannerActivityTypeLabel(item.type);
  const label = weekplannerPrimaryLabel(item);
  const parts = [label, type, time];
  if (resources) parts.push(resources);
  if (item.conflicts.length > 0) parts.push("Planungskonflikt");
  return parts.join(", ");
}

export function itemHasCanonicalConflictOnResource(
  item: WeekplannerItem,
  facilityResourceId: string,
): boolean {
  return item.conflicts.some((c) => c.facilityResourceId === facilityResourceId);
}

export function itemHasCanonicalConflict(item: WeekplannerItem): boolean {
  return item.conflicts.length > 0;
}
