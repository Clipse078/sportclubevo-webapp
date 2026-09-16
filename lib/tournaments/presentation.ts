/**
 * lib/tournaments/presentation.ts
 *
 * Shared date/time formatting for Tournament Center list rows.
 */

import { getTournamentEffectiveEndAt } from "./operational-state";

export type TournamentDatePresentation = {
  weekdayShort: string;
  day: string;
  monthShort: string;
  timeLabel: string;
};

export function formatTournamentDatePresentation(
  startAt: string,
  endAt: string | null,
  locale: string,
  timeZone: string,
): TournamentDatePresentation {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : getTournamentEffectiveEndAt({ startAt, endAt });

  const weekdayShort = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone,
  })
    .format(start)
    .replace(/\.$/, "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    timeZone,
  }).format(start);

  const monthShort = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone,
  })
    .format(start)
    .replace(/\.$/, "")
    .toUpperCase();

  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });

  const startTime = timeFmt.format(start);
  const endTime = timeFmt.format(end);
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(start) ===
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(end);

  const timeLabel =
    endAt && sameDay && startTime !== endTime ? `${startTime}–${endTime}` : startTime;

  return { weekdayShort, day, monthShort, timeLabel };
}

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SCHEDULED: "Geplant",
  LIVE: "Live",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
  POSTPONED: "Verschoben",
  ARCHIVED: "Archiviert",
};
