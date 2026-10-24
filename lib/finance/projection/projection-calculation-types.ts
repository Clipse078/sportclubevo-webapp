import type {
  ProjectionConfidenceLevel,
  ProjectionDataSufficiencyLevel,
  ProjectionDataSufficiencyReason,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";

export type ProjectionAccountCalculationResult = {
  financialAccountId: string;
  projectedAmountMinor: number | null;
  knownActualAmountMinor: number;
  estimatedRemainingAmountMinor: number | null;
  methodologyFamily: ProjectionMethodologyFamily;
  dataSufficiency: ProjectionDataSufficiencyLevel;
  sufficiencyReasons: readonly ProjectionDataSufficiencyReason[];
  confidenceLevel: ProjectionConfidenceLevel;
  confidenceRationaleCodes: readonly string[];
  lowerBoundMinor: number | null;
  upperBoundMinor: number | null;
  reasonCodes: readonly string[];
  materialInfluences: readonly { code: string; weight: number | null }[];
  historicalFinanceYearIdsUsed: readonly string[];
  completedCurrentPeriodCount: number;
};
