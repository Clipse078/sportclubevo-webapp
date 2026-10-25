/**
 * FIN-04E-06 — effective-dated scenario assumptions (architecture locks & support matrix).
 */

import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";

export const EFFECTIVE_DATED_SCENARIO_ARCHITECTURE_LOCKS = {
  effectiveDateIsOptional: true,
  nullEffectiveDatePreserves04dSemantics: true,
  effectiveDateDoesNotMutateActual: true,
  effectiveDateDoesNotMutateExpectedEvents: true,
  temporalScenarioUsesExpectedEventEvidence: true,
  unscheduledRemainderIsNotProrated: true,
  monthPrecisionIsNotExactDate: true,
  dateRangeIsNotProrated: true,
  ambiguousEffectiveDateRemainsAmbiguous: true,
  partialTemporalCoverageDoesNotFabricateTotal: true,
  temporalAdoptionRequiresDeterministicOutcome: true,
  noSyntheticEventsFromScenario: true,
  noSystemClock: true,
  noLiquidity: true,
  noFakeMonthlyPhasing: true,
  legacy04dScenariosRemainCompatible: true,
} as const;

export const SCENARIO_TEMPORAL_COVERAGE_STATES = [
  "COMPLETE",
  "PARTIAL",
  "AMBIGUOUS",
  "NO_TIMING_EVIDENCE",
] as const;

export type ScenarioTemporalCoverageState =
  (typeof SCENARIO_TEMPORAL_COVERAGE_STATES)[number];

export const EFFECTIVE_DATED_ASSUMPTION_SUPPORT = {
  PERCENT_CHANGE: "SUPPORTED",
  EXCLUDE_ACCOUNT: "SUPPORTED",
  DELTA_AMOUNT: "NOT_SUPPORTED",
  ABSOLUTE_AMOUNT: "NOT_SUPPORTED",
} as const satisfies Record<
  ScenarioAssumptionKindV1,
  "SUPPORTED" | "NOT_SUPPORTED"
>;

export function isEffectiveDatedAssumptionKindSupported(
  kind: ScenarioAssumptionKindV1,
): boolean {
  return EFFECTIVE_DATED_ASSUMPTION_SUPPORT[kind] === "SUPPORTED";
}

/** Persisted optional business date field on FinanceScenarioAssumption (FIN-04E-06). */
export const SCENARIO_ASSUMPTION_EFFECTIVE_FROM_FIELD = "effectiveFromDate" as const;
