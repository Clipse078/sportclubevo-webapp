import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { SCENARIO_ASSUMPTION_RULES_V1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  budgetDraftInputFromMinor,
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";

export type ScenarioAssumptionUiKind =
  | "PERCENT_CHANGE"
  | "DELTA_AMOUNT"
  | "ABSOLUTE_AMOUNT"
  | "EXCLUDE_ACCOUNT";

export function scenarioAssumptionUiKindFromCanonical(
  kind: ScenarioAssumptionKindV1,
): ScenarioAssumptionUiKind {
  return kind;
}

/** Deterministic basis points → display percent (e.g. -1000 → "-10"). */
export function formatScenarioPercentFromBasisPoints(percentBasisPoints: number): string {
  const scale = SCENARIO_ASSUMPTION_RULES_V1.percentBasisPointsScale;
  const rational = percentBasisPoints / (scale / 100);
  if (Number.isInteger(rational)) {
    return String(rational);
  }
  const rounded = Math.round(rational * 100) / 100;
  return String(rounded);
}

/** Parse human percent input to integer basis points (half away from zero at 0.01% granularity). */
export function parseScenarioPercentInputToBasisPoints(input: string): number | null {
  const trimmed = input.trim().replace(",", ".");
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const percent = Number(trimmed);
  if (!Number.isFinite(percent)) {
    return null;
  }
  const scale = SCENARIO_ASSUMPTION_RULES_V1.percentBasisPointsScale;
  const basisPoints = Math.round((percent * scale) / 100);
  if (!Number.isSafeInteger(basisPoints)) {
    return null;
  }
  return basisPoints;
}

export function formatScenarioAssumptionChangeLabel(input: {
  kind: ScenarioAssumptionKindV1;
  percentBasisPoints: number | null;
  amountMinorDelta: number | null;
  absoluteAmountMinor: number | null;
  currency: string | null;
  formattingLocale: string;
  labels: {
    exclude: string;
    percentSuffix: string;
  };
}): string {
  switch (input.kind) {
    case "EXCLUDE_ACCOUNT":
      return input.labels.exclude;
    case "PERCENT_CHANGE": {
      if (input.percentBasisPoints === null) {
        return "—";
      }
      const pct = formatScenarioPercentFromBasisPoints(input.percentBasisPoints);
      const signed = pct.startsWith("-") ? pct : `+${pct}`;
      return `${signed}${input.labels.percentSuffix}`;
    }
    case "DELTA_AMOUNT": {
      if (input.amountMinorDelta === null) {
        return "—";
      }
      return formatFinanceManagementPlanningSignedMinor(
        input.amountMinorDelta,
        input.currency,
        input.formattingLocale,
      );
    }
    case "ABSOLUTE_AMOUNT": {
      if (input.absoluteAmountMinor === null) {
        return "—";
      }
      return formatFinanceManagementPlanningMinor(
        input.absoluteAmountMinor,
        input.currency,
        input.formattingLocale,
      );
    }
    default:
      return "—";
  }
}

export function scenarioAssumptionAmountDraftFromMinor(amountMinor: number): string {
  return budgetDraftInputFromMinor(amountMinor);
}

export function parseScenarioAssumptionAmountInputToMinor(input: string): number | null {
  const parsed = parseBudgetInputToMinor(input);
  if (parsed === null) {
    return null;
  }
  return parsed;
}
