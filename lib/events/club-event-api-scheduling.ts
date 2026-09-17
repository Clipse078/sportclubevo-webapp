/**
 * Shared API-layer parsing for Veranstaltung schedule payloads (POST/PATCH).
 */

import {
  ClubEventScheduleError,
  clubEventScheduleFormFromPersisted,
  parseClubEventScheduleInput,
  type ClubEventScheduleFormInput,
  type ParsedClubEventSchedule,
} from "@/lib/events/club-event-scheduling";
import {
  parseTenantLocalDateTimeInput,
  resolveTenantEventTimezone,
} from "@/lib/events/tenant-local-datetime";

export { ClubEventScheduleError };

export type ClubEventScheduleApiBody = {
  allDay?: boolean;
  startAt?: string;
  endAt?: string | null;
  startDate?: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export function mergeClubEventScheduleApiBody(
  body: ClubEventScheduleApiBody,
  existing: { allDay: boolean; startAt: Date; endAt: Date | null },
  timeZone: string | null | undefined,
): ClubEventScheduleFormInput {
  const tz = resolveTenantEventTimezone(timeZone);
  const base = clubEventScheduleFormFromPersisted(existing, tz);

  let startDate = body.startDate?.trim() || base.startDate;
  let startTime = body.startTime === null ? null : body.startTime?.trim() || base.startTime;
  let endDate =
    body.endDate === null ? base.startDate : body.endDate?.trim() || base.endDate;
  let endTime = body.endTime === null ? null : body.endTime?.trim() || base.endTime;

  if (body.startAt?.trim()) {
    const parsed = parseTenantLocalDateTimeInput(body.startAt, tz);
    if (parsed) {
      startDate = zonedDateKeyFromBodyStart(body.startAt, tz);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(parsed);
      const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      const hour = values.hour === "24" ? "00" : values.hour;
      startTime = `${hour}:${values.minute}`;
    }
  }

  if (body.endAt === null) {
    endTime = null;
    endDate = null;
  } else if (body.endAt?.trim()) {
    const parsedEnd = parseTenantLocalDateTimeInput(body.endAt, tz);
    if (parsedEnd) {
      endDate = zonedDateKeyFromBodyStart(body.endAt, tz);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(parsedEnd);
      const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      const hour = values.hour === "24" ? "00" : values.hour;
      endTime = `${hour}:${values.minute}`;
    }
  }

  return {
    allDay: body.allDay !== undefined ? Boolean(body.allDay) : base.allDay,
    startDate,
    endDate,
    startTime,
    endTime,
  };
}

export function parseClubEventScheduleFromApiBody(
  body: ClubEventScheduleApiBody,
  timeZone: string | null | undefined,
  existing?: { allDay: boolean; startAt: Date; endAt: Date | null } | null,
): ParsedClubEventSchedule {
  const tz = resolveTenantEventTimezone(timeZone);
  const allDay = Boolean(body.allDay);

  if (
    existing ||
    body.startDate?.trim() ||
    body.endDate?.trim() ||
    body.startTime?.trim() ||
    body.endTime?.trim() ||
    allDay
  ) {
    const merged = existing
      ? mergeClubEventScheduleApiBody(body, existing, tz)
      : {
          allDay,
          startDate:
            body.startDate?.trim() ||
            (body.startAt?.trim() ? zonedDateKeyFromBodyStart(body.startAt, tz) : ""),
          endDate: body.endDate ?? null,
          startTime: body.startTime ?? null,
          endTime: body.endTime ?? null,
        };

    if (!merged.startDate) {
      throw new ClubEventScheduleError("Startdatum ist erforderlich.", "startDate");
    }

    return parseClubEventScheduleInput(merged, tz);
  }

  const startAtRaw = String(body.startAt ?? "").trim();
  if (!startAtRaw) {
    throw new ClubEventScheduleError("Startdatum ist erforderlich.", "startAt");
  }

  const startAt = parseTenantLocalDateTimeInput(startAtRaw, tz);
  if (!startAt) {
    throw new ClubEventScheduleError("Startdatum ist ungültig.", "startAt");
  }

  let endAt: Date | null = null;
  if (body.endAt !== null && body.endAt !== undefined && String(body.endAt).trim()) {
    endAt = parseTenantLocalDateTimeInput(String(body.endAt), tz);
    if (!endAt) {
      throw new ClubEventScheduleError("Enddatum ist ungültig.", "endAt");
    }
    if (endAt.getTime() <= startAt.getTime()) {
      throw new ClubEventScheduleError("Ende muss nach dem Beginn liegen.", "endAt");
    }
  }

  return { allDay: false, startAt, endAt };
}

function zonedDateKeyFromBodyStart(raw: string, timeZone: string): string {
  const parsed = parseTenantLocalDateTimeInput(raw, timeZone);
  if (!parsed) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
