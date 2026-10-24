import type {
  ProjectionConfidenceLevel,
  ProjectionDataSufficiencyLevel,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";
import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import type { ProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-types";
import { computeProjectionForecastDeltaMinor } from "@/lib/finance/projection/projection-workspace-comparison";
import {
  computeProjectionAggregateCoverage,
  type ProjectionAggregateCoverage,
  type ProjectionCoverageAccountInput,
} from "@/lib/finance/projection/projection-workspace-coverage";

export type ProjectionWorkspacePresentationState =
  | "NO_PROJECTION"
  | "AVAILABLE_FRESH"
  | "AVAILABLE_STALE"
  | "PARTIAL_COVERAGE"
  | "INSUFFICIENT"
  | "GENERATION_FAILED";

export const PROJECTION_CONFIDENCE_PRODUCT_TERM = "Prognosesicherheit" as const;

export function projectionMethodologyLabel(
  methodology: ProjectionMethodologyFamily,
): string | null {
  switch (methodology) {
    case "HISTORICAL_PATTERN":
      return "Historischer Verlauf";
    case "RUN_RATE":
      return "Aktueller Verlauf";
    case "NONE":
    case "MIXED":
    case "BASELINE_REFERENCE":
    case "SEASONAL_PATTERN":
    case "DRIVER_BASED":
    case "STATISTICAL":
    case "ENSEMBLE":
      return methodology === "MIXED" ? null : null;
    default:
      return null;
  }
}

export function projectionDataSufficiencyLabel(
  level: ProjectionDataSufficiencyLevel,
): string {
  switch (level) {
    case "SUFFICIENT":
      return "Gute Datengrundlage";
    case "LIMITED":
      return "Begrenzte Datengrundlage";
    case "INSUFFICIENT":
      return "Nicht genügend Daten";
    default:
      return "Nicht genügend Daten";
  }
}

export function projectionConfidenceLabel(level: ProjectionConfidenceLevel): string | null {
  switch (level) {
    case "HIGH":
      return "Hohe Prognosesicherheit";
    case "MEDIUM":
      return "Mittlere Prognosesicherheit";
    case "LOW":
      return "Geringe Prognosesicherheit";
    case "NONE":
      return null;
    default:
      return null;
  }
}

export function projectionAccountNoAmountLabel(
  dataSufficiency: ProjectionDataSufficiencyLevel,
): string {
  if (dataSufficiency === "INSUFFICIENT") {
    return "Nicht genügend Daten";
  }
  return "Keine verlässliche Projektion";
}

export type ProjectionAccountExplainabilityViewModel = {
  methodologyLabel: string | null;
  dataSufficiencyLabel: string;
  confidenceLabel: string | null;
  knownActualAmountMinor: number;
  estimatedRemainingAmountMinor: number | null;
  projectedAmountMinor: number | null;
  lowerBoundMinor: number | null;
  upperBoundMinor: number | null;
  actualsThroughDate: string;
  historicalFinanceYearNames: readonly string[];
  historicalFinanceYearCount: number;
};

export function buildProjectionAccountExplainability(
  calculation: ProjectionAccountCalculationResult,
  input: {
    actualsThroughDate: string;
    historicalFinanceYearNames: readonly string[];
  },
): ProjectionAccountExplainabilityViewModel {
  return {
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
}

export type ProjectionWorkspaceAccountViewModel = {
  accountId: string;
  projectedAmountMinor: number | null;
  forecastAmountMinor: number | null;
  deltaMinor: number | null;
  dataSufficiency: ProjectionDataSufficiencyLevel;
  dataSufficiencyLabel: string;
  confidence: ProjectionConfidenceLevel;
  confidenceLabel: string | null;
  methodologyFamily: ProjectionMethodologyFamily;
  methodologyLabel: string | null;
  noProjectionLabel: string | null;
  explainability: ProjectionAccountExplainabilityViewModel | null;
};

export type ProjectionWorkspaceViewModel = {
  financeYearId: string;
  financeYearName: string;
  presentationState: ProjectionWorkspacePresentationState;
  staleness: ProjectionEvidenceStaleness | null;
  actualsThroughDate: string | null;
  generatedAtIso: string | null;
  versionNumber: number | null;
  coverage: ProjectionAggregateCoverage;
  versionDataSufficiency: ProjectionDataSufficiencyLevel | null;
  accounts: readonly ProjectionWorkspaceAccountViewModel[];
};

function derivePresentationState(input: {
  hasProjection: boolean;
  staleness: ProjectionEvidenceStaleness | null;
  coverage: ProjectionAggregateCoverage;
  versionDataSufficiency: ProjectionDataSufficiencyLevel | null;
}): ProjectionWorkspacePresentationState {
  if (!input.hasProjection) return "NO_PROJECTION";
  if (input.versionDataSufficiency === "INSUFFICIENT" && input.coverage.projectedAccountCount === 0) {
    return "INSUFFICIENT";
  }
  if (input.coverage.coverageStatus === "PARTIAL") return "PARTIAL_COVERAGE";
  if (input.staleness === "STALE") return "AVAILABLE_STALE";
  return "AVAILABLE_FRESH";
}

export function buildProjectionWorkspaceViewModel(input: {
  financeYearId: string;
  financeYearName: string;
  version: {
    versionNumber: number;
    actualsThroughDate: string;
    generatedAt: Date;
    dataSufficiency: ProjectionDataSufficiencyLevel;
    evidenceFingerprint: string | null;
  } | null;
  staleness: ProjectionEvidenceStaleness | null;
  lines: ReadonlyArray<{
    financialAccountId: string;
    projectedAmountMinor: number | null;
    lowerBoundMinor: number | null;
    upperBoundMinor: number | null;
    methodologyFamily: ProjectionMethodologyFamily;
    dataSufficiency: ProjectionDataSufficiencyLevel;
    confidence: ProjectionConfidenceLevel;
  }>;
  forecastAmountByAccountId: ReadonlyMap<string, number | null>;
  coverageAccounts: readonly ProjectionCoverageAccountInput[];
  explainabilityByAccountId: ReadonlyMap<string, ProjectionAccountExplainabilityViewModel>;
}): ProjectionWorkspaceViewModel {
  const lineByAccount = new Map(input.lines.map((line) => [line.financialAccountId, line]));
  const accountById = new Map<string, ProjectionWorkspaceAccountViewModel>();

  for (const account of input.coverageAccounts) {
    const line = lineByAccount.get(account.accountId);
    const projectedAmountMinor = line?.projectedAmountMinor ?? account.projectedAmountMinor ?? null;
    const forecastAmountMinor = input.forecastAmountByAccountId.get(account.accountId) ?? null;
    const dataSufficiency = line?.dataSufficiency ?? "INSUFFICIENT";
    const confidence = line?.confidence ?? "NONE";
    const methodologyFamily = line?.methodologyFamily ?? "NONE";
    accountById.set(account.accountId, {
      accountId: account.accountId,
      projectedAmountMinor,
      forecastAmountMinor,
      deltaMinor: computeProjectionForecastDeltaMinor(projectedAmountMinor, forecastAmountMinor),
      dataSufficiency,
      dataSufficiencyLabel: projectionDataSufficiencyLabel(dataSufficiency),
      confidence,
      confidenceLabel: projectionConfidenceLabel(confidence),
      methodologyFamily,
      methodologyLabel: projectionMethodologyLabel(methodologyFamily),
      noProjectionLabel:
        projectedAmountMinor === null ? projectionAccountNoAmountLabel(dataSufficiency) : null,
      explainability: input.explainabilityByAccountId.get(account.accountId) ?? null,
    });
  }

  const coverage = computeProjectionAggregateCoverage(
    input.coverageAccounts.map((row) => ({
      ...row,
      projectedAmountMinor:
        accountById.get(row.accountId)?.projectedAmountMinor ?? row.projectedAmountMinor,
    })),
  );

  const hasProjection = Boolean(input.version);
  const presentationState = derivePresentationState({
    hasProjection,
    staleness: input.staleness,
    coverage,
    versionDataSufficiency: input.version?.dataSufficiency ?? null,
  });

  return {
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    presentationState,
    staleness: input.staleness,
    actualsThroughDate: input.version?.actualsThroughDate ?? null,
    generatedAtIso: input.version ? input.version.generatedAt.toISOString() : null,
    versionNumber: input.version?.versionNumber ?? null,
    coverage,
    versionDataSufficiency: input.version?.dataSufficiency ?? null,
    accounts: [...accountById.values()],
  };
}

/** Format ISO calendar date for tenant locale display (UTC date part). */
export function formatProjectionSourceCutoffDate(isoDate: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
