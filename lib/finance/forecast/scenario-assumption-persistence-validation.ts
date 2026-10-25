import type { FinanceScenarioAssumptionKind } from "@prisma/client";
import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { applyScenarioAssumptionV1 } from "@/lib/finance/forecast/scenario-assumption-calculation";
import { isEffectiveDatedAssumptionKindSupported } from "@/lib/finance/forecast/effective-dated-scenario-architecture-contract";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { SCENARIO_ASSUMPTION_KINDS_V1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type ScenarioAssumptionPayloadInput = {
  kind: ScenarioAssumptionKindV1;
  percentBasisPoints?: number | null;
  amountMinorDelta?: number | null;
  absoluteAmountMinor?: number | null;
  note?: string | null;
  /** ISO business date (YYYY-MM-DD). Omitted/null = full-year FIN-04D semantics. */
  effectiveFromDateIso?: string | null;
};

export type ValidatedScenarioAssumptionPayload = {
  kind: FinanceScenarioAssumptionKind;
  percentBasisPoints: number | null;
  amountMinorDelta: number | null;
  absoluteAmountMinor: number | null;
  note: string | null;
  effectiveFromDate: Date | null;
};

function isAssumptionKindV1(value: string): value is ScenarioAssumptionKindV1 {
  return (SCENARIO_ASSUMPTION_KINDS_V1 as readonly string[]).includes(value);
}

export function validateScenarioAssumptionPayload(
  input: ScenarioAssumptionPayloadInput,
): ValidatedScenarioAssumptionPayload {
  if (!isAssumptionKindV1(input.kind)) {
    throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
  }

  const note =
    input.note == null || input.note.trim().length === 0 ? null : input.note.trim();

  let effectiveFromDate: Date | null = null;
  if (input.effectiveFromDateIso != null && input.effectiveFromDateIso.trim().length > 0) {
    effectiveFromDate = parseFinanceCalendarDateIso(input.effectiveFromDateIso.trim());
    if (!isEffectiveDatedAssumptionKindSupported(input.kind)) {
      throw new Error("FINANCE_SCENARIO_EFFECTIVE_DATE_UNSUPPORTED_ASSUMPTION");
    }
  }

  const percentBasisPoints =
    input.percentBasisPoints === null || input.percentBasisPoints === undefined
      ? null
      : input.percentBasisPoints;
  const amountMinorDelta =
    input.amountMinorDelta === null || input.amountMinorDelta === undefined
      ? null
      : input.amountMinorDelta;
  const absoluteAmountMinor =
    input.absoluteAmountMinor === null || input.absoluteAmountMinor === undefined
      ? null
      : input.absoluteAmountMinor;

  const numericFields = [
    percentBasisPoints !== null,
    amountMinorDelta !== null,
    absoluteAmountMinor !== null,
  ].filter(Boolean).length;

  if (input.kind === "EXCLUDE_ACCOUNT") {
    if (numericFields > 0) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    return {
      kind: input.kind,
      percentBasisPoints: null,
      amountMinorDelta: null,
      absoluteAmountMinor: null,
      note,
      effectiveFromDate,
    };
  }

  if (input.kind === "PERCENT_CHANGE") {
    if (percentBasisPoints === null || amountMinorDelta !== null || absoluteAmountMinor !== null) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    if (!Number.isSafeInteger(percentBasisPoints)) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    return {
      kind: input.kind,
      percentBasisPoints,
      amountMinorDelta: null,
      absoluteAmountMinor: null,
      note,
      effectiveFromDate,
    };
  }

  if (input.kind === "DELTA_AMOUNT") {
    if (amountMinorDelta === null || percentBasisPoints !== null || absoluteAmountMinor !== null) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    assertSafeAmountMinor(amountMinorDelta);
    return {
      kind: input.kind,
      percentBasisPoints: null,
      amountMinorDelta,
      absoluteAmountMinor: null,
      note,
      effectiveFromDate,
    };
  }

  if (input.kind === "ABSOLUTE_AMOUNT") {
    if (absoluteAmountMinor === null || percentBasisPoints !== null || amountMinorDelta !== null) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    assertSafeAmountMinor(absoluteAmountMinor);
    return {
      kind: input.kind,
      percentBasisPoints: null,
      amountMinorDelta: null,
      absoluteAmountMinor,
      note,
      effectiveFromDate,
    };
  }

  throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
}

/** Validates stored intent can be interpreted against frozen baseline (FIN-04D-01 semantics). */
export function assertScenarioAssumptionAppliesToBaseline(
  baselineAmountMinor: number | null,
  payload: ValidatedScenarioAssumptionPayload,
): void {
  if (payload.effectiveFromDate) {
    if (baselineAmountMinor === null) {
      throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
    }
    return;
  }
  const applyInput = {
    baselineAmountMinor,
    kind: payload.kind as ScenarioAssumptionKindV1,
    percentBasisPoints: payload.percentBasisPoints ?? undefined,
    amountMinorDelta: payload.amountMinorDelta ?? undefined,
    absoluteAmountMinor: payload.absoluteAmountMinor ?? undefined,
  };
  const result = applyScenarioAssumptionV1(applyInput);
  if (result.rejectedReason) {
    throw new Error("FINANCE_SCENARIO_INVALID_ASSUMPTION");
  }
}
