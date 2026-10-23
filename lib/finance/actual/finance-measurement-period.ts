import type { FinanceYearPeriod } from "@/lib/finance/actual/finance-year-membership";
import { resolveYtdCutoffDate } from "@/lib/finance/actual/period-semantics";
import { formatFinanceYearDateInputValue } from "@/lib/finance/setup/finance-year-date-input";

export type FinanceMeasurementMode = "FULL_YEAR" | "YTD" | "MONTH" | "QUARTER";

export type FinanceYearMonthSlice = {
  index: number;
  startDate: Date;
  endDate: Date;
};

export type FinanceYearQuarterSlice = {
  index: number;
  startDate: Date;
  endDate: Date;
  monthIndices: readonly number[];
};

export type FinanceMeasurementPeriod = {
  mode: FinanceMeasurementMode;
  financeYearId: string;
  financeYearName: string;
  startDate: Date;
  endDate: Date;
  /** YTD cutoff inclusive (period end for MONTH/QUARTER; reference for YTD). */
  ytdCutoffDate: Date;
  displayLabel: string;
  periodIndex: number | null;
  periodCount: number | null;
};

const MS_PER_DAY = 86_400_000;

function utcMidnight(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function utcYearMonthDay(date: Date): { year: number; monthIndex: number; day: number } {
  return {
    year: date.getUTCFullYear(),
    monthIndex: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function endOfUtcMonth(year: number, monthIndex: number): Date {
  return utcMidnight(year, monthIndex + 1, 0);
}

function clampDateToRange(date: Date, start: Date, end: Date): Date {
  const t = date.getTime();
  if (t < start.getTime()) return start;
  if (t > end.getTime()) return end;
  return date;
}

function compareUtcDates(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

/** Calendar months overlapping the finance year, clipped to year boundaries. */
export function enumerateFinanceYearMonths(year: FinanceYearPeriod): FinanceYearMonthSlice[] {
  const slices: FinanceYearMonthSlice[] = [];
  const startParts = utcYearMonthDay(year.startDate);
  const endParts = utcYearMonthDay(year.endDate);

  let y = startParts.year;
  let m = startParts.monthIndex;
  let index = 0;

  while (y < endParts.year || (y === endParts.year && m <= endParts.monthIndex)) {
    const monthStart = utcMidnight(y, m, 1);
    const monthEnd = endOfUtcMonth(y, m);
    const sliceStart =
      compareUtcDates(monthStart, year.startDate) < 0 ? year.startDate : monthStart;
    const sliceEnd = compareUtcDates(monthEnd, year.endDate) > 0 ? year.endDate : monthEnd;

    if (compareUtcDates(sliceStart, sliceEnd) <= 0) {
      slices.push({ index, startDate: sliceStart, endDate: sliceEnd });
      index += 1;
    }

    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return slices;
}

/** Three finance-year-relative months per quarter (not calendar Q1–Q4). */
export function enumerateFinanceYearQuarters(year: FinanceYearPeriod): FinanceYearQuarterSlice[] {
  const months = enumerateFinanceYearMonths(year);
  const quarters: FinanceYearQuarterSlice[] = [];
  for (let i = 0; i < months.length; i += 3) {
    const chunk = months.slice(i, i + 3);
    if (chunk.length === 0) continue;
    quarters.push({
      index: quarters.length,
      startDate: chunk[0]!.startDate,
      endDate: chunk[chunk.length - 1]!.endDate,
      monthIndices: chunk.map((c) => c.index),
    });
  }
  return quarters;
}

export function formatMeasurementPeriodLabel(
  period: Pick<FinanceMeasurementPeriod, "mode" | "startDate" | "endDate">,
  locale: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  if (period.mode === "FULL_YEAR" || period.mode === "YTD") {
    return formatter.format(period.startDate);
  }
  if (period.mode === "MONTH") {
    return formatter.format(period.startDate);
  }
  const short = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const startLabel = short.format(period.startDate);
  const endLabel = short.format(period.endDate);
  return `${startLabel} – ${endLabel}`;
}

export function resolveDefaultPeriodIndexForReference(
  slices: ReadonlyArray<{ startDate: Date; endDate: Date }>,
  referenceDate: Date,
  year: FinanceYearPeriod,
): number {
  if (slices.length === 0) return 0;
  const ref = clampDateToRange(referenceDate, year.startDate, year.endDate);
  const found = slices.findIndex(
    (slice) =>
      ref.getTime() >= slice.startDate.getTime() && ref.getTime() <= slice.endDate.getTime(),
  );
  if (found >= 0) return found;
  if (ref.getTime() < slices[0]!.startDate.getTime()) return 0;
  return slices.length - 1;
}

export function clampPeriodIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (index < 0) return 0;
  if (index >= count) return count - 1;
  return index;
}

export function parseMeasurementModeFromSearchParam(
  raw: string | undefined,
): FinanceMeasurementMode {
  switch (raw?.toLowerCase()) {
    case "ytd":
      return "YTD";
    case "month":
      return "MONTH";
    case "quarter":
      return "QUARTER";
    default:
      return "FULL_YEAR";
  }
}

export function measurementModeToSearchParam(mode: FinanceMeasurementMode): string | null {
  switch (mode) {
    case "YTD":
      return "ytd";
    case "MONTH":
      return "month";
    case "QUARTER":
      return "quarter";
    default:
      return null;
  }
}

export function resolveFinanceMeasurementPeriod(input: {
  financeYearId: string;
  financeYearName: string;
  year: FinanceYearPeriod;
  mode: FinanceMeasurementMode;
  requestedPeriodIndex?: number | null;
  referenceDate?: Date;
  locale?: string;
}): FinanceMeasurementPeriod {
  const referenceDate = input.referenceDate ?? new Date();
  const locale = input.locale ?? "de-CH";

  if (input.mode === "FULL_YEAR") {
    const ytdCutoff = resolveYtdCutoffDate(input.year, referenceDate);
    return {
      mode: "FULL_YEAR",
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      startDate: input.year.startDate,
      endDate: input.year.endDate,
      ytdCutoffDate: ytdCutoff,
      displayLabel: input.financeYearName,
      periodIndex: null,
      periodCount: null,
    };
  }

  if (input.mode === "YTD") {
    const ytdCutoff = resolveYtdCutoffDate(input.year, referenceDate);
    return {
      mode: "YTD",
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      startDate: input.year.startDate,
      endDate: ytdCutoff,
      ytdCutoffDate: ytdCutoff,
      displayLabel: formatFinanceYearDateInputValue(ytdCutoff),
      periodIndex: null,
      periodCount: null,
    };
  }

  if (input.mode === "MONTH") {
    const months = enumerateFinanceYearMonths(input.year);
    const defaultIndex = resolveDefaultPeriodIndexForReference(
      months,
      referenceDate,
      input.year,
    );
    const index = clampPeriodIndex(input.requestedPeriodIndex ?? defaultIndex, months.length);
    const slice = months[index] ?? months[months.length - 1] ?? {
      index: 0,
      startDate: input.year.startDate,
      endDate: input.year.endDate,
    };
    const period: FinanceMeasurementPeriod = {
      mode: "MONTH",
      financeYearId: input.financeYearId,
      financeYearName: input.financeYearName,
      startDate: slice.startDate,
      endDate: slice.endDate,
      ytdCutoffDate: slice.endDate,
      displayLabel: formatMeasurementPeriodLabel(
        { mode: "MONTH", startDate: slice.startDate, endDate: slice.endDate },
        locale,
      ),
      periodIndex: slice.index,
      periodCount: months.length,
    };
    return period;
  }

  const quarters = enumerateFinanceYearQuarters(input.year);
  const defaultIndex = resolveDefaultPeriodIndexForReference(
    quarters,
    referenceDate,
    input.year,
  );
  const index = clampPeriodIndex(input.requestedPeriodIndex ?? defaultIndex, quarters.length);
  const slice = quarters[index] ?? quarters[quarters.length - 1] ?? {
    index: 0,
    startDate: input.year.startDate,
    endDate: input.year.endDate,
    monthIndices: [] as number[],
  };
  return {
    mode: "QUARTER",
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    startDate: slice.startDate,
    endDate: slice.endDate,
    ytdCutoffDate: slice.endDate,
    displayLabel: formatMeasurementPeriodLabel(
      { mode: "QUARTER", startDate: slice.startDate, endDate: slice.endDate },
      locale,
    ),
    periodIndex: slice.index,
    periodCount: quarters.length,
  };
}

export function isEffectiveDateWithinMeasurementPeriod(
  effectiveDate: Date,
  period: Pick<FinanceMeasurementPeriod, "startDate" | "endDate">,
): boolean {
  const t = effectiveDate.getTime();
  return t >= period.startDate.getTime() && t <= period.endDate.getTime();
}

export function isEffectiveDateOnOrBeforeYtdCutoff(effectiveDate: Date, cutoff: Date): boolean {
  return effectiveDate.getTime() <= cutoff.getTime();
}

/** Days elapsed in finance year through cutoff (inclusive), for management context only — not budget phasing. */
export function financeYearElapsedDayFraction(
  year: FinanceYearPeriod,
  cutoff: Date,
): { elapsedDays: number; totalDays: number } {
  const startMs = year.startDate.getTime();
  const endMs = year.endDate.getTime();
  const cutoffMs = clampDateToRange(cutoff, year.startDate, year.endDate).getTime();
  const totalDays = Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
  const elapsedDays = Math.max(0, Math.floor((cutoffMs - startMs) / MS_PER_DAY) + 1);
  return { elapsedDays, totalDays };
}
