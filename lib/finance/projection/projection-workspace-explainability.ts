import type {
  ProjectionDataSufficiencyReason,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";
import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import {
  projectionConfidenceLabel,
  projectionDataSufficiencyLabel,
  projectionMethodologyLabel,
  type ProjectionAccountExplainabilityViewModel,
} from "@/lib/finance/projection/projection-workspace-presentation";

function formatSharePercentFromBasisPoints(basisPoints: number): string {
  const pct = basisPoints / 100;
  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(pct);
}

function materialWeight(
  calculation: ProjectionAccountCalculationResult,
  code: string,
): number | null {
  const row = calculation.materialInfluences.find((i) => i.code === code);
  return row?.weight ?? null;
}

export function projectionInsufficientDataExplanation(
  reasons: readonly ProjectionDataSufficiencyReason[],
): string {
  if (reasons.includes("NO_CURRENT_YEAR_ACTUALS")) {
    return "Noch nicht genügend Ist-Daten vorhanden.";
  }
  if (reasons.includes("TOO_FEW_OBSERVATIONS")) {
    return "Zu wenige abgeschlossene Perioden für eine belastbare Hochrechnung.";
  }
  if (reasons.includes("NO_ACTUAL_HISTORY")) {
    return "Für diese Position ist noch kein ausreichender historischer Verlauf verfügbar.";
  }
  if (reasons.includes("SPARSE_ACCOUNT_HISTORY")) {
    return "Die verfügbare Ist-Historie ist für diese Position zu dünn.";
  }
  if (reasons.includes("ACCOUNT_ARCHIVED")) {
    return "Archivierte Positionen werden nicht projiziert.";
  }
  return "Für diese Position liegt keine verlässliche automatische Prognose vor.";
}

export function buildProjectionExplainabilityNarrative(
  calculation: ProjectionAccountCalculationResult,
  input: {
    historicalFinanceYearNames: readonly string[];
    actualsThroughDate: string;
  },
): string | null {
  if (calculation.projectedAmountMinor === null) {
    return projectionInsufficientDataExplanation(calculation.sufficiencyReasons);
  }

  const projected = calculation.projectedAmountMinor;
  const remainder = calculation.estimatedRemainingAmountMinor;

  if (calculation.methodologyFamily === "HISTORICAL_PATTERN") {
    const medianBp = materialWeight(calculation, "MEDIAN_CUMULATIVE_SHARE_BP");
    const shareText =
      medianBp !== null
        ? `typischerweise rund ${formatSharePercentFromBasisPoints(medianBp)} %`
        : "einem typischen saisonalen Verlauf";
    const yearNames =
      input.historicalFinanceYearNames.length > 0
        ? input.historicalFinanceYearNames.join(", ")
        : "früheren Finanzjahren";
    const remainderPhrase =
      remainder !== null
        ? ` Auf Basis dieses Verlaufs und der bisher verbuchten Ist-Daten wird der Jahresendwert geschätzt.`
        : "";
    return (
      `In den berücksichtigten Finanzjahren (${yearNames}) waren bis zu diesem Zeitpunkt ${shareText} der jährlichen Position verbucht.` +
      remainderPhrase +
      ` Bekanntes Ist und geschätzter Rest ergeben die automatische Prognose.`
    );
  }

  if (calculation.methodologyFamily === "RUN_RATE") {
    const elapsed = materialWeight(calculation, "ELAPSED_DAYS");
    const total = materialWeight(calculation, "TOTAL_FINANCE_YEAR_DAYS");
    if (elapsed !== null && total !== null && total > 0) {
      const elapsedShare = formatSharePercentFromBasisPoints(
        Math.round((elapsed / total) * 10000),
      );
      return (
        `Bisher sind etwa ${elapsedShare} % des Finanzjahres verstrichen. ` +
        "Der bisherige Ist-Verlauf wird linear auf das Jahresende hochgerechnet — geschätzter Rest und automatische Prognose folgen daraus."
      );
    }
    return (
      "Der bisherige Ist-Verlauf wird linear auf das gesamte Finanzjahr extrapoliert. " +
      "Bekanntes Ist plus geschätzter Rest ergeben die automatische Prognose."
    );
  }

  if (projected !== null && remainder !== null) {
    return "Bekannte Ist-Daten werden mit einer konservativen Schätzung des verbleibenden Jahresverlaufs kombiniert.";
  }

  return null;
}

export type ProjectionAccountExplainabilityDetailViewModel =
  ProjectionAccountExplainabilityViewModel & {
    narrative: string | null;
    headlineQuestion: string | null;
    insufficientExplanation: string | null;
  };

export function buildProjectionAccountExplainabilityDetail(
  calculation: ProjectionAccountCalculationResult,
  input: {
    actualsThroughDate: string;
    historicalFinanceYearNames: readonly string[];
  },
): ProjectionAccountExplainabilityDetailViewModel {
  const base = {
    methodologyLabel: projectionMethodologyLabel(calculation.methodologyFamily),
    dataSufficiencyLabel: projectionDataSufficiencyLabel(calculation.dataSufficiency),
    confidenceLabel: projectionConfidenceLabel(calculation.confidenceLevel),
    knownActualAmountMinor: calculation.knownActualAmountMinor,
    estimatedRemainingAmountMinor: calculation.estimatedRemainingAmountMinor,
    projectedAmountMinor: calculation.projectedAmountMinor,
    lowerBoundMinor: calculation.lowerBoundMinor,
    upperBoundMinor: calculation.upperBoundMinor,
    actualsThroughDate: input.actualsThroughDate,
    historicalFinanceYearNames: input.historicalFinanceYearNames,
    historicalFinanceYearCount: input.historicalFinanceYearNames.length,
  };

  const narrative = buildProjectionExplainabilityNarrative(calculation, input);
  const insufficientExplanation =
    calculation.projectedAmountMinor === null
      ? projectionInsufficientDataExplanation(calculation.sufficiencyReasons)
      : null;

  return {
    ...base,
    narrative,
    insufficientExplanation,
    headlineQuestion:
      calculation.projectedAmountMinor !== null
        ? "Wie wurde diese automatische Prognose berechnet?"
        : insufficientExplanation,
  };
}

export function explainabilityFromMethodologyFamily(
  family: ProjectionMethodologyFamily,
): boolean {
  return family === "HISTORICAL_PATTERN" || family === "RUN_RATE";
}
