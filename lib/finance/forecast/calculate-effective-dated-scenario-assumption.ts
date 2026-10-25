/**
 * FIN-04E-06 — pure effective-dated scenario assumption against expected-event timing evidence.
 */

import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { roundRationalToMinor } from "@/lib/finance/projection/projection-integer-math";
import { classifyExpectedEventEffectiveDateApplicability } from "@/lib/finance/forecast/classify-expected-event-effective-date-applicability";
import { classifyExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { SCENARIO_ASSUMPTION_RULES_V1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { applyScenarioAssumptionV1 } from "@/lib/finance/forecast/scenario-assumption-calculation";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";
import { reconcileExpectedFinancialTiming } from "@/lib/finance/forecast/reconcile-expected-financial-timing";
import type { ScenarioTemporalCoverageState } from "@/lib/finance/forecast/effective-dated-scenario-architecture-contract";

export type EffectiveDatedScenarioAssumptionInput = {
  kind: ScenarioAssumptionKindV1;
  percentBasisPoints?: number | null;
  effectiveFromDateIso: string;
  baselineAmountMinor: number;
  actualsThroughDateIso: string;
  actualThroughCutoffMinor: number;
  expectedEvents: ReadonlyArray<ExpectedFinancialEventForReconciliation>;
};

export type EffectiveDatedScenarioAssumptionResult = {
  effectiveFromDateIso: string;
  temporalCoverageState: ScenarioTemporalCoverageState;
  eligibleTimedBaseAmountMinor: number;
  unaffectedTimedBaseAmountMinor: number;
  ambiguousBaseAmountMinor: number;
  unscheduledBaseAmountMinor: number;
  knownScenarioImpactMinor: number;
  undeterminedBaseAmountMinor: number;
  adoptionEligible: boolean;
  annualScenarioAmountMinor: number;
  annualDeltaMinor: number;
};

function addMinor(total: number, delta: number): number {
  assertSafeAmountMinor(delta);
  const next = total + delta;
  if (!Number.isSafeInteger(next)) {
    throw new Error("FINANCE_AMOUNT_OVERFLOW");
  }
  return next;
}

function resolveCoverageState(input: {
  remainingFutureExpectationMinor: number;
  unscheduledBaseAmountMinor: number;
  ambiguousBaseAmountMinor: number;
  timedFutureExpectationMinor: number;
}): ScenarioTemporalCoverageState {
  if (input.ambiguousBaseAmountMinor > 0) {
    return "AMBIGUOUS";
  }
  if (
    input.remainingFutureExpectationMinor > 0 &&
    input.timedFutureExpectationMinor === 0
  ) {
    return "NO_TIMING_EVIDENCE";
  }
  if (input.unscheduledBaseAmountMinor > 0) {
    return "PARTIAL";
  }
  return "COMPLETE";
}

function impactForEligibleEvent(
  kind: ScenarioAssumptionKindV1,
  eventAmountMinor: number,
  percentBasisPoints: number | null | undefined,
): number {
  if (kind === "EXCLUDE_ACCOUNT") {
    return -eventAmountMinor;
  }
  if (kind === "PERCENT_CHANGE") {
    const applied = applyScenarioAssumptionV1({
      baselineAmountMinor: eventAmountMinor,
      kind: "PERCENT_CHANGE",
      percentBasisPoints: percentBasisPoints ?? undefined,
    });
    if (applied.rejectedReason || applied.scenarioAmountMinor === null) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    return applied.scenarioAmountMinor - eventAmountMinor;
  }
  throw new Error("FINANCE_SCENARIO_EFFECTIVE_DATE_UNSUPPORTED_ASSUMPTION");
}

export function calculateEffectiveDatedScenarioAssumption(
  input: EffectiveDatedScenarioAssumptionInput,
): EffectiveDatedScenarioAssumptionResult {
  assertSafeAmountMinor(input.baselineAmountMinor);
  assertSafeAmountMinor(input.actualThroughCutoffMinor);

  const reconciliation = reconcileExpectedFinancialTiming({
    annualForecastAmountMinor: input.baselineAmountMinor,
    actualThroughCutoffMinor: input.actualThroughCutoffMinor,
    actualsThroughDateIso: input.actualsThroughDateIso,
    expectedEvents: input.expectedEvents,
  });

  let eligibleTimedBaseAmountMinor = 0;
  let unaffectedTimedBaseAmountMinor = 0;
  let ambiguousBaseAmountMinor = 0;
  let knownScenarioImpactMinor = 0;

  for (const event of input.expectedEvents) {
    assertSafeAmountMinor(event.expectedAmountMinor);
    const position = classifyExpectedEventTemporalPosition(
      input.actualsThroughDateIso,
      event,
    );
    if (position === "NOT_FUTURE") {
      continue;
    }
    if (position === "AMBIGUOUS_AT_CUTOFF") {
      ambiguousBaseAmountMinor = addMinor(
        ambiguousBaseAmountMinor,
        event.expectedAmountMinor,
      );
      continue;
    }

    const applicability = classifyExpectedEventEffectiveDateApplicability(
      input.effectiveFromDateIso,
      event,
    );
    if (applicability === "BEFORE_EFFECTIVE_DATE") {
      unaffectedTimedBaseAmountMinor = addMinor(
        unaffectedTimedBaseAmountMinor,
        event.expectedAmountMinor,
      );
      continue;
    }
    if (applicability === "AMBIGUOUS_AT_EFFECTIVE_DATE") {
      ambiguousBaseAmountMinor = addMinor(
        ambiguousBaseAmountMinor,
        event.expectedAmountMinor,
      );
      continue;
    }

    eligibleTimedBaseAmountMinor = addMinor(
      eligibleTimedBaseAmountMinor,
      event.expectedAmountMinor,
    );
    knownScenarioImpactMinor = addMinor(
      knownScenarioImpactMinor,
      impactForEligibleEvent(
        input.kind,
        event.expectedAmountMinor,
        input.percentBasisPoints,
      ),
    );
  }

  const unscheduledBaseAmountMinor = reconciliation.unscheduledRemainderMinor ?? 0;
  const undeterminedBaseAmountMinor = addMinor(
    addMinor(unscheduledBaseAmountMinor, ambiguousBaseAmountMinor),
    0,
  );

  const temporalCoverageState = resolveCoverageState({
    remainingFutureExpectationMinor: reconciliation.remainingFutureExpectationMinor ?? 0,
    unscheduledBaseAmountMinor,
    ambiguousBaseAmountMinor,
    timedFutureExpectationMinor: reconciliation.timedFutureExpectationMinor,
  });

  const adoptionEligible = temporalCoverageState === "COMPLETE";

  let annualScenarioAmountMinor = input.baselineAmountMinor;
  let annualDeltaMinor = 0;
  if (adoptionEligible) {
    annualScenarioAmountMinor = addMinor(
      input.baselineAmountMinor,
      knownScenarioImpactMinor,
    );
    annualDeltaMinor = knownScenarioImpactMinor;
  }

  return {
    effectiveFromDateIso: input.effectiveFromDateIso,
    temporalCoverageState,
    eligibleTimedBaseAmountMinor,
    unaffectedTimedBaseAmountMinor,
    ambiguousBaseAmountMinor,
    unscheduledBaseAmountMinor,
    knownScenarioImpactMinor,
    undeterminedBaseAmountMinor,
    adoptionEligible,
    annualScenarioAmountMinor,
    annualDeltaMinor,
  };
}

/** Percent impact on a single eligible timed amount (deterministic minor-unit math). */
export function knownPercentImpactOnEligibleTimedAmountMinor(
  eligibleAmountMinor: number,
  percentBasisPoints: number,
): number {
  const scale = SCENARIO_ASSUMPTION_RULES_V1.percentBasisPointsScale;
  return roundRationalToMinor(
    BigInt(eligibleAmountMinor) * BigInt(percentBasisPoints),
    BigInt(scale),
  );
}
