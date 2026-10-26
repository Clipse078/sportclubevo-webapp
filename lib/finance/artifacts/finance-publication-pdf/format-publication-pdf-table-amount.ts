import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import { FINANCE_PNL_MISSING_AMOUNT } from "@/lib/finance/presentation/format-management-pnl-measure";
import {
  formatFinanceManagementSignedWholeMajorNumber,
  formatFinanceManagementWholeMajorNumber,
} from "@/lib/finance/presentation/finance-money-presentation";

/** Table body amounts when currency is declared once in the section header. */
export function formatPublicationPdfTableMeasureCell(
  cell: ManagementPnlMeasureCell,
  currency: string | null,
  locale: string,
): string {
  if (cell.availability === "NOT_VISIBLE") return FINANCE_PNL_MISSING_AMOUNT;
  if (cell.availability !== "AVAILABLE") return FINANCE_PNL_MISSING_AMOUNT;
  if (cell.amountMinor === null) return FINANCE_PNL_MISSING_AMOUNT;
  if (cell.amountMinor === 0) {
    return formatFinanceManagementWholeMajorNumber(0, currency, locale);
  }
  return formatFinanceManagementWholeMajorNumber(cell.amountMinor, currency, locale);
}

export function formatPublicationPdfTableVarianceDelta(
  slice: FinanceReportingComparisonSlice,
  currency: string | null,
  locale: string,
): string {
  if (slice.availability !== "AVAILABLE" || slice.rawDeltaMinor === null) {
    return FINANCE_PNL_MISSING_AMOUNT;
  }
  if (slice.rawDeltaMinor === 0) {
    return formatFinanceManagementWholeMajorNumber(0, currency, locale);
  }
  return formatFinanceManagementSignedWholeMajorNumber(slice.rawDeltaMinor, currency, locale);
}
