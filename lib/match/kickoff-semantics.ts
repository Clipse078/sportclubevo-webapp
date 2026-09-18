import { SFV_PROVIDER_TIME_ZONE } from "@/lib/integrations/sfv/sync/provider-time";

/** German SCE label when a provider-synced fixture has no confirmed kickoff time. */
export const SCE_UNKNOWN_KICKOFF_TIME_LABEL = "Zeit offen";

const PROVIDER_SOURCES_WITH_MIDNIGHT_PLACEHOLDER = new Set([
  "SFV",
  "CLUBCORNER_FVNWS",
  "CSV_EXCEL_IMPORT",
]);

const NAIVE_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

/**
 * SFV ClubCorner schedule/detail `matchDate` values use an offset-less ISO-like
 * string in Europe/Zurich civil time. When the association has fixed the match
 * day but not the kickoff, the provider supplies midnight (`T00:00:00`) as a
 * date-only placeholder — not a real 00:00 Anpfiff (see STAGE inventory: upcoming
 * youth/senior fixtures at 00:00 local with state "noch nicht ausgetragen").
 */
export function isSfvPlaceholderKickoffDateTime(raw: string): boolean {
  const match = NAIVE_DATE_TIME_PATTERN.exec(raw.trim());
  if (!match) return false;
  const hour = match[4];
  const minute = match[5];
  const second = match[6] ?? "00";
  return hour === "00" && minute === "00" && second.startsWith("00");
}

/** True when `date` is exactly local midnight in `timeZone` (hour/minute/second zero). */
export function isLocalMidnightInstant(
  date: Date,
  timeZone: string = SFV_PROVIDER_TIME_ZONE,
): boolean {
  if (Number.isNaN(date.getTime())) return false;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hour = map.hour === "24" ? "00" : map.hour;
  return hour === "00" && map.minute === "00" && map.second === "00";
}

export function isProviderSyncedMatchSource(eventSource: string): boolean {
  return PROVIDER_SOURCES_WITH_MIDNIGHT_PLACEHOLDER.has(eventSource.trim().toUpperCase());
}

/**
 * Provider-synced fixtures whose persisted `startAt` sits at local midnight are
 * treated as date-known / kickoff-unknown until the provider supplies a non-zero
 * wall-clock time. Manual/SCE entries keep literal 00:00 when entered explicitly.
 */
export function isProviderSyncedUnknownKickoff(input: {
  startAt: Date;
  eventSource: string;
  timeZone?: string;
}): boolean {
  if (!isProviderSyncedMatchSource(input.eventSource)) {
    return false;
  }
  return isLocalMidnightInstant(input.startAt, input.timeZone ?? SFV_PROVIDER_TIME_ZONE);
}

export function isKnownKickoffForMatch(input: {
  startAt: Date;
  eventSource: string;
  timeZone?: string;
}): boolean {
  return !isProviderSyncedUnknownKickoff(input);
}
