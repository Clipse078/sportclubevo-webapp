import { FinanceDomainError } from "@/lib/finance/errors";

export type FinanceYearPeriod = {
  startDate: Date;
  endDate: Date;
};

/** Inclusive UTC instant bounds for finance year membership (FIN-03A). */
export function isEffectiveDateWithinFinanceYear(
  effectiveDate: Date,
  year: FinanceYearPeriod,
): boolean {
  const t = effectiveDate.getTime();
  return t >= year.startDate.getTime() && t <= year.endDate.getTime();
}

export function assertEffectiveDateWithinFinanceYear(
  effectiveDate: Date,
  year: FinanceYearPeriod,
): void {
  if (!isEffectiveDateWithinFinanceYear(effectiveDate, year)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_YEAR",
      "Actual date must fall within the selected financial year.",
    );
  }
}
