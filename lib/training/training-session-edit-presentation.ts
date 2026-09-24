/**
 * TRAININGCENTER-UX-03 — compact header copy for the single-session edit workspace.
 * Pure presentation (no I/O).
 */

import type { TrainingSessionDto } from "@/lib/training/types";

/** Page title: prefer the series/session title without duplicating tenant + team in one line. */
export function buildTrainingSessionEditPageTitle(
  teamName: string,
  trainingSeriesTitle: string,
): string {
  const series = trainingSeriesTitle.trim();
  if (series.length > 0) return series;
  const team = teamName.trim();
  return team.length > 0 ? `${team} Training` : "Training";
}

export function formatTrainingSessionEditCompactDate(
  date: string,
  locale: string,
  timezone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function formatTrainingSessionEditScheduleContext(input: {
  teamName: string;
  date: string;
  startTime: string;
  endTime: string;
  locale: string;
  timezone: string;
}): string {
  const dateLabel = formatTrainingSessionEditCompactDate(input.date, input.locale, input.timezone);
  const team = input.teamName.trim();
  const time = `${input.startTime}–${input.endTime}`;
  return team ? `${team} · ${dateLabel} · ${time}` : `${dateLabel} · ${time}`;
}

export function formatTrainingSessionEditLongDate(
  date: string,
  locale: string,
  timezone: string,
): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(parsed);
}

export function formatTrainingSessionEditSeriesStandardLine(input: {
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  locale: string;
  timezone: string;
}): string {
  const dateShort = new Intl.DateTimeFormat(input.locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: input.timezone,
  }).format(new Date(`${input.originalDate}T12:00:00.000Z`));
  return `${dateShort} · ${input.originalStartTime}–${input.originalEndTime}`;
}

export function pickTrainingSessionEditPresentation(session: Pick<
  TrainingSessionDto,
  "teamName" | "trainingSeriesTitle" | "date" | "timezone"
> & {
  startTime: string;
  endTime: string;
  locale: string;
}) {
  return {
    pageTitle: buildTrainingSessionEditPageTitle(session.teamName, session.trainingSeriesTitle),
    scheduleContext: formatTrainingSessionEditScheduleContext({
      teamName: session.teamName,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      locale: session.locale,
      timezone: session.timezone,
    }),
  };
}
