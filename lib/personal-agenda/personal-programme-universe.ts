import type { PersonalContext } from "@/lib/dashboard/personal-context";
import {
  getPersonallyRelevantTeamIds,
  getPersonallyRelevantTeamSeasonIds,
  isPersonalTeamEventRowRelevant,
  type PersonalTeamEventRelevanceRow,
} from "@/lib/dashboard/personal-context";
import type { PersonalProgrammeItem } from "./personal-programme-types";
import { groupPersonalProgrammeItemsByDay } from "./programme-day-key";

/** Programme/calendar parity: calendar markers are projections of this item id set only. */
export function collectPersonalProgrammeItemIds(
  items: readonly PersonalProgrammeItem[],
): Set<string> {
  return new Set(items.map((item) => item.id));
}

export function collectPersonalProgrammeCalendarDayKeys(
  items: readonly PersonalProgrammeItem[],
  timeZone: string,
): Set<string> {
  return new Set(groupPersonalProgrammeItemsByDay([...items], timeZone).keys());
}

/**
 * Calendar activity for a month must not reference programme ids outside the loaded universe.
 */
export function assertPersonalProgrammeCalendarParity(input: {
  programmeItems: readonly PersonalProgrammeItem[];
  calendarItems: readonly PersonalProgrammeItem[];
  timeZone: string;
}): void {
  const universe = collectPersonalProgrammeItemIds(input.programmeItems);
  for (const item of input.calendarItems) {
    if (!universe.has(item.id)) {
      throw new Error(
        `Personal calendar item ${item.id} is outside the canonical programme universe`,
      );
    }
  }

  const programmeDays = collectPersonalProgrammeCalendarDayKeys(
    input.programmeItems,
    input.timeZone,
  );
  const calendarDays = collectPersonalProgrammeCalendarDayKeys(
    input.calendarItems,
    input.timeZone,
  );
  for (const dayKey of calendarDays) {
    if (!programmeDays.has(dayKey)) {
      throw new Error(
        `Personal calendar day ${dayKey} has activity outside the programme universe`,
      );
    }
  }
}

export function buildPersonalTeamEventQueryScope(context: PersonalContext): {
  teamIds: string[];
  teamSeasonIds: string[];
} {
  return {
    teamIds: getPersonallyRelevantTeamIds(context),
    teamSeasonIds: getPersonallyRelevantTeamSeasonIds(context),
  };
}

export type PersonalTeamEventCandidateRow = PersonalTeamEventRelevanceRow & {
  id: string;
};

export function filterPersonalTeamEventCandidates<T extends PersonalTeamEventCandidateRow>(
  context: PersonalContext,
  candidates: readonly T[],
): T[] {
  const teamIds = getPersonallyRelevantTeamIds(context);
  if (teamIds.length === 0) {
    return [];
  }
  return candidates.filter((event) => isPersonalTeamEventRowRelevant(context, event));
}
