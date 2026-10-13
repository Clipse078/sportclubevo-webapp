import type {
  ClubEventMonthOrdinal,
  ClubEventMonthlyPatternKind,
  ClubEventRecurrenceEndMode,
  ClubEventRecurrenceFrequency,
  Weekday,
} from "@prisma/client";

export const MAX_CLUB_EVENT_SERIES_OCCURRENCES = 104;

export type ClubEventRecurrenceRule = {
  frequency: ClubEventRecurrenceFrequency;
  intervalCount: number;
  weekday: Weekday | null;
  monthlyPatternKind: ClubEventMonthlyPatternKind | null;
  monthDay: number | null;
  monthOrdinal: ClubEventMonthOrdinal | null;
  allDay: boolean;
  startsAtTime: string | null;
  endsAtTime: string | null;
  timezone: string;
  seriesStartDateKey: string;
  endMode: ClubEventRecurrenceEndMode;
  endDateKey: string | null;
  occurrenceCountLimit: number | null;
};

export type GeneratedClubEventOccurrence = {
  dateKey: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
};
