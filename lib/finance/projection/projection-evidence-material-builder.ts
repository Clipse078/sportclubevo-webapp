import type { ProjectionEvidenceKind } from "@/lib/finance/projection/projection-architecture-contract";
import {
  buildFinanceYearActualObservations,
  type ProjectionActualEntryRow,
} from "@/lib/finance/projection/projection-actual-observations";
import type {
  ProjectionBudgetContextEvidence,
  ProjectionEvidenceMaterial,
  ProjectionForecastContextEvidence,
} from "@/lib/finance/projection/projection-evidence-types";

export type ProjectionEvidenceYearRow = {
  id: string;
  tenantId: string;
  name: string;
  startDate: Date;
  endDate: Date;
};

export function buildProjectionEvidenceMaterial(input: {
  tenantId: string;
  financeYearId: string;
  financialAccountId: string;
  currency: string;
  actualsThroughDate: Date;
  actualsThroughDateIso: string;
  targetYear: ProjectionEvidenceYearRow;
  priorYears: readonly ProjectionEvidenceYearRow[];
  actualEntriesByYearId: ReadonlyMap<string, readonly ProjectionActualEntryRow[]>;
  budgetContext: ProjectionBudgetContextEvidence | null;
  forecastContext: ProjectionForecastContextEvidence | null;
}): ProjectionEvidenceMaterial {
  const currentEntries = input.actualEntriesByYearId.get(input.financeYearId) ?? [];

  const currentYearActuals = buildFinanceYearActualObservations({
    financeYearId: input.targetYear.id,
    financeYearName: input.targetYear.name,
    year: { startDate: input.targetYear.startDate, endDate: input.targetYear.endDate },
    actualsThroughDate: input.actualsThroughDate,
    entries: currentEntries,
  });

  const historicalActuals = input.priorYears.map((year) =>
    buildFinanceYearActualObservations({
      financeYearId: year.id,
      financeYearName: year.name,
      year: { startDate: year.startDate, endDate: year.endDate },
      actualsThroughDate: year.endDate,
      entries: input.actualEntriesByYearId.get(year.id) ?? [],
    }),
  );

  const evidenceKindsPresent: ProjectionEvidenceKind[] = [];
  if (currentYearActuals.observations.some((o) => o.amountMinor !== null)) {
    evidenceKindsPresent.push("CURRENT_YEAR_ACTUALS");
  }
  if (historicalActuals.some((s) => s.observations.some((o) => o.amountMinor !== null))) {
    evidenceKindsPresent.push("HISTORICAL_ACTUALS");
  }
  if (input.budgetContext) {
    evidenceKindsPresent.push("BUDGET_BASELINE");
  }
  if (input.forecastContext) {
    evidenceKindsPresent.push("CURRENT_FORECAST");
  }

  return {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financialAccountId: input.financialAccountId,
    currency: input.currency,
    actualsThroughDate: input.actualsThroughDateIso,
    currentYearActuals,
    historicalActuals,
    budgetContext: input.budgetContext,
    forecastContext: input.forecastContext,
    evidenceKindsPresent,
  };
}
