import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";

export type FinanceVarianceDriverKind = "ACCOUNT" | "REPORTING_GROUP";

export type FinanceVarianceDriver = {
  kind: FinanceVarianceDriverKind;
  id: string;
  name: string;
  canonicalSemantic: "INCOME" | "EXPENSE";
  hierarchySortOrder: number;
  comparison: FinanceReportingComparisonSlice;
  /** Basis points of total absolute variance magnitude — null when denominator is zero. */
  relativeContributionBasisPoints: number | null;
  rank: number;
};

const BASIS_POINTS_SCALE = 10_000;

function compareDrivers(
  a: Pick<FinanceVarianceDriver, "comparison" | "hierarchySortOrder" | "id">,
  b: Pick<FinanceVarianceDriver, "comparison" | "hierarchySortOrder" | "id">,
): number {
  const magA = a.comparison.absoluteVarianceMagnitudeMinor ?? 0;
  const magB = b.comparison.absoluteVarianceMagnitudeMinor ?? 0;
  if (magB !== magA) return magB - magA;
  if (a.hierarchySortOrder !== b.hierarchySortOrder) {
    return a.hierarchySortOrder - b.hierarchySortOrder;
  }
  return a.id.localeCompare(b.id);
}

export function rankVarianceDrivers(
  drivers: ReadonlyArray<Omit<FinanceVarianceDriver, "rank">>,
): FinanceVarianceDriver[] {
  const sorted = [...drivers].sort(compareDrivers);
  return sorted.map((driver, index) => ({ ...driver, rank: index + 1 }));
}

export function computeRelativeContributionBasisPoints(
  driverMagnitudeMinor: number | null,
  totalAbsoluteVarianceMinor: number,
): number | null {
  if (driverMagnitudeMinor === null || totalAbsoluteVarianceMinor === 0) return null;
  const raw = Math.round((driverMagnitudeMinor * BASIS_POINTS_SCALE) / totalAbsoluteVarianceMinor);
  if (!Number.isSafeInteger(raw)) return null;
  return Math.min(BASIS_POINTS_SCALE, raw);
}

export function selectTopDriversByFavorability(
  drivers: ReadonlyArray<FinanceVarianceDriver>,
  favorability: VarianceFavorability,
  limit: number,
): FinanceVarianceDriver[] {
  return drivers
    .filter((d) => d.comparison.favorability === favorability)
    .sort(compareDrivers)
    .slice(0, limit);
}

export function sumAbsoluteVarianceMagnitudes(
  slices: ReadonlyArray<Pick<FinanceReportingComparisonSlice, "absoluteVarianceMagnitudeMinor">>,
): number {
  let total = 0;
  for (const slice of slices) {
    if (slice.absoluteVarianceMagnitudeMinor === null) continue;
    total += slice.absoluteVarianceMagnitudeMinor;
    if (!Number.isSafeInteger(total)) {
      throw new Error("FINANCE_AMOUNT_OVERFLOW");
    }
  }
  return total;
}
