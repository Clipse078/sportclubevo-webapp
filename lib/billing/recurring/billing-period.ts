/**
 * UTC date-only helpers for recurring billing (aligned with native invoice date parsing).
 */

export function parseBillingDateOnly(value: string): Date {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  const date = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return date;
}

export function formatBillingDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function compareBillingDateOnly(a: Date, b: Date): number {
  return formatBillingDateOnly(a).localeCompare(formatBillingDateOnly(b));
}

export function addDaysBillingUtc(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Add calendar months, clamping the day to the last day of the target month when needed. */
export function addMonthsBillingUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0, 12, 0, 0, 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay, 12, 0, 0, 0));
}

export type MonthlyBillingPeriod = {
  periodIndex: number;
  periodStart: Date;
  periodEnd: Date;
};

/** Monthly periods anchored to contract start (inclusive end = day before next period start). */
export function computeMonthlyBillingPeriod(
  contractStart: Date,
  periodIndex: number,
): MonthlyBillingPeriod {
  const periodStart = addMonthsBillingUtc(contractStart, periodIndex);
  const nextPeriodStart = addMonthsBillingUtc(contractStart, periodIndex + 1);
  const periodEnd = addDaysBillingUtc(nextPeriodStart, -1);
  return { periodIndex, periodStart, periodEnd };
}

export type ResolveDueBillablePeriodInput = {
  contractStart: Date;
  contractEnd: Date | null;
  asOfDate: Date;
  isPeriodInvoiced: (periodStart: Date, periodEnd: Date) => boolean;
  maxPeriods?: number;
};

export type ResolveDueBillablePeriodResult =
  | { kind: "PERIOD"; period: MonthlyBillingPeriod }
  | { kind: "NOT_DUE"; nextPeriod: MonthlyBillingPeriod }
  | { kind: "ENDED" }
  | { kind: "ALL_INVOICED" };

/**
 * Returns the earliest monthly period that is due (periodStart <= asOfDate) and not yet invoiced.
 * Skips invoiced periods. VOID invoices must be excluded by `isPeriodInvoiced`.
 */
export function resolveDueBillableMonthlyPeriod(
  input: ResolveDueBillablePeriodInput,
): ResolveDueBillablePeriodResult {
  const limit = input.maxPeriods ?? 1200;

  for (let index = 0; index < limit; index++) {
    const period = computeMonthlyBillingPeriod(input.contractStart, index);

    if (input.contractEnd && compareBillingDateOnly(period.periodStart, input.contractEnd) > 0) {
      return { kind: "ENDED" };
    }

    if (compareBillingDateOnly(period.periodStart, input.asOfDate) > 0) {
      return { kind: "NOT_DUE", nextPeriod: period };
    }

    const { periodStart } = period;
    let { periodEnd } = period;
    if (input.contractEnd && compareBillingDateOnly(periodEnd, input.contractEnd) > 0) {
      periodEnd = input.contractEnd;
    }

    if (!input.isPeriodInvoiced(periodStart, periodEnd)) {
      return {
        kind: "PERIOD",
        period: { ...period, periodStart, periodEnd },
      };
    }
  }

  return { kind: "ALL_INVOICED" };
}
