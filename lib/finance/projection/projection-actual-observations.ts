import {
  enumerateFinanceYearMonths,
  isEffectiveDateWithinMeasurementPeriod,
} from "@/lib/finance/actual/finance-measurement-period";
import type { FinanceYearPeriod } from "@/lib/finance/actual/finance-year-membership";
import { isEffectiveDateOnOrBeforeCutoff } from "@/lib/finance/actual/period-semantics";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import type {
  ProjectionFinanceYearActualSeries,
  ProjectionObservationCompleteness,
  ProjectionPeriodActualObservation,
} from "@/lib/finance/projection/projection-evidence-types";

export type ProjectionActualEntryRow = {
  effectiveDate: Date;
  amountMinor: number;
};

function formatUtcDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolvePeriodCompleteness(
  periodEndDate: Date,
  actualsThroughDate: Date,
  entryCount: number,
): ProjectionObservationCompleteness {
  if (entryCount === 0) {
    return "NO_DATA";
  }
  if (actualsThroughDate.getTime() < periodEndDate.getTime()) {
    return "PARTIAL";
  }
  return "COMPLETE";
}

/**
 * Builds finance-year-relative monthly actual observations for one account/year.
 * Absence of entries in a period is **missing** evidence, not zero.
 */
export function buildFinanceYearActualObservations(input: {
  financeYearId: string;
  financeYearName: string;
  year: FinanceYearPeriod;
  actualsThroughDate: Date;
  entries: readonly ProjectionActualEntryRow[];
}): ProjectionFinanceYearActualSeries {
  const months = enumerateFinanceYearMonths(input.year);
  const observations: ProjectionPeriodActualObservation[] = [];

  for (const slice of months) {
    const inPeriod = input.entries.filter(
      (entry) =>
        isEffectiveDateWithinMeasurementPeriod(entry.effectiveDate, slice) &&
        isEffectiveDateOnOrBeforeCutoff(entry.effectiveDate, input.actualsThroughDate),
    );

    let amountMinor: number | null = null;
    if (inPeriod.length > 0) {
      let sum = 0;
      for (const row of inPeriod) {
        assertSafeAmountMinor(row.amountMinor);
        sum += row.amountMinor;
      }
      amountMinor = sum;
    }

    const completeness = resolvePeriodCompleteness(
      slice.endDate,
      input.actualsThroughDate,
      inPeriod.length,
    );

    observations.push({
      financeYearId: input.financeYearId,
      relativePeriodIndex: slice.index,
      periodStartDate: formatUtcDateOnly(slice.startDate),
      periodEndDate: formatUtcDateOnly(slice.endDate),
      amountMinor,
      completeness,
      entryCount: inPeriod.length,
    });
  }

  return {
    financeYearId: input.financeYearId,
    startDate: formatUtcDateOnly(input.year.startDate),
    endDate: formatUtcDateOnly(input.year.endDate),
    financeYearName: input.financeYearName,
    observations,
  };
}

export function findCutoffRelativePeriodIndex(
  series: Pick<ProjectionFinanceYearActualSeries, "observations">,
  actualsThroughDate: Date,
): number | null {
  for (const obs of series.observations) {
    const end = new Date(`${obs.periodEndDate}T00:00:00.000Z`);
    const start = new Date(`${obs.periodStartDate}T00:00:00.000Z`);
    if (
      actualsThroughDate.getTime() >= start.getTime() &&
      actualsThroughDate.getTime() <= end.getTime()
    ) {
      return obs.relativePeriodIndex;
    }
  }
  return null;
}

export function latestActualDateInSeries(
  entries: readonly ProjectionActualEntryRow[],
): string | null {
  if (entries.length === 0) return null;
  let latest = entries[0]!.effectiveDate;
  for (const row of entries.slice(1)) {
    if (row.effectiveDate.getTime() > latest.getTime()) {
      latest = row.effectiveDate;
    }
  }
  return formatUtcDateOnly(latest);
}
