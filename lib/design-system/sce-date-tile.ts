import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type SceDateTileParts = {
  weekdayShort: string;
  day: string;
  monthShort: string;
  /** Full calendar date for assistive technology (includes year). */
  accessibleLabel: string;
};

export type SceDateTileValue =
  | Date
  | {
      /** UTC calendar date `YYYY-MM-DD` — not shifted by timezone when formatted. */
      dateOnly: string;
    };

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function resolveInstant(value: SceDateTileValue): Date {
  if (value instanceof Date) {
    return value;
  }
  const key = value.dateOnly.trim();
  if (!ISO_DATE_ONLY.test(key)) {
    return new Date(key);
  }
  const [year, month, day] = key.split("-").map((part) => Number.parseInt(part, 10));
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return utcNoon;
}

function normalizeShortToken(raw: string): string {
  return raw.replace(/\./g, "").trim().toUpperCase();
}

function formatAccessibleDate(instant: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(instant);
}

/**
 * Canonical DS2 date-tile parts — weekday / day / month stack (locale + timezone aware).
 */
export function formatSceDateTileParts(
  value: SceDateTileValue,
  fmtCfg: TenantFormatConfig,
): SceDateTileParts {
  const locale = fmtCfg.locale ?? "de-CH";
  const timezone = fmtCfg.timezone ?? "Europe/Zurich";
  const instant = resolveInstant(value);

  const weekdayShort = normalizeShortToken(
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: timezone }).format(instant),
  );
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: timezone }).format(instant);
  const monthShort = normalizeShortToken(
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: timezone }).format(instant),
  );

  return {
    weekdayShort,
    day,
    monthShort,
    accessibleLabel: formatAccessibleDate(instant, locale, timezone),
  };
}
