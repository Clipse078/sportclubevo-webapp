/**
 * Canonical SCE activity creation date/time parsing & formatting.
 * Wall-clock values stay tenant-local until domain boundaries call tenant-local-datetime.
 */

const ISO_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_LOCAL_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
const DISPLAY_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export type SceActivityDateParseResult =
  | { ok: true; isoDateKey: string; display: string }
  | { ok: false; error: string };

export type SceActivityTimeParseResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function formatIsoDateKeyToDisplay(isoDateKey: string): string {
  const match = isoDateKey.match(ISO_DATE_KEY_RE);
  if (!match) {
    return isoDateKey;
  }
  const [, y, m, d] = match;
  return `${d}.${m}.${y}`;
}

export function parseDisplayDateInput(raw: string): SceActivityDateParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Bitte ein Datum eingeben." };
  }

  const displayMatch = trimmed.match(DISPLAY_DATE_RE);
  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year = Number(displayMatch[3]);
    if (!isValidCalendarDate(year, month, day)) {
      return { ok: false, error: "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben." };
    }
    const isoDateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { ok: true, isoDateKey, display: formatIsoDateKeyToDisplay(isoDateKey) };
  }

  if (ISO_DATE_KEY_RE.test(trimmed)) {
    const [, y, m, d] = trimmed.match(ISO_DATE_KEY_RE)!;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (!isValidCalendarDate(year, month, day)) {
      return { ok: false, error: "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben." };
    }
    return { ok: true, isoDateKey: trimmed, display: formatIsoDateKeyToDisplay(trimmed) };
  }

  return { ok: false, error: "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben." };
}

export function normalizeTimeInput(raw: string): SceActivityTimeParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Bitte eine Zeit eingeben." };
  }

  const colonMatch = trimmed.match(TIME_RE);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (!isValidTime(hour, minute)) {
      return { ok: false, error: "Bitte eine gültige Startzeit im Format HH:MM eingeben." };
    }
    return {
      ok: true,
      normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 3 || digits.length === 4) {
    const hour = Number(digits.slice(0, digits.length - 2));
    const minute = Number(digits.slice(-2));
    if (!isValidTime(hour, minute)) {
      return { ok: false, error: "Bitte eine gültige Zeit im Format HH:MM eingeben." };
    }
    return {
      ok: true,
      normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    const hour = Number(trimmed);
    if (hour < 0 || hour > 23) {
      return { ok: false, error: "Bitte eine gültige Zeit im Format HH:MM eingeben." };
    }
    return { ok: true, normalized: `${String(hour).padStart(2, "0")}:00` };
  }

  return { ok: false, error: "Bitte eine gültige Zeit im Format HH:MM eingeben." };
}

export function combineIsoDateAndTimeToDateTimeLocal(isoDateKey: string, time: string): string {
  return `${isoDateKey}T${time}`;
}

export function splitDateTimeLocalValue(value: string): { isoDateKey: string; time: string } | null {
  const trimmed = value.trim();
  const match = trimmed.match(DATETIME_LOCAL_RE);
  if (!match) {
    return null;
  }
  return { isoDateKey: match[1], time: match[2] };
}

export function compareWallClockRange(input: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): { ok: true } | { ok: false; error: string } {
  const startKey = `${input.startDate}T${input.startTime}`;
  const endKey = `${input.endDate}T${input.endTime}`;
  if (endKey <= startKey) {
    return { ok: false, error: "Endzeit muss nach der Startzeit liegen." };
  }
  return { ok: true };
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTime(hour: number, minute: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
