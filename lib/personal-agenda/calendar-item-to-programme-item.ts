import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";
import type { PersonalProgrammeItem, PersonalProgrammeSourceType } from "./personal-programme-types";

const SPORTING_SEMANTIC_TYPES = new Set<PersonalProgrammeSourceType>([
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
]);

/**
 * Maps calendar agenda rows to programme row props when the compact unified layout applies.
 */
export function calendarItemToProgrammeAgendaItem(
  item: NormalizedCalendarItem,
): PersonalProgrammeItem | null {
  if (!SPORTING_SEMANTIC_TYPES.has(item.semanticType as PersonalProgrammeSourceType)) {
    return null;
  }
  if (!item.activityPresentation) {
    return null;
  }
  if (!item.deepLink) {
    return null;
  }

  return {
    id: item.id,
    sourceType: item.semanticType as PersonalProgrammeSourceType,
    startsAt: item.startAt,
    endsAt: item.endAt,
    allDay: item.allDay,
    title: item.title,
    subtitle: item.subtitle,
    contextLabel: item.contextLabel,
    venue: item.location,
    status: item.status,
    deepLink: item.deepLink,
    teamName: item.team?.name,
    opponentName: item.opponentName,
    homeAway: item.homeAway,
    typeLabel: item.typeLabel,
    eventType: item.eventType,
    ariaLabel: item.ariaLabel,
    activityPresentation: item.activityPresentation,
  };
}
