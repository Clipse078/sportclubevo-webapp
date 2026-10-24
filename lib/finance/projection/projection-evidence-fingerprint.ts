import { createHash } from "node:crypto";
import type { ProjectionEvidenceMaterial } from "@/lib/finance/projection/projection-evidence-types";

type FingerprintObservation = {
  financeYearId: string;
  relativePeriodIndex: number;
  periodStartDate: string;
  periodEndDate: string;
  amountMinor: number | null;
  completeness: string;
};

type FingerprintPayload = {
  tenantId: string;
  financeYearId: string;
  financialAccountId: string;
  currency: string;
  actualsThroughDate: string;
  currentYear: FingerprintObservation[];
  historical: Array<{
    financeYearId: string;
    startDate: string;
    endDate: string;
    observations: FingerprintObservation[];
  }>;
  budget: { budgetVersionId: string; amountMinor: number } | null;
  forecast: { forecastVersionId: string; amountMinor: number } | null;
};

function serializeObservations(
  observations: ProjectionEvidenceMaterial["currentYearActuals"]["observations"],
): FingerprintObservation[] {
  return [...observations]
    .sort((a, b) => a.relativePeriodIndex - b.relativePeriodIndex)
    .map((o) => ({
      financeYearId: o.financeYearId,
      relativePeriodIndex: o.relativePeriodIndex,
      periodStartDate: o.periodStartDate,
      periodEndDate: o.periodEndDate,
      amountMinor: o.amountMinor,
      completeness: o.completeness,
    }));
}

/**
 * Deterministic SHA-256 over canonical evidence material (no labels, locales, or timestamps).
 * Used to detect stale persisted projection snapshots when underlying evidence changes.
 */
export function computeProjectionEvidenceFingerprint(
  material: ProjectionEvidenceMaterial,
): string {
  const payload: FingerprintPayload = {
    tenantId: material.tenantId,
    financeYearId: material.financeYearId,
    financialAccountId: material.financialAccountId,
    currency: material.currency,
    actualsThroughDate: material.actualsThroughDate,
    currentYear: serializeObservations(material.currentYearActuals.observations),
    historical: [...material.historicalActuals]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((series) => ({
        financeYearId: series.financeYearId,
        startDate: series.startDate,
        endDate: series.endDate,
        observations: serializeObservations(series.observations),
      })),
    budget: material.budgetContext
      ? {
          budgetVersionId: material.budgetContext.budgetVersionId,
          amountMinor: material.budgetContext.amountMinor,
        }
      : null,
    forecast: material.forecastContext
      ? {
          forecastVersionId: material.forecastContext.forecastVersionId,
          amountMinor: material.forecastContext.amountMinor,
        }
      : null,
  };

  const canonical = JSON.stringify(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
