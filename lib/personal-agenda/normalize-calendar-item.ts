import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { getProgrammeSourceActivitySceIconName } from "@/lib/planning/activity-sce-icon";
import type { PersonalCalendarItem } from "./types";
import type {
  PersonalProgrammeItem,
  PersonalProgrammeSourceType,
} from "./personal-programme-types";
import type { CalendarItemSemanticType, NormalizedCalendarItem } from "./normalized-calendar-item-types";

export function parseCalendarResourceIdentity(id: string): { sourceType: string; sourceId: string } {
  const separator = id.indexOf(":");
  if (separator <= 0) {
    return { sourceType: "unknown", sourceId: id };
  }
  return {
    sourceType: id.slice(0, separator),
    sourceId: id.slice(separator + 1),
  };
}

function resolveIconKey(
  semanticType: CalendarItemSemanticType,
): SceIconRegistryName | string | null {
  if (semanticType === "TASK") return "tasks";
  if (semanticType === "EVENT") return "event";
  if (semanticType === "MEETING") return null;
  return getProgrammeSourceActivitySceIconName(semanticType as PersonalProgrammeSourceType);
}

export function normalizePersonalProgrammeItem(item: PersonalProgrammeItem): NormalizedCalendarItem {
  const { sourceType: prefix, sourceId } = parseCalendarResourceIdentity(item.id);
  const semanticType: CalendarItemSemanticType = item.sourceType;

  return {
    id: item.id,
    sourceType: prefix,
    sourceId,
    semanticType,
    title: item.title,
    subtitle: item.subtitle,
    contextLabel: item.contextLabel,
    startAt: item.startsAt,
    endAt: item.endsAt,
    allDay: item.allDay ?? false,
    status: item.status,
    team: item.teamName ? { name: item.teamName } : undefined,
    location: item.venue,
    opponentName: item.opponentName,
    homeAway: item.homeAway,
    deepLink: item.deepLink,
    iconKey: resolveIconKey(semanticType),
    typeLabel: item.typeLabel,
    eventType: item.eventType,
    ariaLabel: item.ariaLabel,
  };
}

export function normalizePersonalTaskCalendarItem(item: PersonalCalendarItem): NormalizedCalendarItem {
  const { sourceType: prefix, sourceId } = parseCalendarResourceIdentity(item.id);

  return {
    id: item.id,
    sourceType: prefix,
    sourceId,
    semanticType: "TASK",
    title: item.title,
    subtitle: item.subtitle,
    contextLabel: item.contextLabel,
    startAt: item.startAt,
    endAt: item.endAt ?? null,
    allDay: item.allDay ?? true,
    status: item.presentationStatus,
    taskStatus: item.taskStatus,
    team: item.teamName ? { name: item.teamName } : undefined,
    location: item.venue,
    opponentName: item.opponentName,
    homeAway: item.homeAway,
    deepLink: item.href ?? null,
    iconKey: resolveIconKey("TASK"),
    typeLabel: item.typeLabel,
    eventType: item.eventType,
    ariaLabel: item.ariaLabel,
  };
}

/** Map normalized programme rows back to the legacy kalender/dashboard programme contract. */
export function normalizedCalendarItemToProgrammeItem(
  item: NormalizedCalendarItem,
): PersonalProgrammeItem | null {
  if (item.semanticType === "TASK") return null;

  return {
    id: item.id,
    sourceType: item.semanticType,
    startsAt: item.startAt,
    endsAt: item.endAt,
    allDay: item.allDay,
    title: item.title,
    subtitle: item.subtitle,
    contextLabel: item.contextLabel,
    venue: item.location,
    status: item.status,
    deepLink: item.deepLink ?? "",
    teamName: item.team?.name,
    opponentName: item.opponentName,
    homeAway: item.homeAway,
    typeLabel: item.typeLabel,
    eventType: item.eventType,
    ariaLabel: item.ariaLabel,
  };
}

/** Map normalized task rows back to the legacy personal calendar task contract. */
export function normalizedCalendarItemToTaskItem(
  item: NormalizedCalendarItem,
): PersonalCalendarItem | null {
  if (item.semanticType !== "TASK") return null;

  return {
    id: item.id,
    sourceType: "TASK",
    title: item.title,
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: item.allDay,
    href: item.deepLink ?? undefined,
    typeLabel: item.typeLabel,
    subtitle: item.subtitle,
    eventType: item.eventType,
    taskStatus: item.taskStatus,
    ariaLabel: item.ariaLabel,
    contextLabel: item.contextLabel,
    venue: item.location,
    presentationStatus: item.status,
    teamName: item.team?.name,
    opponentName: item.opponentName,
    homeAway: item.homeAway,
  };
}
