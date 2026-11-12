/**
 * Agenda duration aggregation — pure helpers for workspace UI and tests.
 */

export type AgendaDurationItem = { durationMin?: number | null };

export function sumAgendaPlannedMinutes(items: AgendaDurationItem[]): number {
  return items.reduce((sum, item) => {
    const value = item.durationMin;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return sum;
    return sum + Math.trunc(value);
  }, 0);
}

export function agendaExceedsMeetingPlannedTime(input: {
  agendaTotalMin: number;
  meetingPlannedDurationMin?: number | null;
}): boolean {
  const planned = input.meetingPlannedDurationMin;
  if (typeof planned !== "number" || !Number.isFinite(planned) || planned <= 0) return false;
  return input.agendaTotalMin > planned;
}

export const AGENDA_DURATION_PRESETS_MIN = [5, 10, 15, 20, 30, 45, 60] as const;

export function normalizeAgendaDurationMin(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const truncated = Math.trunc(n);
  return truncated > 0 ? truncated : null;
}
