import type { FinanceYearPeriod } from "@/lib/finance/actual/finance-year-membership";
import {
  enumerateFinanceYearMonths,
  enumerateFinanceYearQuarters,
  formatFinanceYearMonthChipLabel,
  formatFinanceYearQuarterLabel,
} from "@/lib/finance/actual/finance-measurement-period";

export type FinanceMonthSlicerOption = {
  index: number;
  label: string;
  startDateIso: string;
};

export type FinanceQuarterSlicerOption = {
  index: number;
  label: string;
  compactLabel: string;
  startDateIso: string;
  endDateIso: string;
};

export function buildFinanceMonthSlicerOptions(
  year: FinanceYearPeriod,
  locale: string,
): FinanceMonthSlicerOption[] {
  return enumerateFinanceYearMonths(year).map((slice) => ({
    index: slice.index,
    label: formatFinanceYearMonthChipLabel(slice.startDate, locale),
    startDateIso: slice.startDate.toISOString(),
  }));
}

export function buildFinanceQuarterSlicerOptions(
  year: FinanceYearPeriod,
  locale: string,
): FinanceQuarterSlicerOption[] {
  return enumerateFinanceYearQuarters(year).map((slice) => ({
    index: slice.index,
    label: formatFinanceYearQuarterLabel(slice.index, slice.startDate, locale, "withYear"),
    compactLabel: formatFinanceYearQuarterLabel(slice.index, slice.startDate, locale, "compact"),
    startDateIso: slice.startDate.toISOString(),
    endDateIso: slice.endDate.toISOString(),
  }));
}

/**
 * Month range click contract (no modifier keys):
 * - Single month selected + same month → unchanged
 * - Click before range start → [click, end]
 * - Click after range end → [start, click]
 * - Click strictly inside range → collapse to single month at click
 */
export function resolveNextMonthRangeSelection(input: {
  currentStart: number;
  currentEnd: number;
  clickedIndex: number;
}): { startIndex: number; endIndex: number } {
  const { currentStart, currentEnd, clickedIndex } = input;
  if (currentStart === currentEnd && clickedIndex === currentStart) {
    return { startIndex: currentStart, endIndex: currentEnd };
  }
  if (clickedIndex < currentStart) {
    return { startIndex: clickedIndex, endIndex: currentEnd };
  }
  if (clickedIndex > currentEnd) {
    return { startIndex: currentStart, endIndex: clickedIndex };
  }
  return { startIndex: clickedIndex, endIndex: clickedIndex };
}
