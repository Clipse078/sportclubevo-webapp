/** Shared local date/time helpers for Wochenplaner activity editors (R8A). */

export function isoToLocalTime(iso: Date | string, timeZone = "Europe/Zurich"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function isoToLocalDate(iso: Date | string, tz: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function localToUtcIso(date: string, time: string, tz: string): string | null {
  if (!date || !time) return null;
  try {
    const local = `${date}T${time}:00`;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(`${local}Z`));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    const utcGuess = new Date(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    const offset = new Date(`${local}Z`).getTime() - utcGuess.getTime();
    return new Date(new Date(`${local}Z`).getTime() + offset).toISOString();
  } catch {
    return null;
  }
}

export function formatLocalDateLong(iso: Date | string, tz: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
