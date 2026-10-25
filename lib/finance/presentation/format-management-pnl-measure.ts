import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import {
  formatFinanceManagementMoneyMinor,
  formatFinanceManagementSignedMinor,
} from "@/lib/finance/presentation/finance-money-presentation";
import { formatManagementReportingVariancePercent } from "@/lib/finance/presentation/format-management-reporting-percent";

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
  return formatFinanceManagementSignedMinor(slice.rawDeltaMinor, currency, locale);
}

export function formatManagementPnlVariancePercent(
  slice: FinanceReportingComparisonSlice,
  locale: string,
): string {
  if (slice.availability !== "AVAILABLE" || slice.variancePercent === null) {
    return FINANCE_PNL_MISSING_AMOUNT;
  }
  return formatManagementReportingVariancePercent(slice.variancePercent, locale);
}
