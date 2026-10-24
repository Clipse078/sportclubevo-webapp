import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { roundRationalToMinor } from "@/lib/finance/projection/projection-integer-math";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { SCENARIO_ASSUMPTION_RULES_V1 } from "@/lib/finance/forecast/scenario-architecture-contract";

export type ScenarioAssumptionApplyInput = {
  baselineAmountMinor: number | null;
  kind: ScenarioAssumptionKindV1;
  /** Percent change in basis points (e.g. -1000 = −10.00%). */
  percentBasisPoints?: number;
  /** Signed delta in minor units. */
  amountMinorDelta?: number;
  /** Target absolute amount in minor units. */
  absoluteAmountMinor?: number;
};

export type ScenarioAssumptionApplyResult = {
  scenarioAmountMinor: number | null;
  rejectedReason: string | null;
};

/**
 * Pure v1 assumption application — authoritative rules for FIN-04D-03 engine tests.
 */
export function applyScenarioAssumptionV1(
  input: ScenarioAssumptionApplyInput,
): ScenarioAssumptionApplyResult {
  const { baselineAmountMinor, kind } = input;

  if (kind === "EXCLUDE_ACCOUNT") {
    return { scenarioAmountMinor: 0, rejectedReason: null };
  }

  if (kind === "ABSOLUTE_AMOUNT") {
    if (input.absoluteAmountMinor === undefined) {
      return { scenarioAmountMinor: null, rejectedReason: "ABSOLUTE_AMOUNT_REQUIRES_VALUE" };
    }
    assertSafeAmountMinor(input.absoluteAmountMinor);
    return { scenarioAmountMinor: input.absoluteAmountMinor, rejectedReason: null };
  }

  if (kind === "DELTA_AMOUNT") {
    if (input.amountMinorDelta === undefined) {
      return { scenarioAmountMinor: null, rejectedReason: "DELTA_AMOUNT_REQUIRES_VALUE" };
    }
    assertSafeAmountMinor(input.amountMinorDelta);
    if (baselineAmountMinor === null) {
      return { scenarioAmountMinor: null, rejectedReason: "DELTA_REQUIRES_BASELINE" };
    }
    assertSafeAmountMinor(baselineAmountMinor);
    const next = baselineAmountMinor + input.amountMinorDelta;
    assertSafeAmountMinor(next);
    return { scenarioAmountMinor: next, rejectedReason: null };
  }

  if (kind === "PERCENT_CHANGE") {
    if (input.percentBasisPoints === undefined) {
      return { scenarioAmountMinor: null, rejectedReason: "PERCENT_CHANGE_REQUIRES_BASIS_POINTS" };
    }
    if (!Number.isSafeInteger(input.percentBasisPoints)) {
      return { scenarioAmountMinor: null, rejectedReason: "PERCENT_BASIS_POINTS_INVALID" };
    }
    if (baselineAmountMinor === null) {
      return { scenarioAmountMinor: null, rejectedReason: "PERCENT_REQUIRES_BASELINE" };
    }
    assertSafeAmountMinor(baselineAmountMinor);
    const scale = SCENARIO_ASSUMPTION_RULES_V1.percentBasisPointsScale;
    const scenarioAmountMinor = roundRationalToMinor(
      BigInt(baselineAmountMinor) * BigInt(scale + input.percentBasisPoints),
      BigInt(scale),
    );
    return { scenarioAmountMinor, rejectedReason: null };
  }

  return { scenarioAmountMinor: null, rejectedReason: "UNKNOWN_ASSUMPTION_KIND" };
}
