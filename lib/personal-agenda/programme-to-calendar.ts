import type { PersonalAgendaSourceType, PersonalCalendarItem } from "./types";
import type { PersonalProgrammeItem, PersonalProgrammeSourceType } from "./personal-programme-types";

function programmeSourceToCalendarSource(
  sourceType: PersonalProgrammeSourceType,
): PersonalAgendaSourceType {
  if (sourceType === "MEETING") return "MEETING";
  return sourceType;
}

export function personalProgrammeItemToCalendarItem(item: PersonalProgrammeItem): PersonalCalendarItem {
  return {
    id: item.id,
    sourceType: programmeSourceToCalendarSource(item.sourceType),
    title: item.title,
    startAt: item.startsAt,
    endAt: item.endsAt,
    allDay: item.allDay,
    href: item.deepLink,
    typeLabel: item.typeLabel,
    subtitle: item.subtitle,
    eventType: item.eventType,
    contextLabel: item.contextLabel,
    ariaLabel: item.ariaLabel,
    venue: item.venue,
    presentationStatus: item.status,
    teamName: item.teamName,
    opponentName: item.opponentName,
    homeAway: item.homeAway,
  };
}

export function personalProgrammeItemsToCalendarItems(
  items: PersonalProgrammeItem[],
): PersonalCalendarItem[] {
  return items.map(personalProgrammeItemToCalendarItem);
}

/** Programme event sources in calendar filter terms (legacy + canonical). */
export const PERSONAL_PROGRAMME_CALENDAR_SOURCE_TYPES: PersonalAgendaSourceType[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "EVENT",
  "MEETING",
  "TEAM_EVENT",
];

export function isPersonalProgrammeCalendarItem(item: PersonalCalendarItem): boolean {
  return PERSONAL_PROGRAMME_CALENDAR_SOURCE_TYPES.includes(item.sourceType);
}
