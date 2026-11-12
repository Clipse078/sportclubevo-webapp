import {
  formatSceDateTileParts,
  type SceDateTileParts,
} from "@/lib/design-system/sce-date-tile";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type ProgrammeActivityDateTileParts = Pick<
  SceDateTileParts,
  "weekdayShort" | "day" | "monthShort"
>;

export function formatProgrammeActivityDateTileParts(
  startAt: Date,
  fmtCfg: TenantFormatConfig,
): ProgrammeActivityDateTileParts {
  const parts = formatSceDateTileParts(startAt, fmtCfg);
  return {
    weekdayShort: parts.weekdayShort,
    day: parts.day,
    monthShort: parts.monthShort,
  };
}
