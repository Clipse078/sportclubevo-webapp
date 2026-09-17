/**
 * TRAININGS-UX-02 — schedule display helpers (pure, no I/O).
 */

/** Formats elapsed minutes between two "HH:mm" times as a compact German label. */
export function formatTrainingSlotDuration(startsAt: string, endsAt: string): string | null {
  const start = parseTimeToMinutes(startsAt);
  const end = parseTimeToMinutes(endsAt);
  if (start === null || end === null || end <= start) return null;

  const total = end - start;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return hours === 1 ? "1 h" : `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}
