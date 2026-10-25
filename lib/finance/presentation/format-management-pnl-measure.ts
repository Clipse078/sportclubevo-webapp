import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";

export const FINANCE_PNL_MISSING_AMOUNT = "—";

export function formatManagementPnlMeasureCell(
  cell: ManagementPnlMeasureCell,
  currency: string | null,
  locale: string,
): string {
  if (cell.availability === "NOT_VISIBLE") return FINANCE_PNL_MISSING_AMOUNT;
  if (cell.availability !== "AVAILABLE") return FINANCE_PNL_MISSING_AMOUNT;
  if (cell.amountMinor === null) return FINANCE_PNL_MISSING_AMOUNT;
  return formatFinanceManagementMoneyMinor(cell.amountMinor, currency, locale);
}

export function formatManagementPnlVarianceDelta(
  slice: FinanceReportingComparisonSlice,
  currency: string | null,
  locale: string,
): string {
  if (slice.availability !== "AVAILABLE" || slice.rawDeltaMinor === null) {
    return FINANCE_PNL_MISSING_AMOUNT;
  }
  return formatFinanceManagementMoneyMinor(slice.rawDeltaMinor, currency, locale);
}

export function formatManagementPnlVariancePercent(
  slice: FinanceReportingComparisonSlice,
): string {
  if (slice.availability !== "AVAILABLE" || slice.variancePercent === null) {
    return FINANCE_PNL_MISSING_AMOUNT;
  }
  return `${slice.variancePercent}%`;
}
