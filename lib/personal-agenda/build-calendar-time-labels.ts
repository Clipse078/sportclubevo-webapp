import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatCalendarMicroTimeLabel } from "@/lib/calendar/sce-calendar-engine/calendar-micro-time-label";
import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";

/** Server-side time labels for personal calendar event blocks (tenant-local). */
export function buildCalendarTimeLabelById(
  items: readonly NormalizedCalendarItem[],
  fmtCfg: TenantFormatConfig,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    if (item.allDay && item.semanticType !== "TASK") {
      map[item.id] = "";
      continue;
    }
    map[item.id] = formatCalendarMicroTimeLabel({
      allDay: item.allDay,
      startAt: item.startAt,
      endAt: item.endAt,
      fmtCfg,
      semanticKind: item.semanticType === "TASK" ? "TASK" : "ACTIVITY",
    });
  }
  return map;
}
