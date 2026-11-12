import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type ProgrammeActivityDateTileParts = {
  weekdayShort: string;
  day: string;
  monthShort: string;
};

export function formatProgrammeActivityDateTileParts(
  startAt: Date,
  fmtCfg: TenantFormatConfig,
): ProgrammeActivityDateTileParts {
  const locale = fmtCfg.locale ?? "de-CH";
  const timezone = fmtCfg.timezone ?? "Europe/Zurich";
  return {
    weekdayShort: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: timezone }).format(
      startAt,
    ),
    day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: timezone }).format(startAt),
    monthShort: new Intl.DateTimeFormat(locale, { month: "short", timeZone: timezone }).format(
      startAt,
    ),
  };
}
