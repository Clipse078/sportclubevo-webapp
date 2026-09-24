import { personalProgrammeDayKey } from "./programme-day-key";

/**
 * Derives inclusive UTC-midnight [dateFrom, dateTo] bounds for listTrainingSessions()
 * from a personal programme instant window and tenant timezone.
 */
export function resolveTrainingSessionDateBoundsForProgrammeRange(input: {
  rangeStart: Date;
  rangeEnd: Date;
  timeZone: string;
}): { dateFrom: Date; dateTo: Date } {
  const fromKey = personalProgrammeDayKey(input.rangeStart, input.timeZone);
  const toKey = personalProgrammeDayKey(input.rangeEnd, input.timeZone);
  return {
    dateFrom: new Date(`${fromKey}T00:00:00.000Z`),
    dateTo: new Date(`${toKey}T00:00:00.000Z`),
  };
}
