import { buildProjectionEvidenceMaterial } from "@/lib/finance/projection/projection-evidence-material-builder";
import type { ProjectionActualEntryRow } from "@/lib/finance/projection/projection-actual-observations";

export const FIXTURE_TENANT = "tenant-fixture";

export function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function entries(dates: Array<[string, number]>): ProjectionActualEntryRow[] {
  return dates.map(([iso, amountMinor]) => ({ effectiveDate: d(iso), amountMinor }));
}

export function monthlyUniform(
  yearStart: string,
  monthCount: number,
  amountPerMonth: number,
): ProjectionActualEntryRow[] {
  const out: ProjectionActualEntryRow[] = [];
  const start = d(yearStart);
  for (let i = 0; i < monthCount; i += 1) {
    const dt = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 10));
    out.push({ effectiveDate: dt, amountMinor: amountPerMonth });
  }
  return out;
}

export function buildMaterial(input: {
  financeYearId: string;
  accountId: string;
  targetStart: string;
  targetEnd: string;
  cutoff: string;
  priorYears: Array<{ id: string; start: string; end: string; entries: ProjectionActualEntryRow[] }>;
  currentEntries: ProjectionActualEntryRow[];
  budgetAmount?: number;
  forecastAmount?: number;
}) {
  const targetYear = {
    id: input.financeYearId,
    tenantId: FIXTURE_TENANT,
    name: "label-ignored",
    startDate: d(input.targetStart),
    endDate: d(input.targetEnd),
  };
  const map = new Map<string, readonly ProjectionActualEntryRow[]>();
  map.set(input.financeYearId, input.currentEntries);
  for (const py of input.priorYears) {
    map.set(py.id, py.entries);
  }
  return buildProjectionEvidenceMaterial({
    tenantId: FIXTURE_TENANT,
    financeYearId: input.financeYearId,
    financialAccountId: input.accountId,
    currency: "EUR",
    actualsThroughDate: d(input.cutoff),
    actualsThroughDateIso: input.cutoff,
    targetYear,
    priorYears: input.priorYears.map((py) => ({
      id: py.id,
      tenantId: FIXTURE_TENANT,
      name: py.id,
      startDate: d(py.start),
      endDate: d(py.end),
    })),
    actualEntriesByYearId: map,
    budgetContext:
      input.budgetAmount !== undefined
        ? {
            kind: "BUDGET_BASELINE",
            financeYearId: input.financeYearId,
            financialAccountId: input.accountId,
            budgetVersionId: "budget-v1",
            amountMinor: input.budgetAmount,
            currency: "EUR",
          }
        : null,
    forecastContext:
      input.forecastAmount !== undefined
        ? {
            kind: "CURRENT_FORECAST",
            financeYearId: input.financeYearId,
            financialAccountId: input.accountId,
            forecastVersionId: "forecast-v1",
            amountMinor: input.forecastAmount,
            currency: "EUR",
          }
        : null,
  });
}
