import type { PlayerReleaseStatus } from "@prisma/client";
import { calendarDateKeyTodayInTimezone } from "@/lib/training/session-generation-date-boundary";

export type PlayerReleaseDisplayPhase =
  | "REVOKED"
  | "EXPIRED"
  | "UPCOMING"
  | "ACTIVE"
  | "EXPIRING_SOON";

export type PlayerReleaseDisplayState = {
  phase: PlayerReleaseDisplayPhase;
  label: string;
};

function dateKeyFromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function resolvePlayerReleaseDisplayState(input: {
  status: PlayerReleaseStatus;
  validFrom: Date;
  validUntil: Date;
  timezone: string;
  now?: Date;
}): PlayerReleaseDisplayState {
  if (input.status === "REVOKED") {
    return { phase: "REVOKED", label: "Widerrufen" };
  }

  const todayKey = calendarDateKeyTodayInTimezone(input.timezone, input.now ?? new Date());
  const fromKey = dateKeyFromDbDate(input.validFrom);
  const untilKey = dateKeyFromDbDate(input.validUntil);

  if (untilKey < todayKey) {
    return { phase: "EXPIRED", label: "Abgelaufen" };
  }

  if (fromKey > todayKey) {
    return { phase: "UPCOMING", label: "Gültig ab" };
  }

  const untilMs = new Date(`${untilKey}T12:00:00.000Z`).getTime();
  const todayMs = new Date(`${todayKey}T12:00:00.000Z`).getTime();
  const daysLeft = Math.round((untilMs - todayMs) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 7) {
    return { phase: "EXPIRING_SOON", label: "Läuft bald ab" };
  }

  return { phase: "ACTIVE", label: "Aktiv" };
}

export function isPlayerReleaseOperationallyActive(input: {
  status: PlayerReleaseStatus;
  validFrom: Date;
  validUntil: Date;
  timezone: string;
  now?: Date;
}): boolean {
  const display = resolvePlayerReleaseDisplayState(input);
  return display.phase === "ACTIVE" || display.phase === "EXPIRING_SOON";
}

export function dateRangesOverlap(
  aFrom: Date,
  aUntil: Date,
  bFrom: Date,
  bUntil: Date,
): boolean {
  const aStart = dateKeyFromDbDate(aFrom);
  const aEnd = dateKeyFromDbDate(aUntil);
  const bStart = dateKeyFromDbDate(bFrom);
  const bEnd = dateKeyFromDbDate(bUntil);
  return aStart <= bEnd && bStart <= aEnd;
}
