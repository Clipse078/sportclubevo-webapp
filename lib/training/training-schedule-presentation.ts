/**
 * TRAININGS-UX-02 — schedule display helpers (pure, no I/O).
 */

/** Default wall-clock start for new training slots (create + newly enabled weekdays). */
export const DEFAULT_TRAINING_WALL_CLOCK_START = "17:00";

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

/** Subtle label for tenant/platform standard training duration (not editable). */
export function formatConfiguredTrainingDurationLabel(durationMinutes: number): string {
  return `${durationMinutes} Min.`;
}

/** Adds minutes to a wall-clock "HH:mm" time; returns null when inputs are invalid. */
export function addMinutesToTrainingWallClockTime(startsAt: string, minutes: number): string | null {
  const start = parseTimeToMinutes(startsAt);
  if (start === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const total = start + minutes;
  if (total >= 24 * 60) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}
