import { formatTime, type TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";

/** Server-side time labels for personal calendar event blocks (tenant-local). */
export function buildCalendarTimeLabelById(
  items: readonly NormalizedCalendarItem[],
  fmtCfg: TenantFormatConfig,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    if (item.allDay) {
      map[item.id] = "";
    } else {
      map[item.id] = formatTime(item.startAt, fmtCfg);
    }
  }
  return map;
}
