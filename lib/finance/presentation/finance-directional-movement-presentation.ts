/**
 * FIN-04E-07R3 — signed presentation for expected financial movements.
 *
 * Stored event amounts remain non-negative magnitudes; direction is derived from
 * FinancialAccount semantics (INCOME | EXPENSE) at presentation time only.
 *
 * Net movement in the timing workspace is timedIncome − timedExpense.
 * It is NOT liquidity, cash balance, P&L, or annual forecast semantics.
 */

import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";

export type FinanceMovementDirection = "INCOME" | "EXPENSE";

export function financeMovementDirectionFromAccountType(
  accountType: "INCOME" | "EXPENSE",
): FinanceMovementDirection {
  return accountType;
}

export function assertFinanceMovementMagnitudeMinor(amountMinor: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("FINANCE_MOVEMENT_MAGNITUDE_MUST_BE_INTEGER_MINOR");
  }
  if (amountMinor < 0) {
    throw new Error("FINANCE_MOVEMENT_MAGNITUDE_MUST_BE_NON_NEGATIVE");
  }
}

/**
 * Gross timed/untimed coverage magnitude (sum of absolute movement magnitudes).
 * Distinct from signed net movement.
 */
export function deriveFinanceTimingGrossMovementMinor(
  incomeMagnitudeMinor: number,
  expenseMagnitudeMinor: number,
): number {
  return incomeMagnitudeMinor + expenseMagnitudeMinor;
}

/** Signed net of expected movements represented in a timing slice — not liquidity or P&L. */
export function deriveFinanceNetMovementMinor(
  incomeMagnitudeMinor: number,
  expenseMagnitudeMinor: number,
): number {
  return incomeMagnitudeMinor - expenseMagnitudeMinor;
}

export type FinanceTimingMovementComposition = {
  grossMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  netMovementMinor: number;
};

export function deriveFinanceTimingMovementComposition(input: {
  incomeMagnitudeMinor: number;
  expenseMagnitudeMinor: number;
}): FinanceTimingMovementComposition {
  return {
    grossMinor: deriveFinanceTimingGrossMovementMinor(
      input.incomeMagnitudeMinor,
      input.expenseMagnitudeMinor,
    ),
    incomeMinor: input.incomeMagnitudeMinor,
    expenseMinor: input.expenseMagnitudeMinor,
    netMovementMinor: deriveFinanceNetMovementMinor(
      input.incomeMagnitudeMinor,
      input.expenseMagnitudeMinor,
    ),
  };
}

export function formatFinanceDirectionalMovementMinor(input: {
  amountMinor: number;
  direction: FinanceMovementDirection;
  currency: string | null;
  formattingLocale: string;
}): string {
  assertFinanceMovementMagnitudeMinor(input.amountMinor);
  const magnitude = formatFinanceManagementPlanningMinor(
    input.amountMinor,
    input.currency,
    input.formattingLocale,
  );
  if (input.amountMinor === 0) {
    return magnitude;
  }
  return input.direction === "INCOME" ? `+${magnitude}` : `−${magnitude}`;
}

/** Signed net movement (may be negative) — uses explicit +/−/unsigned zero. */
export function formatFinanceNetMovementMinor(input: {
  netMovementMinor: number;
  currency: string | null;
  formattingLocale: string;
}): string {
  if (!Number.isInteger(input.netMovementMinor)) {
    throw new Error("FINANCE_NET_MOVEMENT_MUST_BE_INTEGER_MINOR");
  }
  if (input.netMovementMinor === 0) {
    return formatFinanceManagementPlanningMinor(0, input.currency, input.formattingLocale);
  }
  const magnitude = formatFinanceManagementPlanningMinor(
    Math.abs(input.netMovementMinor),
    input.currency,
    input.formattingLocale,
  );
  return input.netMovementMinor > 0 ? `+${magnitude}` : `−${magnitude}`;
}

export function formatFinanceDirectionalMovementDetailLine(input: {
  directionLabel: string;
  amountMinor: number;
  direction: FinanceMovementDirection;
  currency: string | null;
  formattingLocale: string;
}): string {
  const signed = formatFinanceDirectionalMovementMinor({
    amountMinor: input.amountMinor,
    direction: input.direction,
    currency: input.currency,
    formattingLocale: input.formattingLocale,
  });
  return `${input.directionLabel} · ${signed}`;
}
