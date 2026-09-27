import { buildMonthGridCells } from "@/lib/calendar/month-grid";
import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";

/**
 * Deterministic initial selected day for month workspace (mobile agenda + selection state).
 * - Current month: today when it appears in the grid month cells
 * - Other months: first in-month day with items, else first in-month day
 */
export function resolvePersonalCalendarSelectedDayKey(args: {
  monthParam: string;
  timeZone: string;
  todayKey: string;
  itemsByDayKey: Record<string, NormalizedCalendarItem[]>;
}): string {
  const cells = buildMonthGridCells(args.monthParam, args.timeZone);
  const inMonthCells = cells.filter((cell) => cell.inMonth);
  if (inMonthCells.length === 0) {
    return args.todayKey;
  }

  const viewingToday = inMonthCells.some((cell) => cell.dayKey === args.todayKey);
  if (viewingToday) {
    return args.todayKey;
  }

  for (const cell of inMonthCells) {
    const count = args.itemsByDayKey[cell.dayKey]?.length ?? 0;
    if (count > 0) {
      return cell.dayKey;
    }
  }

  return inMonthCells[0]!.dayKey;
}
