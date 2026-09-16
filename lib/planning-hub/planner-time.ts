export function isoToLocalTime(iso: Date | string, timeZone: string): string {
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

export function combineTimeWithReferenceDay(
  time: string,
  referenceIso: Date | string,
  timeZone: string,
): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const [, hh, mm] = match;
  const reference = typeof referenceIso === "string" ? referenceIso : referenceIso.toISOString();
  const dayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(reference));
  const year = dayParts.find((p) => p.type === "year")?.value;
  const month = dayParts.find((p) => p.type === "month")?.value;
  const day = dayParts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return null;
  const naiveUtcGuess = new Date(`${year}-${month}-${day}T${hh}:${mm}:00.000Z`);
  const zonedFormat = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const shownAsIfUtc = zonedFormat.format(naiveUtcGuess);
  const [shownHour, shownMinute] = shownAsIfUtc.replace(/^24:/, "00:").split(":").map(Number);
  const targetMinutes = Number(hh) * 60 + Number(mm);
  const shownMinutes = shownHour * 60 + shownMinute;
  const diffMinutes = targetMinutes - shownMinutes;
  return new Date(naiveUtcGuess.getTime() + diffMinutes * 60_000).toISOString();
}
