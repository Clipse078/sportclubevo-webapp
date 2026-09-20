import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";

export function parseMonthParam(param: string | undefined, fallback: Date): Date {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }
  const [y, m] = param.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1);
}

export function formatMonthParam(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

/** Visible grid range for a month calendar (Mon–Sun weeks). */
export function getPersonalKalenderVisibleRange(monthStart: Date): {
  rangeStart: Date;
  rangeEnd: Date;
} {
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return { rangeStart: gridStart, rangeEnd: gridEnd };
}
