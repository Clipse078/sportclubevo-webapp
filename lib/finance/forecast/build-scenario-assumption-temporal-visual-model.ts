/**
 * FIN-04E-07 — compact scenario effective-date visual model (no synthetic events).
 */

import type { FinanceScenarioAssumptionTemporalReadModel } from "@/lib/finance/forecast/merge-effective-dated-scenario-calculation";

export type ScenarioAssumptionTemporalVisualSegment = {
  key: "BEFORE" | "AFTER" | "AMBIGUOUS" | "UNSCHEDULED";
  amountMinor: number;
};

export type ScenarioAssumptionTemporalVisualModel = {
  assumptionId: string;
  financialAccountId: string;
  effectiveFromDateIso: string;
  segments: ScenarioAssumptionTemporalVisualSegment[];
  knownScenarioImpactMinor: number;
  undeterminedBaseAmountMinor: number;
  /** Sum of timed base evidence only — not annual forecast. */
  eligibleTimedBaseAmountMinor: number;
  unaffectedTimedBaseAmountMinor: number;
  ambiguousBaseAmountMinor: number;
  unscheduledBaseAmountMinor: number;
};

export function buildScenarioAssumptionTemporalVisualModel(input: {
  assumptionId: string;
  financialAccountId: string;
  effectiveFromDateIso: string;
  temporal: FinanceScenarioAssumptionTemporalReadModel;
}): ScenarioAssumptionTemporalVisualModel {
  const { temporal } = input;
  return {
    assumptionId: input.assumptionId,
    financialAccountId: input.financialAccountId,
    effectiveFromDateIso: input.effectiveFromDateIso,
    segments: [
      { key: "BEFORE", amountMinor: temporal.unaffectedTimedBaseAmountMinor },
      { key: "AFTER", amountMinor: temporal.eligibleTimedBaseAmountMinor },
      { key: "AMBIGUOUS", amountMinor: temporal.ambiguousBaseAmountMinor },
      { key: "UNSCHEDULED", amountMinor: temporal.unscheduledBaseAmountMinor },
    ],
    knownScenarioImpactMinor: temporal.knownScenarioImpactMinor,
    undeterminedBaseAmountMinor: temporal.undeterminedBaseAmountMinor,
    eligibleTimedBaseAmountMinor: temporal.eligibleTimedBaseAmountMinor,
    unaffectedTimedBaseAmountMinor: temporal.unaffectedTimedBaseAmountMinor,
    ambiguousBaseAmountMinor: temporal.ambiguousBaseAmountMinor,
    unscheduledBaseAmountMinor: temporal.unscheduledBaseAmountMinor,
  };
}
