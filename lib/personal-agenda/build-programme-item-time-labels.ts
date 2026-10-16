import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { buildCalendarTimeLabelById } from "./build-calendar-time-labels";
import { normalizePersonalProgrammeItem } from "./normalize-calendar-item";
import type { PersonalProgrammeItem } from "./personal-programme-types";

/** MICRO-aligned time labels for personal programme list rows. */
export function buildProgrammeItemTimeLabelById(
  items: readonly PersonalProgrammeItem[],
  fmtCfg: TenantFormatConfig,
): Record<string, string> {
  return buildCalendarTimeLabelById(
    items.map((item) => normalizePersonalProgrammeItem(item)),
    fmtCfg,
  );
}
