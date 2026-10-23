import type {
  ProjectionConfidenceLevel,
  ProjectionDataSufficiencyLevel,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";
import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import { minConfidenceLevel } from "@/lib/finance/projection/projection-confidence";

export function rollupVersionDataSufficiency(
  results: readonly ProjectionAccountCalculationResult[],
): ProjectionDataSufficiencyLevel {
  if (results.length === 0) return "INSUFFICIENT";
  const levels = new Set(results.map((r) => r.dataSufficiency));
  if (levels.size === 1) return [...levels][0]!;
  if (levels.has("SUFFICIENT") || levels.has("LIMITED")) return "LIMITED";
  return "INSUFFICIENT";
}

export function rollupVersionMethodologyFamily(
  results: readonly ProjectionAccountCalculationResult[],
): ProjectionMethodologyFamily {
  const families = new Set(results.map((r) => r.methodologyFamily));
  if (families.size === 0) return "NONE";
  if (families.size === 1) return [...families][0]!;
  return "MIXED";
}

export function rollupVersionConfidence(
  results: readonly ProjectionAccountCalculationResult[],
): ProjectionConfidenceLevel {
  return minConfidenceLevel(results.map((r) => r.confidenceLevel));
}
