import type { CalendarItemSemanticType } from "./normalized-calendar-item-types";
import type { PersonalProgrammeSourceType } from "./personal-programme-types";

const MAP: Partial<Record<CalendarItemSemanticType, PersonalProgrammeSourceType>> = {
  TRAINING: "TRAINING",
  MATCH: "MATCH",
  TOURNAMENT: "TOURNAMENT",
  EVENT: "EVENT",
  MEETING: "MEETING",
};

export function mapCalendarSemanticTypeToProgrammeSource(
  semanticType: CalendarItemSemanticType,
): PersonalProgrammeSourceType | null {
  return MAP[semanticType] ?? null;
}
